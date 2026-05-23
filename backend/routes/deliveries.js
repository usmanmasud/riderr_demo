const express = require('express');
const router = express.Router();
const { Delivery, Rider } = require('../models');
const { sendSMS } = require('../sms');
const { protect, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) return '+234' + phone.slice(1);
  if (phone.startsWith('234')) return '+' + phone;
  return phone;
}

function generateTracking() {
  return 'RDR-' + uuidv4().slice(0, 6).toUpperCase();
}

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// GET /deliveries — admin sees all, customer sees their own
router.get('/', protect, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const deliveries = await Delivery.find(filter).populate('rider').sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { next(err); }
});

// GET /deliveries/analytics — admin only
router.get('/analytics', protect, adminOnly, async (req, res, next) => {
  try {
    const statuses = ['pending', 'accepted', 'in_transit', 'delivered', 'failed', 'cancelled'];
    const counts = await Promise.all(statuses.map(s => Delivery.countDocuments({ status: s })));
    const total = counts.reduce((a, b) => a + b, 0);
    res.json({ total, ...Object.fromEntries(statuses.map((s, i) => [s, counts[i]])) });
  } catch (err) { next(err); }
});

// GET /deliveries/track/:code — public tracking (no auth)
router.get('/track/:code', async (req, res, next) => {
  try {
    const delivery = await Delivery.findOne({ trackingCode: req.params.code.toUpperCase() })
      .populate('rider', 'name phone')
      .select('-otp');
    if (!delivery) return res.status(404).json({ error: 'Tracking code not found.' });
    res.json(delivery);
  } catch (err) { next(err); }
});

// POST /deliveries — admin or authenticated customer
router.post('/', protect, async (req, res, next) => {
  try {
    const { customerName, customerPhone, pickupAddress, deliveryAddress, notes } = req.body;
    if (!customerName || !customerPhone || !pickupAddress || !deliveryAddress) {
      return res.status(400).json({ error: 'All address and customer fields are required.' });
    }

    const phone = normalizePhone(customerPhone);
    const trackingCode = generateTracking();
    const otp = generateOTP();

    const delivery = await Delivery.create({
      trackingCode, customerName, customerPhone: phone,
      pickupAddress, deliveryAddress, otp, notes,
      createdBy: req.user._id,
    });

    await sendSMS(phone,
      `Hi ${customerName}, your RiderR delivery has been booked!\nTracking: ${trackingCode}\nOTP (share with rider on delivery): ${otp}\nTrack at: riderr.app/track/${trackingCode}`
    );

    res.status(201).json(delivery);
  } catch (err) { next(err); }
});

// PATCH /deliveries/:id/assign — admin only
router.patch('/:id/assign', protect, adminOnly, async (req, res, next) => {
  try {
    const { riderId } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });
    if (delivery.status !== 'pending') return res.status(400).json({ error: 'Only pending deliveries can be assigned.' });

    const rider = await Rider.findById(riderId);
    if (!rider || !rider.isActive) return res.status(404).json({ error: 'Rider not found or inactive.' });

    delivery.rider = riderId;
    delivery.status = 'accepted';
    await delivery.save();

    await sendSMS(delivery.customerPhone,
      `Your delivery ${delivery.trackingCode} has been assigned to rider ${rider.name} (${rider.phone}). They are on their way!`
    );

    res.json(await delivery.populate('rider'));
  } catch (err) { next(err); }
});

// PATCH /deliveries/:id/cancel — owner or admin
router.patch('/:id/cancel', protect, async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });

    const isOwner = delivery.createdBy?.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized.' });
    if (['delivered', 'cancelled'].includes(delivery.status)) {
      return res.status(400).json({ error: `Cannot cancel a ${delivery.status} delivery.` });
    }

    delivery.status = 'cancelled';
    await delivery.save();

    await sendSMS(delivery.customerPhone,
      `Your delivery ${delivery.trackingCode} has been cancelled. Contact support if this was a mistake.`
    );

    res.json(delivery);
  } catch (err) { next(err); }
});

module.exports = router;
