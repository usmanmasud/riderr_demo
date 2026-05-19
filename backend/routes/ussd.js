const express = require('express');
const router = express.Router();
const { Delivery, Rider } = require('../models');
const { sendSMS } = require('../sms');

// text is cumulative e.g. "1", "1*2", "1*2*OTP123"
router.post('/', async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  const parts = text ? text.split('*') : [];
  let response = '';

  // Level 0 — main menu
  if (text === '') {
    response = `CON Welcome to RiderR Logistics
1. View My Deliveries
2. Accept a Job
3. Confirm Delivery
4. Report Issue`;

  // ── 1. VIEW DELIVERIES ──────────────────────────────────────────────
  } else if (parts[0] === '1') {
    const rider = await Rider.findOne({ where: { phone: phoneNumber } });
    if (!rider) return res.send('END You are not registered as a rider.');

    const jobs = await Delivery.findAll({
      where: { riderId: rider.id, status: ['accepted', 'in_transit'] },
      limit: 5,
    });

    if (!jobs.length) {
      response = 'END You have no active deliveries.';
    } else {
      const list = jobs.map((d, i) => `${i + 1}. ${d.trackingCode} - ${d.status}`).join('\n');
      response = `END Your active deliveries:\n${list}`;
    }

  // ── 2. ACCEPT A JOB ─────────────────────────────────────────────────
  } else if (parts[0] === '2') {
    if (parts.length === 1) {
      // Show pending deliveries
      const pending = await Delivery.findAll({ where: { status: 'pending', riderId: null }, limit: 5 });
      if (!pending.length) return res.send('END No pending jobs available.');

      const list = pending.map((d, i) => `${i + 1}. ${d.trackingCode}\n   To: ${d.deliveryAddress}`).join('\n');
      response = `CON Available Jobs:\n${list}\nEnter job number to accept:`;

    } else if (parts.length === 2) {
      const pending = await Delivery.findAll({ where: { status: 'pending', riderId: null }, limit: 5 });
      const selected = pending[parseInt(parts[1]) - 1];
      if (!selected) return res.send('END Invalid selection.');

      const rider = await Rider.findOne({ where: { phone: phoneNumber } });
      if (!rider) return res.send('END You are not registered as a rider.');

      await selected.update({ riderId: rider.id, status: 'accepted' });
      await sendSMS(selected.customerPhone, `Your delivery ${selected.trackingCode} has been accepted by a rider. They are on their way.`);

      response = `END Job ${selected.trackingCode} accepted!\nPickup: ${selected.pickupAddress}\nDeliver to: ${selected.deliveryAddress}`;
    }

  // ── 3. CONFIRM DELIVERY ──────────────────────────────────────────────
  } else if (parts[0] === '3') {
    if (parts.length === 1) {
      response = 'CON Enter tracking code to confirm delivery:';

    } else if (parts.length === 2) {
      const delivery = await Delivery.findOne({ where: { trackingCode: parts[1].toUpperCase() } });
      if (!delivery) return res.send('END Tracking code not found.');
      response = `CON Enter OTP from customer to confirm delivery of ${delivery.trackingCode}:`;

    } else if (parts.length === 3) {
      const delivery = await Delivery.findOne({ where: { trackingCode: parts[1].toUpperCase() } });
      if (!delivery) return res.send('END Delivery not found.');

      if (delivery.otp !== parts[2]) return res.send('END Invalid OTP. Delivery not confirmed.');

      await delivery.update({ status: 'delivered' });
      await sendSMS(delivery.customerPhone, `Your package ${delivery.trackingCode} has been delivered. Thank you for using RiderR!`);

      response = `END Delivery ${delivery.trackingCode} confirmed successfully!`;
    }

  // ── 4. REPORT ISSUE ──────────────────────────────────────────────────
  } else if (parts[0] === '4') {
    if (parts.length === 1) {
      response = `CON Select issue type:
1. Cannot locate address
2. Customer not available
3. Package damaged`;

    } else if (parts.length === 2) {
      response = 'CON Enter tracking code for this issue:';

    } else if (parts.length === 3) {
      const issues = ['Cannot locate address', 'Customer not available', 'Package damaged'];
      const issue = issues[parseInt(parts[1]) - 1] || 'Unknown issue';
      const delivery = await Delivery.findOne({ where: { trackingCode: parts[2].toUpperCase() } });

      if (!delivery) return res.send('END Tracking code not found.');

      await delivery.update({ status: 'failed' });
      await sendSMS(delivery.customerPhone, `There was an issue with your delivery ${delivery.trackingCode}: ${issue}. Our team will contact you shortly.`);

      response = `END Issue reported for ${delivery.trackingCode}.\nReason: ${issue}`;
    }

  } else {
    response = 'END Invalid option. Please try again.';
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

module.exports = router;
