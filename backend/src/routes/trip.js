// routes/trip.js - Manajemen perjalanan
const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// Riwayat perjalanan
router.get('/history', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const trips = await Trip.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .select('-route.steps -route.geometry');
  const total = await Trip.countDocuments({ user: req.user._id });
  res.json({ success: true, data: { trips, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
}));

// Detail perjalanan
router.get('/:id', asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, user: req.user._id });
  if (!trip) return res.status(404).json({ success: false, message: 'Perjalanan tidak ditemukan.' });
  res.json({ success: true, data: trip });
}));

// Start perjalanan
router.patch('/:id/start', asyncHandler(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'planned' },
    { status: 'active', startedAt: new Date() },
    { new: true }
  );
  if (!trip) return res.status(404).json({ success: false, message: 'Perjalanan tidak dapat dimulai.' });
  res.json({ success: true, data: trip, message: 'Perjalanan dimulai!' });
}));

// Selesai perjalanan
router.patch('/:id/complete', asyncHandler(async (req, res) => {
  const { actualDistance, actualDuration, avgSpeed } = req.body;
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    {
      status: 'completed',
      completedAt: new Date(),
      'stats.actualDistance': actualDistance,
      'stats.actualDuration': actualDuration,
      'stats.avgSpeed': avgSpeed,
      'stats.co2Emission': Math.round((actualDistance / 1000) * 120)
    },
    { new: true }
  );
  if (trip) {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalTrips': 1, 'stats.totalDistance': actualDistance || trip.route.distance }
    });
  }
  res.json({ success: true, data: trip, message: 'Perjalanan selesai!' });
}));

// Rating perjalanan
router.post('/:id/rate', asyncHandler(async (req, res) => {
  const { score, comment } = req.body;
  if (!score || score < 1 || score > 5) return res.status(400).json({ success: false, message: 'Rating 1-5.' });
  await Trip.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { rating: { score, comment, ratedAt: new Date() } });
  res.json({ success: true, message: 'Terima kasih atas rating Anda!' });
}));

module.exports = router;
