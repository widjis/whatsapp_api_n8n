/**
 * Phone number formatting utility for WhatsApp
 * Extracted to avoid circular dependencies
 */

/**
 * Format phone number for WhatsApp
 * @param {string} number - The phone number to format
 * @returns {string} - Formatted phone number with @c.us suffix
 */
export const phoneNumberFormatter = (number) => {
    console.log(`Formatting phone number: ${number}`);
    let formatted = number.replace(/\D/g, '');
    console.log(`After removing non-digit characters: ${formatted}`);
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
        console.log(`Adding country code and removing leading zero: ${formatted}`);
    }
    if (!formatted.endsWith('@c.us')) {
        formatted += '@c.us';
        console.log(`Adding WhatsApp domain: ${formatted}`);
    }
    console.log(`Formatted phone number: ${formatted}`);
    return formatted;
};

export default phoneNumberFormatter;