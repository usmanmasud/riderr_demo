const express = require('express');
const router = express.Router();
const { Delivery, Rider } = require('../models');
const { sendSMS } = require('../sms');
const { v4: uuidv4 } = require('uuid');

// GET all deliveries
router.get('/', async (req, res) => {
  const deliveries = await Delivery.find().populate('rider').sort({ createdAt: -1 });
  res.json(deliveries);
});

// POST create delivery
router.post('/', async (req, res) => {
  const { customerName, customerPhone, pickupAddress, deliveryAddress } = req.body;
  const phone = customerPhone.replace(/\s+/g, '').replace(/^0/, '+234').replace(/^234/, '+234');
  const trackingCode = 'RDR-' + uuidv4().slice(0, 6).toUpperCase();
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const delivery = await Delivery.create({ trackingCode, customerName, customerPhone: phone, pickupAddress, deliveryAddress, otp });

  await sendSMS(phone, `Hi ${customerName}, your delivery has been created. Tracking code: ${trackingCode}. OTP for confirmation: ${otp}`);

  res.status(201).json(delivery);
});

// PATCH assign rider
router.patch('/:id/assign', async (req, res) => {
  const { riderId } = req.body;
  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

  const rider = await Rider.findById(riderId);
  if (!rider) return res.status(404).json({ error: 'Rider not found' });

  delivery.rider = riderId;
  delivery.status = 'accepted';
  await delivery.save();

  await sendSMS(delivery.customerPhone, `Your delivery ${delivery.trackingCode} has been assigned to rider ${rider.name}.`);

  res.json(delivery);
});

// GET analytics summary
router.get('/analytics', async (req, res) => {
  const statuses = ['pending', 'accepted', 'in_transit', 'delivered', 'failed'];
  const counts = await Promise.all(statuses.map(s => Delivery.countDocuments({ status: s })));
  res.json(Object.fromEntries(statuses.map((s, i) => [s, counts[i]])));
});

module.exports = router;
