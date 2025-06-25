// Utility function to convert markdown-style formatting to WhatsApp formatting
function formatWhatsAppText(text) {
    if (!text) return text;

    // Convert markdown bold (**text**) to WhatsApp bold (*text*)
    text = text.replace(/\*\*(.*?)\*\*/g, '*$1*');

    // Convert markdown italic (__text__) to WhatsApp italic (_text_)
    text = text.replace(/__(.*?)__/g, '_$1_');

    // Convert markdown strikethrough (~~text~~) to WhatsApp strikethrough (~text~)
    text = text.replace(/~~(.*?)~~/g, '~$1~');

    // Convert markdown-style numbered lists (1. ) to simple numbers with dots
    text = text.replace(/^\d+\.\s/gm, (match) => match);

    // Ensure proper line breaks
    text = text.replace(/\n/g, '\n');

    return text;
}

module.exports = { formatWhatsAppText };