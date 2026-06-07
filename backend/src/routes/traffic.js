// routes/traffic.js – Data lalu lintas dinamis berdasarkan GPS pengguna
// FIXED: Semua koordinat sekarang di-generate RELATIF terhadap lokasi GPS pengguna.
// Tidak ada lagi hardcoded kota/koordinat tertentu.
const express = require('express');
const router  = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

// ── Offset relatif dari posisi GPS pengguna ───────────────────────────
// Merepresentasikan pola lalu lintas kota umum:
// persimpangan utama, jalan arteri, pusat komersial, kawasan perumahan, dll.
const HOTSPOT_OFFSETS = [
  { name: 'Persimpangan Utama',      dlat:  0.000,  dlng:  0.000,  baseCongestion: 0.85 },
  { name: 'Jalan Arteri Utara',      dlat:  0.012,  dlng:  0.002,  baseCongestion: 0.80 },
  { name: 'Pusat Kota',              dlat: -0.005,  dlng: -0.008,  baseCongestion: 0.90 },
  { name: 'Kawasan Timur',           dlat:  0.008,  dlng:  0.015,  baseCongestion: 0.65 },
  { name: 'Simpang Selatan',         dlat: -0.011,  dlng: -0.006,  baseCongestion: 0.75 },
  { name: 'Jalan Lingkar',           dlat:  0.020,  dlng:  0.004,  baseCongestion: 0.58 },
  { name: 'Area Komersial',          dlat: -0.003,  dlng: -0.016,  baseCongestion: 0.78 },
  { name: 'Kawasan Industri',        dlat:  0.025,  dlng: -0.012,  baseCongestion: 0.68 },
  { name: 'Jalan Utama Barat Daya',  dlat: -0.016,  dlng:  0.010,  baseCongestion: 0.72 },
  { name: 'Simpang Timur Laut',      dlat:  0.006,  dlng:  0.022,  baseCongestion: 0.55 },
  { name: 'Kawasan Perumahan',       dlat: -0.022,  dlng: -0.004,  baseCongestion: 0.60 },
  { name: 'Jalan Bypass',            dlat:  0.028,  dlng:  0.026,  baseCongestion: 0.45 },
];

const FLOOD_OFFSETS = [
  { name: 'Dataran Rendah Terdekat', dlat: -0.009, dlng:  0.005, risk: 'tinggi' },
  { name: 'Kawasan Sempadan Sungai', dlat:  0.013, dlng: -0.007, risk: 'tinggi' },
  { name: 'Area Rawan Genangan',     dlat: -0.018, dlng:  0.012, risk: 'sedang' },
  { name: 'Pinggiran Kota Utara',    dlat:  0.021, dlng:  0.003, risk: 'sedang' },
  { name: 'Kawasan Pinggir',         dlat: -0.030, dlng: -0.018, risk: 'rendah' },
];

const CCTV_OFFSETS = [
  { suffix: 'Simpang Utama',      dlat:  0.000, dlng:  0.000, status: 'online'  },
  { suffix: 'Jalan Arteri A',     dlat:  0.008, dlng: -0.012, status: 'online'  },
  { suffix: 'Pusat Kota Km 1',    dlat: -0.006, dlng:  0.008, status: 'online'  },
  { suffix: 'Kawasan Selatan',    dlat: -0.011, dlng: -0.006, status: 'online'  },
  { suffix: 'Area Komersial',     dlat: -0.003, dlng: -0.016, status: 'offline' },
  { suffix: 'Jalan Lingkar',      dlat:  0.020, dlng:  0.004, status: 'online'  },
];

// ── Hitung congestion berdasarkan waktu & hari ────────────────────────
function calcCongestion(base, hour, dow) {
  const isWeekend = dow === 0 || dow === 6;
  let m = 0.6;
  if (!isWeekend) {
    if (hour >= 7  && hour <= 9)  m = 1.0;
    if (hour >= 11 && hour <= 13) m = 0.82;
    if (hour >= 16 && hour <= 19) m = 1.0;
    if (hour >= 20 || hour <= 5)  m = 0.3;
    if (hour >= 10 && hour <= 11) m = 0.65;
    if (hour >= 13 && hour <= 16) m = 0.70;
  } else {
    if (hour >= 10 && hour <= 14) m = 0.75;
    if (hour >= 15 && hour <= 18) m = 0.68;
    if (hour >= 20 || hour <= 6)  m = 0.25;
  }
  return Math.min(1, Math.max(0.1, base * m));
}

