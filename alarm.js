const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
// Use DATA_DIR environment variable if available, otherwise use default path
const dataDir = process.env.DATA_DIR || __dirname;
const ALARM_FILE_PATH = path.join(dataDir, 'alarms.json');

let alarms = {};
let sock; // Global reference for sock

const saveAlarms = () => {
    const plainAlarms = {};
    for (const user in alarms) {
        plainAlarms[user] = alarms[user].map(alarm => ({
            ...alarm,
            job: undefined,
            repeatJob: undefined
        }));
    }
    fs.writeFileSync(ALARM_FILE_PATH, JSON.stringify(plainAlarms, null, 2));
    console.log('Alarms saved to file.');
};

const loadAlarms = () => {
    if (fs.existsSync(ALARM_FILE_PATH)) {
        const data = fs.readFileSync(ALARM_FILE_PATH, 'utf8');
        const plainAlarms = JSON.parse(data);
        for (const user in plainAlarms) {
            alarms[user] = plainAlarms[user];
            for (const alarm of alarms[user]) {
                scheduleAlarm(user, alarm, true); // Schedule alarms without sock initially
            }
        }
        console.log('Alarms loaded from file.');
    }
};

const initializeSock = (newSock) => {
    sock = newSock;
    console.log('Sock initialized');
    // Load alarms after sock is initialized
    loadAlarms();
};

// Function to calculate the next trigger time for an alarm based on the provided dateTime and intervals (days, hours, minutes)
const calculateNextTrigger = (dateTime, days, hours, minutes) => {
    let nextTrigger = new Date(dateTime);
    const now = new Date();
    console.log(`Calculating next trigger. Initial dateTime: ${dateTime}, Now: ${now}`);
    
    // Adjust nextTrigger based on the specified intervals
    if (days) {
        // Calculate the next trigger date based on the specified days interval.
        // It will keep adding the days until the nextTrigger is greater than the current time.
        while (nextTrigger <= now) {
            nextTrigger.setDate(nextTrigger.getDate() + days);
        }
    } else if (hours) {
        // Calculate the next trigger time based on the specified hours interval.
        // It will keep adding the hours until the nextTrigger is greater than the current time.
        while (nextTrigger <= now) {
            nextTrigger.setHours(nextTrigger.getHours() + hours);
        }
    } else if (minutes) {
        // Calculate the next trigger time based on the specified minutes interval.
        // It will keep adding the minutes until the nextTrigger is greater than the current time.
        while (nextTrigger <= now) {
            nextTrigger.setMinutes(nextTrigger.getMinutes() + minutes);
        }
    }
    console.log(`Next trigger calculated: ${nextTrigger}`);
    return nextTrigger;
};

