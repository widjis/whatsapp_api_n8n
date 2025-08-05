#!/usr/bin/env node

// Simple script to get current date and time for journal entries
const now = new Date();
const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
console.log(timestamp);