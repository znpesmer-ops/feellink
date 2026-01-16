// Vercel serverless function handler
// Import the compiled handler from dist/main.js after build
const handler = require('../dist/main');

module.exports = handler.default || handler;
