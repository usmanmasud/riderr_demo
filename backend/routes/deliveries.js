const express = require('express');
const router = express.Router();
const { Delivery, Rider } = require('../models');
const { sendSMS } = require('../sms');
const { v4: uuidv4 } = require('uuid');

// GET all deliveries
router.get('/', async (req, res) => {
  const deliveries = await Delivery.findAll({ include: Rider, order: [['createdAt', 'DESC']] });
  res.json(deliveries);
});

// POST create delivery
router.post('/', async (req, res) => {
  const { customerName, customerPhone, pickupAddress, deliveryAddress } = req.body;
  const trackingCode = 'RDR-' + uuidv4().slice(0, 6).toUpperCase();
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const delivery = await Delivery.create({ trackingCode, customerName, customerPhone, pickupAddress, deliveryAddress, otp });

  await sendSMS(customerPhone, `Hi ${customerName}, your delivery has been created. Tracking code: ${trackingCode}. OTP for confirmation: ${otp}`);

  res.status(201).json(delivery);
});

// PATCH assign rider
router.patch('/:id/assign', async (req, res) => {
  const { riderId } = req.body;
  const delivery = await Delivery.findByPk(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

  const rider = await Rider.findByPk(riderId);
  if (!rider) return res.status(404).json({ error: 'Rider not found' });

  await delivery.update({ riderId, status: 'accepted' });
  await sendSMS(delivery.customerPhone, `Your delivery ${delivery.trackingCode} has been assigned to rider ${rider.name}.`);

  res.json(delivery);
});

// GET analytics summary
router.get('/analytics', async (req, res) => {
  const { Op } = require('sequelize');
  const statuses = ['pending', 'accepted', 'in_transit', 'delivered', 'failed'];
  const counts = await Promise.all(
    statuses.map(s => Delivery.count({ where: { status: s } }))
  );
  res.json(Object.fromEntries(statuses.map((s, i) => [s, counts[i]])));
});

module.exports = router;
