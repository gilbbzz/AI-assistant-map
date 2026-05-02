// routes/driver.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// Update status online/offline driver
router.patch('/status', asyncHandler(async (req, res) => {
  const { isOnline, lat, lng } = req.body;
  await User.findByIdAndUpdate(req.user._id, {
    'driverInfo.isOnline': isOnline,
    'driverInfo.currentLocation': { lat, lng }
  });
  if (req.io) req.io.emit('driver_status_change', { driverId: req.user._id, isOnline, lat, lng });
  res.json({ success: true, message: `Status: ${isOnline ? 'Online' : 'Offline'}` });
}));

// Data demand area untuk driver
router.get('/demand', asyncHandler(async (req, res) => {
  const hour = new Date().getHours();
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  res.json({
    success: true,
    data: {
      areas: [
        { name: 'Ilir Barat I', demand: isRush ? 147 : 45, activeDrivers: isRush ? 8 : 25, demandScore: 95, lat: -2.9761, lng: 104.7754 },
        { name: 'Bukit Besar', demand: isRush ? 98 : 32, activeDrivers: isRush ? 12 : 18, demandScore: 75, lat: -2.9600, lng: 104.7563 },
        { name: 'Seberang Ulu I', demand: isRush ? 76 : 28, activeDrivers: 5, demandScore: 85, lat: -3.0100, lng: 104.7700 },
        { name: 'Plaju', demand: 54, activeDrivers: 9, demandScore: 55, lat: -2.9950, lng: 104.8100 },
        { name: 'Palembang Trade Center', demand: isRush ? 120 : 60, activeDrivers: isRush ? 6 : 20, demandScore: 90, lat: -2.9690, lng: 104.7391 }
      ],
      peakHours: [
        { time: '07:00-09:00', level: 'tinggi', earning: 'Rp 40.000-60.000/jam' },
        { time: '12:00-13:00', level: 'sedang', earning: 'Rp 25.000-35.000/jam' },
        { time: '17:00-19:00', level: 'sangat_tinggi', earning: 'Rp 55.000-80.000/jam' }
      ],
      updatedAt: new Date()
    }
  });
}));

// Earnings heatmap
router.get('/earnings', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      today: 187000,
      yesterday: 167000,
      thisWeek: 1250000,
      avgPerTrip: 28000,
      totalTrips: 14,
      byHour: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        earning: (h >= 7 && h <= 9) || (h >= 17 && h <= 19) ? Math.floor(Math.random() * 30000 + 40000) : Math.floor(Math.random() * 15000 + 10000)
      }))
    }
  });
}));

module.exports = router;
