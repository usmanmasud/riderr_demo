const express = require('express');
const router = express.Router();
const { Rider } = require('../models');

router.get('/', async (req, res) => {
  res.json(await Rider.find());
});

router.post('/', async (req, res) => {
  const { name, phone } = req.body;
  const rider = await Rider.create({ name, phone });
  res.status(201).json(rider);
});

router.patch('/:id', async (req, res) => {
  const rider = await Rider.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!rider) return res.status(404).json({ error: 'Rider not found' });
  res.json(rider);
});

router.delete('/:id', async (req, res) => {
  const rider = await Rider.findByIdAndDelete(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found' });
  res.json({ message: 'Rider deleted' });
});

module.exports = router;
