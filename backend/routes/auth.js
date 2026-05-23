const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Rider } = require('../models');
const { protect } = require('../middleware/auth');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// POST /auth/register — public customer registration
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered.' });

    const adminCount = await User.countDocuments({ role: 'admin' });
    const assignedRole = adminCount === 0 ? 'admin' : 'customer';

    const user = await User.create({ name, email, password, phone, role: assignedRole });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) { next(err); }
});

// POST /auth/login — works for admin, customer, and rider
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken(user._id);

    // If rider, attach rider profile
    let riderProfile = null;
    if (user.role === 'rider') {
      riderProfile = await Rider.findOne({ userId: user._id });
    }

    res.json({ token, user: user.toSafeObject(), riderProfile });
  } catch (err) { next(err); }
});

// GET /auth/me
router.get('/me', protect, async (req, res) => {
  let riderProfile = null;
  if (req.user.role === 'rider') {
    riderProfile = await Rider.findOne({ userId: req.user._id });
  }
  res.json({ user: req.user, riderProfile });
});

module.exports = router;