const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day},${hours}:${minutes}`;
};

const clearAlarms = async (sock, from) => {
    if (alarms[from]) {
        for (const alarm of alarms[from]) {
            if (alarm.job) {
                console.log(`Cancelling job for alarm: ${alarm.dateTime}`);
                alarm.job.cancel();
            }
            if (alarm.repeatJob) {
                console.log(`Cancelling repeatJob for alarm: ${alarm.dateTime}`);
                alarm.repeatJob.cancel();
            }
        }
        delete alarms[from];
        saveAlarms();
        await sock.sendMessage(from, { text: 'All alarms cleared.' });
        console.log(`All alarms cleared for user: ${from}`);
    } else {
        await sock.sendMessage(from, { text: 'No alarms to clear.' });
        console.log(`No alarms to clear for user: ${from}`);
    }

    // Check for any remaining scheduled jobs
    console.log('Checking for any remaining scheduled jobs...');
    const jobs = schedule.scheduledJobs;
    for (const jobName in jobs) {
        console.log(`Remaining job: ${jobName}`);
    }
};

const scheduleAlarm = (from, alarm, isLoading = false) => {
    const { dateTime, message, recurring, days, hours, minutes } = alarm;
    const alarmDate = new Date(dateTime.replace(',', 'T'));  // Convert to ISO 8601 format
    console.log(`Scheduling alarm for user: ${from}, DateTime: ${dateTime}, Recurring: ${recurring}, Days: ${days}, Hours: ${hours}, Minutes: ${minutes}`);

    if (isNaN(alarmDate.getTime())) {
        console.error(`Invalid alarm date: ${dateTime}`);
        return;
    }
    
    // Check if the alarm is recurring and if it needs to be updated based on loading state or if the alarm date has already passed
    if (recurring && (isLoading || alarmDate < new Date())) {
        // Calculate the next trigger time for the recurring alarm
        const nextTrigger = calculateNextTrigger(alarmDate, days, hours, minutes);
        // Validate the calculated next trigger
        if (isNaN(nextTrigger.getTime())) {
            console.error(`Failed to calculate valid next trigger for alarm: ${alarm}`);
            return;
        }
        // Convert nextTrigger to a string in the local format YYYY-MM-DD,HH:mm
        const newDateTime = formatLocalDateTime(nextTrigger);
        console.log(`Updating recurring alarm DateTime from ${dateTime} to ${newDateTime}`);
        alarm.dateTime = newDateTime; // Update the alarm's dateTime to the new calculated value
    }

    const [date, time] = alarm.dateTime.split(',');
    const [hour, minute] = time.split(':');
    let rule = new schedule.RecurrenceRule();

    if (recurring) {
        if (minutes !== null) {
            // Set the minute range to every specified minutes
            rule.minute = new schedule.Range(0, 59, minutes);
            console.log(`Setting recurrence rule for every ${minutes} minutes`);
        } else if (hours !== null) {
            rule.hour = new schedule.Range(0, 23, hours);
            rule.minute = 0;
            console.log(`Setting recurrence rule for every ${hours} hours`);
        } else if (days !== null) {
            rule.dayOfWeek = new schedule.Range(0, 6, days);
            rule.hour = parseInt(hour);
            rule.minute = parseInt(minute);
            console.log(`Setting recurrence rule for every ${days} days`);
        }
    } else {
        rule.hour = parseInt(hour);
        rule.minute = parseInt(minute);
        rule.date = new Date(date).getDate();
        console.log(`Setting one-time alarm rule for Date: ${date}, Hour: ${hour}, Minute: ${minute}`);
    }

    const job = schedule.scheduleJob(rule, createJobHandler(sock, from, message, alarm));

    alarm.job = job;
    console.log(`Alarm job scheduled for user: ${from}`);
    saveAlarms();
};

const createJobHandler = (sock, from, message, alarm) => {
    return async () => {
        console.log(`Alarm triggered for user: ${from}`);
        if (sock) {
            console.log(`sock is available, sending message to user: ${from}`);
            try {
                await sock.sendMessage(from, { text: message });
                console.log(`Message sent to user: ${from}`);
            } catch (error) {
                console.error(`Failed to send message to user: ${from}`, error);
            }
        } else {
            console.error(`sock is not available, cannot send message to user: ${from}`);
        }
        alarm.status = 'triggered';
        console.log(`Alarm status set to triggered for user: ${from}`);

        const repeatJob = schedule.scheduleJob({ minute: new schedule.Range(0, 59, 1) }, async () => {
            if (alarm.status === 'triggered' && sock) {
                console.log(`Repeating alarm message for user: ${from}`);
                try {
                    await sock.sendMessage(from, { text: message });
                    console.log(`Repeating message sent to user: ${from}`);
                } catch (error) {
                    console.error(`Failed to send repeating message to user: ${from}`, error);
                }
            } else {
                repeatJob.cancel();
                console.log(`Repeating alarm job cancelled for user: ${from}`);
            }
        });
        alarm.repeatJob = repeatJob;
    };
};

const parseAlarmCommand = (text) => {
    const parts = text.match(/(?:[^\s"]+|"[^"]*")+/g);  // Split command
    const command = parts[0];  // e.g., /alarm
    let dateTime = '';
    let message = '';
    let recurring = false;
    let days = null;
    let hours = null;
    let minutes = null;

    // Loop through parts to parse flags, date-time, and message
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === '/rec') {
            recurring = true;
        } else if (parts[i] === '/d') {
            if (i + 1 < parts.length && !isNaN(parts[i + 1])) {
                days = parseInt(parts[i + 1]);
                i++;  // Skip the number we just processed
            } else {
                return { error: 'Invalid days format. Please provide a valid number of days.' };
            }
        } else if (parts[i] === '/h') {
            if (i + 1 < parts.length && !isNaN(parts[i + 1])) {
                hours = parseInt(parts[i + 1]);
                i++;  // Skip the number we just processed
            } else {
                return { error: 'Invalid hours format. Please provide a valid number of hours.' };
            }
        } else if (parts[i] === '/m') {
            if (i + 1 < parts.length && !isNaN(parts[i + 1])) {
                minutes = parseInt(parts[i + 1]);
                i++;  // Skip the number we just processed
            } else {
                return { error: 'Invalid minutes format. Please provide a valid number of minutes.' };
            }
        } else if (!dateTime && parts[i].includes(',')) {
            dateTime = parts[i];  // Capture date and time (e.g., 2024-09-24,10:03)
        } else {
            message += parts[i] + ' ';  // Anything else is part of the message
        }
    }

    message = message.trim();  // Clean up any extra spaces

    // Validate that we have a valid dateTime
    if (!dateTime || !dateTime.includes(',')) {
        return { error: 'Invalid date and time format. Please use YYYY-MM-DD,HH:mm.' };
    }

    return { dateTime, message, recurring, days, hours, minutes };
};



// const handleAlarmMessage = async (sock, from, message) => {
//     const { dateTime, recurring, days, hours, minutes, error, message: alarmMessage } = parseAlarmCommand(message);
//     if (error) {
//         await sock.sendMessage(from, { text: error });
//         return;
//     }

//     if (!alarms[from]) {
//         alarms[from] = [];
//     }
    
//     alarms[from].push({ dateTime, recurring, days, hours, minutes, message: alarmMessage, status: 'ongoing' });
//     scheduleAlarm(from, alarms[from][alarms[from].length - 1]);  // Schedule the new alarm
//     saveAlarms();
    
//     await sock.sendMessage(from, { text: 'Alarm set successfully!' });
// };

let nextAlarmId = 1; // Initialize the counter globally

const handleAlarmMessage = async (sock, from, message) => {
    const { dateTime, recurring, days, hours, minutes, error, message: alarmMessage } = parseAlarmCommand(message);
    
    // Handle parsing errors
    if (error) {
        return { success: false, message: error };
    }

    // Initialize alarms for the user if they don't exist
    if (!alarms[from]) {
        alarms[from] = [];
    }

    // Check if an alarm with the same dateTime already exists
    const existingAlarm = alarms[from].find(alarm => alarm.dateTime === dateTime);
    
    if (existingAlarm) {
        // Replace the existing alarm message with the new alarm message
        existingAlarm.message = alarmMessage;
        saveAlarms();
        return { success: true, message: 'Alarm updated successfully.' };
    } else {
        // Create a new alarm if no same dateTime found
        const newAlarmId = nextAlarmId++; // Generate new ID

        // Create a new alarm object
        const newAlarm = { id: newAlarmId, dateTime, recurring, days, hours, minutes, message: alarmMessage, status: 'ongoing' };
        console.log('New Alarm:', newAlarm);
        alarms[from].push(newAlarm);

        // Schedule the new alarm
        scheduleAlarm(from, newAlarm);
        saveAlarms();

        return { success: true, message: `Alarm set successfully. Your alarm ID is: ${newAlarmId}` };
    }
};


const snoozeAlarm = async (sock, from) => {
    const userAlarms = alarms[from];
    if (userAlarms) {
        for (const alarm of userAlarms) {
            if (alarm.status === 'triggered') {
                const nextTrigger = alarm.recurring ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 3 * 60 * 60 * 1000);
                alarm.job.reschedule(nextTrigger);
                alarm.status = 'snoozed';
                if (alarm.repeatJob) {
                    alarm.repeatJob.cancel();
                }
                await sock.sendMessage(from, { text: alarm.recurring ? 'Recurring alarm snoozed until tomorrow.' : 'Non-recurring alarm snoozed for 3 hours.' });
                saveAlarms();
                return;
            }
        }
    }
    await sock.sendMessage(from, { text: 'No triggered alarm to snooze.' });
};

const acknowledgeAlarm = async (sock, from) => {
    const userAlarms = alarms[from];
    if (userAlarms) {
        for (const alarm of userAlarms) {
            if (alarm.status === 'triggered') {
                alarm.status = 'acknowledged';
                if (alarm.repeatJob) {
                    alarm.repeatJob.cancel();
                    alarm.repeatJob = null;
                }
                if (alarm.job) {
                    alarm.job.cancel();
                    alarm.job = null;
                }
                if (alarm.recurring) {
                    const nextTrigger = calculateNextTrigger(new Date(alarm.dateTime.replace(',', 'T')), alarm.days, alarm.hours, alarm.minutes);
                    alarm.dateTime = formatLocalDateTime(nextTrigger);
                    scheduleAlarm(from, alarm);
                }
                await sock.sendMessage(from, { text: 'Alarm acknowledged.' });
                saveAlarms();
                return;
            }
        }
    }
    await sock.sendMessage(from, { text: 'No triggered alarm to acknowledge.' });
};

const cancelRecurringAlarm = async (sock, from) => {
    const userAlarms = alarms[from];
    if (userAlarms) {
        for (let i = userAlarms.length - 1; i >= 0; i--) {
            const alarm = userAlarms[i];
            if (alarm.recurring) {
                if (alarm.job) alarm.job.cancel();
                if (alarm.repeatJob) alarm.repeatJob.cancel();
                userAlarms.splice(i, 1);
            }
        }
        saveAlarms();
        await sock.sendMessage(from, { text: 'Recurring alarms cancelled.' });
        return;
    }
    await sock.sendMessage(from, { text: 'No recurring alarms to cancel.' });
};

const listAlarms = async (sock, from) => {
    if (!alarms[from] || alarms[from].length === 0) {
        return { success: false, message: 'No alarms found.' }; // Return failure
    }

    // Sort alarms by dateTime for better user experience
    const sortedAlarms = alarms[from].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    let alarmList = 'Your alarms:\n';
    sortedAlarms.forEach(alarm => {
        let recurringDetails = alarm.recurring ? 'Yes' : 'No';
        if (alarm.recurring) {
            recurringDetails += ` (every ${alarm.minutes ? alarm.minutes + ' minutes' : alarm.hours ? alarm.hours + ' hours' : alarm.days + ' days'})`;
        }
        alarmList += `ID: ${alarm.id}, Time: ${alarm.dateTime}, Message: ${alarm.message}, Recurring: ${recurringDetails}\n`;
    });

    return { success: true, message: alarmList }; // Return success
};


// Example output:
// Your alarms:
// ID: 1, Time: 2024-09-24,10:00, Message: Morning Meeting, Recurring: Yes
// ID: 2, Time: 2024-09-25,08:00, Message: Daily Standup, Recurring: No


// const listAlarms = async (sock, from) => {
//     let response = 'Your alarms:\n';
//     if (alarms[from] && alarms[from].length > 0) {
//         for (const alarm of alarms[from]) {
//             response += `- Date and Time: ${alarm.dateTime}\n  Message: ${alarm.message}\n  Recurring: ${alarm.recurring ? 'Yes' : 'No'}\n  Days: ${alarm.days}\n  Hours: ${alarm.hours}\n  Minutes: ${alarm.minutes}\n  Status: ${alarm.status}\n`;
//         }
//     } else {
//         response += 'No alarms set.';
//     }
//     await sock.sendMessage(from, { text: response });
// };

// const handleAlarm = async (sock, from, message) => {
//     if (message.startsWith('/alarm /snooze')) {
//         await snoozeAlarm(sock, from);
//     } else if (message.startsWith('/alarm /ack')) {
//         await acknowledgeAlarm(sock, from);
//     } else if (message.startsWith('/alarm /cancel')) {
//         await cancelRecurringAlarm(sock, from);
//     } else if (message.startsWith('/alarm /clear')) {
//         await clearAlarms(sock, from);
//     } else if (message.startsWith('/alarm list')) {
//         await listAlarms(sock, from);
//     } else if (message.startsWith('/alarm')) {
//         await handleAlarmMessage(sock, from, message);
//     }
// };

// const handleAlarm = async (sock, from, input, isFromAssistantApi = false) => {
//     let responseText = '';

//     // Check if the input is from Assistant API
//     if (isFromAssistantApi) {
//         // If the command comes from the Assistant API, it will likely be a structured object
//         const { command, alarmId, newDetails, action } = input;

//         switch (action) {
//             case 'list':
//                 responseText = await listAlarms(sock, from);
//                 break;

//             case 'modify':
//                 if (alarmId) {
//                     await modifyAlarmById(sock, from, alarmId, newDetails);
//                     responseText = `Alarm with ID ${alarmId} modified successfully.`;
//                 } else {
//                     responseText = 'Error: Alarm ID is required to modify an alarm.';
//                 }
//                 break;

//             case 'create':
//                 const { dateTime, message, recurring, days, hours, minutes } = newDetails;
//                 if (!alarms[from]) {
//                     alarms[from] = [];
//                 }
//                 const newAlarmId = nextAlarmId++;
//                 alarms[from].push({ id: newAlarmId, dateTime, recurring, days, hours, minutes, message, status: 'ongoing' });
//                 scheduleAlarm(from, alarms[from][alarms[from].length - 1]);
//                 saveAlarms();
//                 responseText = `Alarm set for ${dateTime} with message: ${message}. Recurring: ${recurring ? 'Yes' : 'No'}. Your alarm ID is: ${newAlarmId}`;
//                 break;

//             default:
//                 responseText = 'Invalid action. Available actions: list, modify, create.';
//         }
//         console.log(`Response Text: ${responseText}`); // Note: Logging the response text for debugging purposes
//         return responseText;  // Return response directly since Assistant API might not use sock
//     }

//     // Handle WhatsApp commands
//     if (typeof input === 'string') {
//         const message = input;

//         if (message.startsWith('/alarm /snooze')) {
//             await snoozeAlarm(sock, from);
//             responseText = 'Alarm snoozed successfully.';
//         } else if (message.startsWith('/alarm /ack')) {
//             await acknowledgeAlarm(sock, from);
//             responseText = 'Alarm acknowledged successfully.';
//         } else if (message.startsWith('/alarm /cancel')) {
//             await cancelRecurringAlarm(sock, from);
//             responseText = 'Recurring alarm canceled successfully.';
//         } else if (message.startsWith('/alarm /clear')) {
//             await clearAlarms(sock, from);
//             responseText = 'All alarms cleared successfully.';
//         } else if (message.startsWith('/alarm list')) {
//             responseText = await listAlarms(sock, from);
//         } else if (message.startsWith('/alarm modify')) {
//             const parts = message.split(' ');
//             const alarmId = parseInt(parts[2]);  // Extract the alarm ID from the command
//             const newMessage = parts.slice(3).join(' ');  // New message or parameters
//             await modifyAlarmById(sock, from, alarmId, { message: newMessage });
//             responseText = `Alarm with ID ${alarmId} modified successfully.`;
//         } else if (message.startsWith('/alarm')) {
//             await handleAlarmMessage(sock, from, message);
//             responseText = 'Alarm handled successfully.';
//         }

//     } else if (typeof input === 'object') {
//         const { dateTime, message, recurring, days, hours, minutes } = input;

//         if (!alarms[from]) {
//             alarms[from] = [];
//         }

//         const newAlarmId = nextAlarmId++;
//         alarms[from].push({ id: newAlarmId, dateTime, recurring, days, hours, minutes, message, status: 'ongoing' });
//         scheduleAlarm(from, alarms[from][alarms[from].length - 1]);
//         saveAlarms();
//         responseText = `Alarm set for ${dateTime} with message: ${message}. Recurring: ${recurring ? 'Yes' : 'No'}. Your alarm ID is: ${newAlarmId}`;
//     }

//     // Send a confirmation or result response through sock (optional for WhatsApp)
//     if (sock) {
//         await sock.sendMessage(from, { text: responseText });
//     }

//     return responseText;
// };





const handleAlarm = async (sock, from, input) => {
    let responseText = '';
    console.log(`Received message from ${from}:`, input);
    // Check if the input is a string message (command)
    if (typeof input === 'string') {
        const message = input;  // Assign input to message for clarity

        if (message.startsWith('/alarm /snooze')) {
            await snoozeAlarm(sock, from);
            responseText = 'Alarm snoozed successfully.';
        } else if (message.startsWith('/alarm /ack')) {
            await acknowledgeAlarm(sock, from);
            responseText = 'Alarm acknowledged successfully.';
        } else if (message.startsWith('/alarm /cancel')) {
            await cancelRecurringAlarm(sock, from);
            responseText = 'Recurring alarm canceled successfully.';
        } else if (message.startsWith('/alarm /clear')) {
            await clearAlarms(sock, from);
            responseText = 'All alarms cleared successfully.';
        } else if (message.startsWith('/alarm list')) {
            const alarmListResponse = await listAlarms(sock, from);
            // Use the message from the response object
            responseText = alarmListResponse.message;
        }        
        else if (message.startsWith('/alarm')) {
            const result = await handleAlarmMessage(sock, from, message);
            responseText = result.message;  // Use the message from handleAlarmMessage
        }

    // Check if the input is an object (API call)
    } else if (typeof input === 'object') {
        const { dateTime, message, recurring, days, hours, minutes } = input;

        // Process the alarm using the object parameters
        if (!alarms[from]) {
            alarms[from] = [];
        }

        // Check if an alarm with the same dateTime already exists (conflict detection)
        const existingAlarm = alarms[from].find(alarm => alarm.dateTime === dateTime);
        
        if (existingAlarm) {
            // If an alarm with the same dateTime exists, update its message
            existingAlarm.message = message; // Replace existing message with the new one
            responseText = `Existing alarm found for ${dateTime}. Message updated successfully!`;
            saveAlarms();
        } else {
            // Generate a new alarm ID
            const newAlarmId = nextAlarmId++;

            // Create a new alarm entry
            const newAlarm = { id: newAlarmId, dateTime, recurring, days, hours, minutes, message, status: 'ongoing' };
            alarms[from].push(newAlarm);

            // Schedule the new alarm
            scheduleAlarm(from, newAlarm);
            saveAlarms();

            // Confirmation text for the new alarm
            responseText = `Alarm set for ${dateTime} with message: ${message}. Recurring: ${recurring ? 'Yes' : 'No'}. Your alarm ID is: ${newAlarmId}.`;
        }
    }

    // Send a confirmation or result response through sock (optional)
    if (sock) {
        await sock.sendMessage(from, { text: responseText });
    }

    // Return the text response
    return responseText;
};

// Modify Alarm By ID
const modifyAlarmById = async (from, alarmId, updates) => {
    // Check if the user has alarms
    if (!alarms[from] || alarms[from].length === 0) {
        return 'No alarms found.';
    }

    // Find the alarm with the given ID
    const alarm = alarms[from].find(alarm => alarm.id === alarmId);

    // If the alarm with the given ID is not found, return an error
    if (!alarm) {
        return `No alarm found with ID: ${alarmId}`;
    }

    // Update the alarm parameters if they are provided in the updates object
    if (typeof updates.message === 'string') {
        alarm.message = updates.message;
    }
    if (typeof updates.recurring === 'boolean') {
        alarm.recurring = updates.recurring;
    }
    if (typeof updates.minutes === 'number') {
        alarm.minutes = updates.minutes;
    } 
    if (typeof updates.hours === 'number') {
        alarm.hours = updates.hours;
    } 
    if (typeof updates.days === 'number') {
        alarm.days = updates.days;
    }

    // Reschedule the alarm if the recurrence time is changed
    if (updates.minutes || updates.hours || updates.days) {
        scheduleAlarm(from, alarm);
    }

    // Save the updated alarms
    saveAlarms();

    // Return a success response
    return `Alarm with ID ${alarmId} has been updated successfully.`;
};

const listAlarmsByCondition = async (from, condition) => {
    if (!alarms[from] || alarms[from].length === 0) {
        return 'No alarms found.';
    }

    let filteredAlarms = [...alarms[from]];

    // Filter based on the condition provided
    if (condition === 'upcoming') {
        const now = new Date();
        filteredAlarms = filteredAlarms.filter(alarm => new Date(alarm.dateTime) > now);
        filteredAlarms = filteredAlarms.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)); // Sort by upcoming dateTime
    } else if (condition === 'recurring') {
        filteredAlarms = filteredAlarms.filter(alarm => alarm.recurring);
    } else if (condition === 'non-recurring') {
        filteredAlarms = filteredAlarms.filter(alarm => !alarm.recurring);
    }
    
    // If no specific condition is given or the condition is 'all', we return all alarms
    if (condition === 'all' || !condition) {
        filteredAlarms = alarms[from];
    }

    if (filteredAlarms.length === 0) {
        return 'No alarms found matching the condition.';
    }

    let alarmList = 'Your alarms:\n';
    filteredAlarms.forEach(alarm => {
        let recurringDetails = alarm.recurring ? 'Yes' : 'No';
        if (alarm.recurring) {
            recurringDetails += ` (every ${alarm.minutes ? alarm.minutes + ' minutes' : alarm.hours ? alarm.hours + ' hours' : alarm.days + ' days'})`;
        }
        alarmList += `ID: ${alarm.id}, Time: ${alarm.dateTime}, Message: ${alarm.message}, Recurring: ${recurringDetails}\n`;
    });

    return alarmList;
};


const backupReminders = {}; // Store backup reminders in memory

function scheduleBackupReminder(user, date, time, hdd, interval, simulate = false) {
    const dateTime = new Date(`${date}T${time}`);
    const intervalMs = simulate ? interval * 60000 : interval * 7 * 24 * 60 * 60000; // 1 minute or 1 week in milliseconds

    if (!backupReminders[user]) {
        backupReminders[user] = [];
    }

    const reminder = {
        dateTime,
        hdd,
        interval: intervalMs,
        simulate,
        timeoutId: null,
        snooze: false,
        ack: false,
        active: true,
    };

    const sendReminder = () => {
        if (reminder.snooze || !reminder.active) return;
        reminder.ack = false;
        sock.sendMessage(user, { text: `Backup reminder: Please backup to HDD ${reminder.hdd}` });

        reminder.timeoutId = setTimeout(sendReminder, reminder.interval);
    };

    reminder.timeoutId = setTimeout(sendReminder, dateTime - Date.now());

    backupReminders[user].push(reminder);
}

function snoozeBackupReminder(user) {
    const reminders = backupReminders[user] || [];
    reminders.forEach(reminder => {
        if (!reminder.active) return;
        reminder.snooze = true;
        clearTimeout(reminder.timeoutId);

        const snoozeTime = reminder.simulate ? 60000 : 24 * 60 * 60000; // 1 minute or 1 day in milliseconds
        reminder.timeoutId = setTimeout(() => {
            reminder.snooze = false;
            sendReminder();
        }, snoozeTime);
    });
}

function acknowledgeBackupReminder(user) {
    const reminders = backupReminders[user] || [];
    reminders.forEach(reminder => {
        if (!reminder.active) return;
        reminder.ack = true;
    });
}

function stopBackupReminder(user) {
    const reminders = backupReminders[user] || [];
    reminders.forEach(reminder => {
        reminder.active = false;
        clearTimeout(reminder.timeoutId);
    });
}

function resumeBackupReminder(user) {
    const reminders = backupReminders[user] || [];
    reminders.forEach(reminder => {
        if (reminder.active) return;
        reminder.active = true;
        reminder.timeoutId = setTimeout(sendReminder, reminder.dateTime - Date.now());
    });
}

function handleBackupReminderCommand(user, text) {
    const parts = text.split(' ');
    if (parts.length < 2) {
        sock.sendMessage(user, { text: 'Invalid command format. Use /backupreminder date,time /hdd 1 /int 1' });
        return;
    }

    const dateTimePart = parts[1].split(',');
    const date = dateTimePart[0];
    const time = dateTimePart[1];

    const hdd = parts.find(p => p.startsWith('/hdd')).split(' ')[1];
    const interval = parseInt(parts.find(p => p.startsWith('/int')).split(' ')[1], 10);

    const simulate = parts.includes('/simulate');

    scheduleBackupReminder(user, date, time, hdd, interval, simulate);
    sock.sendMessage(user, { text: 'Backup reminder set successfully.' });
}



module.exports = {
    initializeSock,
    handleAlarm,
    handleAlarmMessage,
    parseAlarmCommand,
    scheduleAlarm,
    snoozeAlarm,
    acknowledgeAlarm,
    cancelRecurringAlarm,
    listAlarms,
    saveAlarms,
    loadAlarms,
    modifyAlarmById, // New function to modify alarms by ID
    listAlarmsByCondition    // New function to list alarms based on conditions
};
