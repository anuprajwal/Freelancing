// utils/generateUUID.js
const { v4: uuidv4 } = require('uuid');

function generateUUID() {
  return uuidv4(); // generates a unique UUID v4 string
}

module.exports = generateUUID;
