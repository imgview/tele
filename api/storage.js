// Simple wrapper helper for local session storage (node-localstorage)
const { LocalStorage } = require('node-localstorage');
const storage = new LocalStorage('./telegram-sessions');
module.exports = storage;
