// routes/driver.js – Driver API dengan area demand dinamis dari GPS
// FIXED: Area demand sekarang relatif terhadap lokasi GPS driver, bukan hardcoded Palembang.
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// Offset area demand relatif dari posisi GPS driver
const DEMAND_OFFSETS = [
  { name: 'Pusat Kota',        dlat:  0.000,  dlng:  0.000,  baseScore: 95 },
  { name: 'Area Komersial',    dlat: -0.005,  dlng: -0.008,  baseScore: 90 },
  { name: 'Kawasan Bisnis',    dlat:  0.008,  dlng:  0.012,  baseScore: 80 },
  { name: 'Area Perumahan',    dlat: -0.015,  dlng:  0.006,  baseScore: 75 },
  { name: 'Kawasan Industri',  dlat:  0.020,  dlng: -0.010,  baseScore: 60 },
];

router.patch('/status', asyncHandler(async (req, res) => {
  const { isOnline, lat, lng } = req.body;
  await User.findByIdAndUpdate(req.user._id, {
    'driverInfo.isOnline':            isOnline,
    'driverInfo.currentLocation.lat': lat,
    'driverInfo.currentLocation.lng': lng,
  });
  if (req.io) req.io.emit('driver_status_change', { driverId: req.user._id, isOnline, lat, lng });
  res.json({ success: true, message: `Status driver: ${isOnline ? 'Online 🟢' : 'Offline ⚫'}` });
}));

router.get('/demand', asyncHandler(async (req, res) => {
  const hour     = new Date().getHours();
  const dow      = new Date().getDay();
  const isRush   = (dow !== 0 && dow !== 6) && ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19));
  const isWeekend= dow === 0 || dow === 6;

  // Ambil lokasi driver (dari body atau dari DB)
  const driver = req.user;
  const driverLat = driver.driverInfo?.currentLocation?.lat || parseFloat(req.query.lat) || null;
  const driverLng = driver.driverInfo?.currentLocation?.lng || parseFloat(req.query.lng) || null;

  const areas = DEMAND_OFFSETS.map((o, i) => {
    const demandScore = Math.min(100, Math.max(10, o.baseScore * (isRush ? 1.0 : isWeekend ? 0.7 : 0.6)));
    return {
      name:          o.name,
      lat:           driverLat  != null ? +(driverLat  + o.dlat).toFixed(6) : null,
      lng:           driverLng  != null ? +(driverLng  + o.dlng).toFixed(6) : null,
      demand:        Math.round(isRush ? 150 - i * 22 : 55 - i * 8),
      activeDrivers: Math.round(isRush ? 7 - i : 18 - i * 2),
      demandScore:   Math.round(demandScore),
    };
  });

  res.json({
    success: true,
    data: {
      areas,
      peakHours: [
        { time: '07:00-09:00', level: 'tinggi',       earning: 'Rp 40.000-60.000/jam' },
        { time: '12:00-13:00', level: 'sedang',       earning: 'Rp 25.000-35.000/jam' },
        { time: '17:00-19:00', level: 'sangat_tinggi',earning: 'Rp 55.000-80.000/jam' },
      ],
      currentLevel: isRush ? 'padat' : 'sedang',
      updatedAt: new Date(),
    },
  });
}));

router.get('/earnings', asyncHandler(async (req, res) => {
  const day         = new Date().getDay();
  const baseEarning = 150000 + (day * 8000);
  const driverInfo  = req.user.driverInfo || {};
  res.json({
    success: true,
    data: {
      today:            baseEarning + 37000,
      yesterday:        baseEarning - 12000,
      thisWeek:         baseEarning * 5 + 280000,
      avgPerTrip:       Math.round((baseEarning + 37000) / 14),
      tripCount:        14,
      rating:           driverInfo.rating || 4.9,
      estimatedEvening: 95000,
    },
  });
}));

module.exports = router;
