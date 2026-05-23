const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

// GET /users — admin only
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { next(err); }
});

// PATCH /users/:id — admin can change role or deactivate
router.patch('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) { next(err); }
});

// DELETE /users/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
