const express = require('express');
const router = express.Router();
const { Rider, User, Delivery } = require('../models');
const { protect, adminOnly, riderOnly } = require('../middleware/auth');

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) return '+234' + phone.slice(1);
  if (phone.startsWith('234')) return '+' + phone;
  return phone;
}

// GET /riders/me — rider's own profile
router.get('/me', protect, async (req, res, next) => {
  try {
    const rider = await Rider.findOne({ userId: req.user._id });
    if (!rider) return res.status(404).json({ error: 'Rider profile not found.' });
    res.json(rider);
  } catch (err) { next(err); }
});

// GET /riders/me/deliveries — rider's assigned deliveries
router.get('/me/deliveries', protect, async (req, res, next) => {
  try {
    const rider = await Rider.findOne({ userId: req.user._id });
    if (!rider) return res.status(404).json({ error: 'Rider profile not found.' });
    const { status } = req.query;
    const filter = { rider: rider._id };
    if (status) filter.status = status;
    const deliveries = await Delivery.find(filter).sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { next(err); }
});

// GET /riders — admin sees all, others see active only
router.get('/', protect, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const riders = await Rider.find(filter).sort({ createdAt: -1 });
    res.json(riders);
  } catch (err) { next(err); }
});

// POST /riders — admin creates rider + linked user account
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'Name, phone, email and password are required.' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered.' });

    const user = await User.create({ name, email, password, phone, role: 'rider' });
    const rider = await Rider.create({ name, phone: normalizePhone(phone), userId: user._id });

    res.status(201).json({ rider, user: user.toSafeObject() });
  } catch (err) { next(err); }
});

// PATCH /riders/:id — admin only
router.patch('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const rider = await Rider.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!rider) return res.status(404).json({ error: 'Rider not found.' });
    res.json(rider);
  } catch (err) { next(err); }
});

// DELETE /riders/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const rider = await Rider.findByIdAndDelete(req.params.id);
    if (!rider) return res.status(404).json({ error: 'Rider not found.' });
    if (rider.userId) await User.findByIdAndDelete(rider.userId);
    res.json({ message: 'Rider deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