function toLevel(c) {
  if (c >= 0.80) return { level: 'macet',  color: '#D95050', speed: Math.floor(3  + c * 5) };
  if (c >= 0.60) return { level: 'padat',  color: '#C47F20', speed: Math.floor(10 + (1-c) * 20) };
  if (c >= 0.35) return { level: 'sedang', color: '#C8A800', speed: Math.floor(25 + (1-c) * 30) };
  return              { level: 'lancar', color: '#1FAD8E', speed: Math.floor(45 + (1-c) * 35) };
}

// ── Incident berdasarkan waktu (stabil, bukan random) ─────────────────
function getIncidents(hour, baseLat, baseLng) {
  const inc = [];
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
    inc.push({
      id: 'inc-001', type: 'accident', severity: 'minor',
      description: 'Kecelakaan minor, 1 lajur tertutup',
      lat: baseLat - 0.008, lng: baseLng + 0.009,
      street: 'Jalan Arteri Utama',
      reportedAt: new Date(Date.now() - 1200000),
    });
  }
  if (hour >= 15 && hour <= 20) {
    inc.push({
      id: 'inc-002', type: 'flood', severity: 'moderate',
      description: 'Genangan air 15-25 cm, waspadai saat hujan',
      lat: baseLat - 0.009, lng: baseLng + 0.005,
      street: 'Kawasan Dataran Rendah',
      reportedAt: new Date(Date.now() - 2700000),
    });
  }
  inc.push({
    id: 'inc-003', type: 'construction', severity: 'minor',
    description: 'Perbaikan jalan, kecepatan maks 20 km/h',
    lat: baseLat - 0.003, lng: baseLng - 0.016,
    street: 'Area Komersial',
    reportedAt: new Date(Date.now() - 7200000),
  });
  return inc;
}

// ── GET /api/traffic ──────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const now  = new Date();
  const hour = now.getHours();
  const dow  = now.getDay();

  // Wajib dari GPS pengguna, tidak ada default kota tertentu
  const userLat = parseFloat(req.query.lat);
  const userLng = parseFloat(req.query.lng);

  if (isNaN(userLat) || isNaN(userLng)) {
    return res.status(400).json({ success: false, message: 'Parameter lat dan lng wajib diisi dari GPS pengguna.' });
  }

  // Generate hotspot relatif dari posisi GPS pengguna
  const hotspots = HOTSPOT_OFFSETS.map(o => {
    const congestion = calcCongestion(o.baseCongestion, hour, dow);
    const { level, color, speed } = toLevel(congestion);
    return {
      name:       o.name,
      lat:        +(userLat + o.dlat).toFixed(6),
      lng:        +(userLng + o.dlng).toFixed(6),
      congestion: Math.round(congestion * 100),
      level, color, speed,
    };
  });

  const floodZones = FLOOD_OFFSETS.map(o => ({
    name: o.name,
    lat:  +(userLat + o.dlat).toFixed(6),
    lng:  +(userLng + o.dlng).toFixed(6),
    risk: o.risk,
  }));

  const cctvPoints = CCTV_OFFSETS.map((o, i) => ({
    id:     `cctv-0${i + 1}`,
    name:   o.suffix,
    lat:    +(userLat + o.dlat).toFixed(6),
    lng:    +(userLng + o.dlng).toFixed(6),
    status: o.status,
  }));

  const sorted = [...hotspots].sort((a, b) => b.congestion - a.congestion);
  const avg    = Math.round(hotspots.reduce((s, h) => s + h.congestion, 0) / hotspots.length);
  const overall= toLevel(avg / 100).level;

  res.json({
    success: true,
    data: {
      overall, avgCongestion: avg, updatedAt: now,
      userLocation: { lat: userLat, lng: userLng },
      hotspots:    sorted,
      floodZones,
      cctvPoints,
      incidents:   getIncidents(hour, userLat, userLng),
      heatmapPoints: hotspots.map(h => ({
        lat: h.lat, lng: h.lng,
        intensity: h.congestion / 100,
        name: h.name, level: h.level,
        color: h.color, speed: h.speed,
        radius: 300 + (h.congestion / 100) * 400,
      })),
      isRushHour: avg > 65,
    },
  });
}));

module.exports = router;
