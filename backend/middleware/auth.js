const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found or deactivated.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function adminOnly(req, res, next) {
  if (!['admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

function riderOnly(req, res, next) {
  if (req.user?.role !== 'rider') {
    return res.status(403).json({ error: 'Rider access required.' });
  }
  next();
}

module.exports = { protect, adminOnly, riderOnly };
