const AfricasTalking = require('africastalking');
require('dotenv').config();

const at = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey:   process.env.AT_API_KEY,
});

const sms = at.SMS;

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) return '+234' + phone.slice(1);
  if (phone.startsWith('234')) return '+' + phone;
  return phone;
}

async function sendSMS(phone, message) {
  try {
    const payload = { to: [normalizePhone(phone)], message };
    if (process.env.AT_USERNAME !== 'sandbox' && process.env.AT_SENDER_ID) payload.from = process.env.AT_SENDER_ID;
    const result = await sms.send(payload);
    console.log('SMS result:', JSON.stringify(result));
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

module.exports = { sendSMS };
