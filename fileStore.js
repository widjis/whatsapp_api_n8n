const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST || '10.60.10.46',   // ← note the comma here
    port: parseInt(process.env.REDIS_PORT, 10) || 6379
  });
  
  redis.on('error', err => console.error('Redis error', err));
  console.log(`Connecting to Redis at ${redis.options.host}:${redis.options.port}`);
const loadStore = async () => {
    const keys = await redis.keys('*');
    const store = {};
    for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
            store[key] = JSON.parse(data);
        }
    }
    return store;
};



const storeMessage = async (messageId, remoteJid, message, reacted) => {
    const key = `${remoteJid}_${messageId}`;
    const data = { message, timestamp: Date.now(), reacted };
    await redis.set(key, JSON.stringify(data));
};

const getMessage = (messageId, remoteJid, callback) => {
    const key = `${remoteJid}_${messageId}`;
    console.log(`Fetching message from Redis with key: ${key}`);

    redis.get(key, (err, data) => {
        if (err) {
            console.error(`Redis error for key: ${key}`, err.message);
            return callback(err, null);
        }

        if (!data) {
            console.warn(`No data found for key: ${key}`);
            return callback(null, null);
        }

        try {
            const parsedData = JSON.parse(data);
            console.log(`Parsed data for key: ${key}`, parsedData);
            callback(null, parsedData);
        } catch (parseError) {
            console.error(`Error parsing Redis data for key: ${key}`, parseError.message);
            callback(parseError, null);
        }
    });
};




const markMessageAsReacted = async (messageId, remoteJid, reacterNumber) => {
    const key = `${remoteJid}_${messageId}`;
    const messageData = await redis.get(key);
    if (messageData) {
        const messageObj = JSON.parse(messageData);
        messageObj.reacted = true;
        messageObj.reacterNumber = reacterNumber; // Store the reacter number
        await redis.set(key, JSON.stringify(messageObj));
    }
};

async function findReacterNumber(messageId, remoteJid) {
    const key = `${remoteJid}_${messageId}`;
    const messageData = await redis.get(key);
    if (messageData) {
        const messageObj = JSON.parse(messageData);
        return messageObj.reacterNumber || null; // Return the reacter number if it exists, otherwise return null
    }
    return null; // Return null if no message data is found
}


const cleanupOldMessages = async () => {
    const keys = await redis.keys('*'); // Get all keys
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; // 1 week
    for (const key of keys) {
        const messageData = await redis.get(key);
        if (messageData) {
            const { timestamp } = JSON.parse(messageData);
            if (timestamp < oneWeekAgo) {
                await redis.del(key); // Delete old messages
            }
        }
    }
};

module.exports = { storeMessage, getMessage, markMessageAsReacted, cleanupOldMessages, findReacterNumber };
