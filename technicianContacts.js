const fs = require('fs');
const path = require('path');

const contactsPath = path.join(__dirname, 'technicianContacts.json');

// Normalize phone number
const phoneNumberFormatter = (number) => {
    let formatted = number.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
    }
    return formatted;
};

// Load contacts from JSON file and normalize phone numbers
const loadContacts = () => {
    if (fs.existsSync(contactsPath)) {
        const rawData = fs.readFileSync(contactsPath);
        const contacts = JSON.parse(rawData);
        return contacts.map(contact => ({
            ...contact,
            phone: phoneNumberFormatter(contact.phone)
        }));
    }
    return [];
};

// Get contact by ICT Technician name
const getContactByIctTechnicianName = (ictTechnicianName) => {
    const contacts = loadContacts();
    return contacts.find(contact => contact.ict_name.toLowerCase() === ictTechnicianName.toLowerCase());
};

// Get contact by name
const getContactByName = (name) => {
    const contacts = loadContacts();
    return contacts.find(contact => contact.name.toLowerCase() === name.toLowerCase());
};

// Get contact by phone
const getContactByPhone = (phone) => {
    const contacts = loadContacts();
    const normalizedPhone = phoneNumberFormatter(phone);
    return contacts.find(contact => contact.phone === normalizedPhone);
};

// Get contact by email
const getContactByEmail = (email) => {
    const contacts = loadContacts();
    return contacts.find(contact => contact.email.toLowerCase() === email.toLowerCase());
};

// Add a new contact (if needed)
const addContact = (name, ict_name, phone, email, technician) => {
    const contacts = loadContacts();
    contacts.push({ name, ict_name, phone, email, technician });
    fs.writeFileSync(contactsPath, JSON.stringify(contacts, null, 2));
};

module.exports = {
    getContactByName,
    getContactByPhone,
    getContactByEmail,
    getContactByIctTechnicianName,
    addContact
};
