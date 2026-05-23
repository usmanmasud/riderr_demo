const express = require('express');
const router = express.Router();
const { Rider } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) return '+234' + phone.slice(1);
  if (phone.startsWith('234')) return '+' + phone;
  return phone;
}

// GET /riders — protected, any logged-in user (customers see active riders for info)
router.get('/', protect, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const riders = await Rider.find(filter).sort({ createdAt: -1 });
    res.json(riders);
  } catch (err) { next(err); }
});

// POST /riders — admin only
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
    const rider = await Rider.create({ name, phone: normalizePhone(phone) });
    res.status(201).json(rider);
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
    res.json({ message: 'Rider deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
