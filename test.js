const axios = require("axios");

// Make this function dynamic to send SMS
async function sendSMS(numbers, message, variablesValues = "") {
  const url = "https://www.fast2sms.com/dev/bulkV2";

  const params = {
    authorization: "seQa3JGt97c8KLy402XiD6xlhfVkqzFYUREuTjrbwCnZdvSBP1buJd7WDNvzPpZKlr6MqVC5O32H4jQ1",   // Replace with your API key
    route: "dlt",                         // or "qrcode" or "otp" based on need
    sender_id: "DOCAAP",                // DL-based approved sender ID
    message: "201819",               // DLT-approved template ID
    variables_values: "212121",    // Example: "12345|98765"
    numbers: "8747977162",                     // Comma separated numbers e.g. "9999999999,8888888888"
    flash: "1",                           // Optional: 0 = normal SMS
    // schedule_time: ""                     // Optional: if scheduling SMS
  };

  try {
    const response = await axios.get(url, { params });
    console.log("SMS Sent Successfully:", response.data);
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
  }
}

// Example call:
sendSMS("9999999999,8888888888", "Hello, this is a test SMS", "VALUE1|VALUE2");
