const express = require('express');
const router = express.Router();
const { Delivery, Rider, Rating } = require('../models');
const { sendSMS } = require('../sms');
const { protect, adminOnly, riderOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) return '+234' + phone.slice(1);
  if (phone.startsWith('234')) return '+' + phone;
  return phone;
}

function generateTracking() { return 'RDR-' + uuidv4().slice(0, 6).toUpperCase(); }
function generateOTP()      { return Math.floor(1000 + Math.random() * 9000).toString(); }

// Simple distance-based price estimate (flat rate + per km approximation)
function estimatePrice(pickup, destination) {
  const base = 500;
  const perKm = 100;
  const avgKm = Math.floor(Math.random() * 15) + 3; // placeholder until geocoding added
  return base + (perKm * avgKm);
}

// GET /deliveries — admin sees all, customer sees own, rider sees assigned
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, search, from, to } = req.query;
    let filter = {};

    if (req.user.role === 'customer') filter.createdBy = req.user._id;
    if (req.user.role === 'rider') {
      const rider = await Rider.findOne({ userId: req.user._id });
      if (!rider) return res.json([]);
      filter.rider = rider._id;
    }

    if (status) filter.status = status;
    if (search) filter.$or = [
      { trackingCode: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

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

    // Revenue from delivered
    const delivered = await Delivery.find({ status: 'delivered' }).select('price');
    const revenue = delivered.reduce((sum, d) => sum + (d.price || 0), 0);

    // Last 7 days daily counts
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = await Delivery.countDocuments({ createdAt: { $gte: d, $lt: next } });
      days.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
    }

    res.json({ total, revenue, dailyTrend: days, ...Object.fromEntries(statuses.map((s, i) => [s, counts[i]])) });
  } catch (err) { next(err); }
});

// GET /deliveries/export — admin CSV export
router.get('/export', protect, adminOnly, async (req, res, next) => {
  try {
    const deliveries = await Delivery.find().populate('rider').sort({ createdAt: -1 });
    const rows = [
      ['Tracking Code', 'Customer', 'Phone', 'Pickup', 'Destination', 'Status', 'Rider', 'Price', 'Date'],
      ...deliveries.map(d => [
        d.trackingCode, d.customerName, d.customerPhone,
        d.pickupAddress, d.deliveryAddress, d.status,
        d.rider?.name || '', d.price || '', new Date(d.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="riderr-deliveries.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /deliveries/track/:code — public
router.get('/track/:code', async (req, res, next) => {
  try {
    const delivery = await Delivery.findOne({ trackingCode: req.params.code.toUpperCase() })
      .populate('rider', 'name phone rating')
      .select('-otp');
    if (!delivery) return res.status(404).json({ error: 'Tracking code not found.' });
    res.json(delivery);
  } catch (err) { next(err); }
});

// POST /deliveries — admin or customer
router.post('/', protect, async (req, res, next) => {
  try {
    if (req.user.role === 'rider') return res.status(403).json({ error: 'Riders cannot create deliveries.' });
    const { customerName, customerPhone, pickupAddress, deliveryAddress, notes, scheduledAt } = req.body;
    if (!customerName || !customerPhone || !pickupAddress || !deliveryAddress) {
      return res.status(400).json({ error: 'All address and customer fields are required.' });
    }

    const phone = normalizePhone(customerPhone);
    const trackingCode = generateTracking();
    const otp = generateOTP();
    const price = estimatePrice(pickupAddress, deliveryAddress);

    const delivery = await Delivery.create({
      trackingCode, customerName, customerPhone: phone,
      pickupAddress, deliveryAddress, otp, notes, price,
      scheduledAt: scheduledAt || null,
      createdBy: req.user._id,
    });

    req.app.get('io')?.emit('delivery:new', delivery);

    await sendSMS(phone,
      `Hi ${customerName}, your RiderR delivery is booked!\nTracking: ${trackingCode}\nOTP (share with rider on delivery): ${otp}\nEstimated cost: ₦${price.toLocaleString()}`
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

    const rider = await Rider.findById(riderId).populate('userId');
    if (!rider || !rider.isActive) return res.status(404).json({ error: 'Rider not found or inactive.' });

    delivery.rider = riderId;
    delivery.status = 'accepted';
    await delivery.save();

    req.app.get('io')?.emit('delivery:updated', await delivery.populate('rider'));

    // SMS to customer
    await sendSMS(delivery.customerPhone,
      `Your delivery ${delivery.trackingCode} has been assigned to rider ${rider.name} (${rider.phone}). They are heading to pick it up!`
    );

    // SMS to rider
    await sendSMS(rider.phone,
      `New job assigned! Delivery ${delivery.trackingCode}\nPickup: ${delivery.pickupAddress}\nDeliver to: ${delivery.deliveryAddress}\nCustomer: ${delivery.customerName}`
    );

    res.json(await delivery.populate('rider'));
  } catch (err) { next(err); }
});

// PATCH /deliveries/:id/status — rider updates to in_transit
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findById(req.params.id).populate('rider');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });

    // Rider can only move to in_transit
    if (req.user.role === 'rider') {
      const rider = await Rider.findOne({ userId: req.user._id });
      if (!rider || delivery.rider?._id?.toString() !== rider._id.toString()) {
        return res.status(403).json({ error: 'Not your delivery.' });
      }
      if (status !== 'in_transit' || delivery.status !== 'accepted') {
        return res.status(400).json({ error: 'You can only mark accepted deliveries as in_transit.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    delivery.status = status;
    await delivery.save();

    req.app.get('io')?.emit('delivery:updated', delivery);

    await sendSMS(delivery.customerPhone,
      `Update on ${delivery.trackingCode}: Your package is now ${status.replace('_', ' ').toUpperCase()}!`
    );

    res.json(delivery);
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

    req.app.get('io')?.emit('delivery:updated', delivery);

    await sendSMS(delivery.customerPhone,
      `Your delivery ${delivery.trackingCode} has been cancelled. Contact support if this was a mistake.`
    );

    res.json(delivery);
  } catch (err) { next(err); }
});

// POST /deliveries/:id/rate — customer rates after delivery
router.post('/:id/rate', protect, async (req, res, next) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'Score must be between 1 and 5.' });

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });
    if (delivery.status !== 'delivered') return res.status(400).json({ error: 'Can only rate delivered deliveries.' });

    const isOwner = delivery.createdBy?.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized.' });

    const existing = await Rating.findOne({ delivery: delivery._id });
    if (existing) return res.status(409).json({ error: 'Already rated.' });

    const rating = await Rating.create({ delivery: delivery._id, rider: delivery.rider, score, comment });

    // Update rider average rating
    const allRatings = await Rating.find({ rider: delivery.rider });
    const avg = allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length;
    await Rider.findByIdAndUpdate(delivery.rider, { rating: Math.round(avg * 10) / 10 });

    res.status(201).json(rating);
  } catch (err) { next(err); }
});

module.exports = router;
