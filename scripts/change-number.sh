#!/bin/bash

# WhatsApp Number Change Tool - Shell Wrapper
# Quick access script for changing WhatsApp numbers

echo "🔄 WhatsApp Number Change Tool"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "change_number.js" ]; then
    echo "❌ Error: change_number.js not found in current directory"
    echo "Please run this script from the WhatsApp API directory"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Run the main script
node change_number.js

echo ""
echo "✅ Number change process completed!"
echo "📱 Remember to scan the QR code with your new WhatsApp number"