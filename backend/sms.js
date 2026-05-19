const AfricasTalking = require('africastalking');
require('dotenv').config();

const at = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey:   process.env.AT_API_KEY,
});

const sms = at.SMS;

async function sendSMS(phone, message) {
  try {
    await sms.send({ to: [phone], message, from: process.env.AT_SENDER_ID });
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

module.exports = { sendSMS };
