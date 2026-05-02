// routes/traffic.js
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  // Default pusat Indonesia jika tidak ada koordinat
  const centerLat = parseFloat(lat) || -2.5489;
  const centerLng = parseFloat(lng) || 118.0149;

  const hour = new Date().getHours();
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

  // Generate beberapa titik "sekitar" koordinat pengguna
  const generateNearby = (baseLat, baseLng, offset) => ({
    lat: baseLat + (Math.random() - 0.5) * offset,
    lng: baseLng + (Math.random() - 0.5) * offset
  });

  const areas = [
    {
      name: 'Jalan Utama',
      ...generateNearby(centerLat, centerLng, 0.02),
      level: isRush ? 'macet' : 'sedang',
      speed: isRush ? 8 : 35
    },
    {
      name: 'Simpang Pusat',
      ...generateNearby(centerLat, centerLng, 0.015),
      level: isRush ? 'padat' : 'lancar',
      speed: isRush ? 15 : 50
    },
    {
      name: 'Jalan Arteri',
      ...generateNearby(centerLat, centerLng, 0.025),
      level: 'padat',
      speed: 20
    },
    {
      name: 'Lingkar Dalam',
      ...generateNearby(centerLat, centerLng, 0.01),
      level: isRush ? 'macet' : 'padat',
      speed: isRush ? 5 : 25
    },
    {
      name: 'Pusat Kota',
      ...generateNearby(centerLat, centerLng, 0.005),
      level: 'sedang',
      speed: 30
    }
  ];

  res.json({
    success: true,
    data: {
      overall: isRush ? 'padat' : 'sedang',
      updatedAt: new Date(),
      areas,
      incidents: [
        {
          type: 'accident',
          description: 'Kecelakaan minor',
          ...generateNearby(centerLat, centerLng, 0.008),
          reportedAt: new Date(Date.now() - 1800000)
        },
        {
          type: 'flood',
          description: 'Genangan air',
          ...generateNearby(centerLat, centerLng, 0.012),
          reportedAt: new Date(Date.now() - 3600000)
        }
      ]
    }
  });
}));

module.exports = router;