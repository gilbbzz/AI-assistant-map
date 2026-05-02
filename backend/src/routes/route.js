// routes/route.js - Kalkulasi rute dengan OSRM + Nominatim (diperkuat)
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Trip = require('../models/Trip');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto = require('crypto');

const OSRM = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const NOMINATIM = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

// ============ GEOCODING – Cari tempat (dengan fallback Overpass) ============
// ============ GEOCODING – Cari tempat (dengan fallback Overpass) ============
router.get('/search', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ success: false, message: 'Query terlalu pendek.' });

  // 1. Coba Nominatim
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { format: 'json', q: `${q}, Indonesia`, limit, addressdetails: 1, 'accept-language': 'id', countrycodes: 'id' },
      headers: { 'User-Agent': 'RouteAI-App/1.0' },
      timeout: 5000
    });
    if (response.data?.length > 0) {
      const results = response.data.map(r => ({
        id: r.place_id, name: r.display_name.split(',')[0],
        address: r.display_name.split(',').slice(1,4).join(',').trim(),
        fullAddress: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon),
        type: r.type, category: r.class
      }));
      return res.json({ success: true, data: results });
    }
  } catch (err) {
    console.warn('Nominatim gagal, coba Photon...', err.message);
  }

  // 2. Photon
  try {
    const photonRes = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}`, { timeout: 5000 });
    const features = photonRes.data?.features || [];
    if (features.length > 0) {
      const results = features.map(f => ({
        id: f.properties.osm_id,
        name: f.properties.name || f.properties.street || f.properties.city || q,
        address: [f.properties.street, f.properties.city, f.properties.country].filter(Boolean).join(', '),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        type: f.properties.osm_value || 'tempat',
        category: f.properties.osm_key || ''
      }));
      return res.json({ success: true, data: results });
    }
  } catch (err) {
    console.warn('Photon juga gagal, lanjut Overpass...', err.message);
  }

  // 3. Overpass
  try {
    const overpassQuery = `[out:json][timeout:10];(node["name"~"${q}", i];way["name"~"${q}", i];);out center 15;`;
    const overRes = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000
    });
    const elements = (overRes.data?.elements || []).slice(0, limit);
    const results = elements.map(el => ({
      id: el.id, name: el.tags?.name || q,
      address: [el.tags?.['addr:street'], el.tags?.['addr:city'], 'Indonesia'].filter(Boolean).join(', '),
      lat: el.lat || el.center?.lat, lng: el.lon || el.center?.lon,
      type: el.tags?.amenity || 'tempat', category: el.tags?.amenity || ''
    })).filter(r => r.lat && r.lng);
    if (results.length > 0) return res.json({ success: true, data: results });
  } catch (err) {
    console.error('Semua sumber gagal:', err.message);
  }

  res.json({ success: false, message: 'Lokasi tidak ditemukan. Periksa koneksi Anda.', data: [] });
}));
// ============ REVERSE GEOCODING ============
router.get('/reverse', asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'Koordinat wajib diisi.' });
  const response = await axios.get(`${NOMINATIM}/reverse`, {
    params: { format: 'json', lat, lon: lng, 'accept-language': 'id' },
    headers: { 'User-Agent': 'RouteAI-App/1.0' },
    timeout: 5000
  });
  const r = response.data;
  res.json({
    success: true,
    data: {
      name: r.display_name.split(',')[0],
      address: r.display_name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      details: r.address
    }
  });
}));

// Cache rute sederhana
const routeCache = new Map();

// ============ HITUNG RUTE (dengan dukungan multi-tipe) ============
// ============ HITUNG RUTE (dengan dukungan multi-tipe) ============
router.post('/calculate', asyncHandler(async (req, res) => {
  const { origin, destination, waypoints = [], vehicle = 'car' } = req.body;
  if (!origin?.lat || !destination?.lat) {
    return res.status(400).json({ success: false, message: 'Asal dan tujuan wajib diisi.' });
  }

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const profile = vehicle === 'bicycle' ? 'bike' : 'driving';

  // Fungsi pembantu untuk memanggil OSRM
  const fetchOSRM = async (overrides = {}) => {
    const url = `${OSRM}/route/v1/${profile}/${coords}`;
    const params = {
      overview: 'full',
      geometries: 'geojson',
      steps: true,
      annotations: true,
      alternatives: true,
      ...overrides
    };
    const response = await axios.get(url, { params, timeout: 12000 });
    return response.data.routes || [];
  };

  try {
    // 1. Fastest (rute normal)
    const fastestRoutes = await fetchOSRM();
    if (!fastestRoutes.length) {
      return res.status(404).json({ success: false, message: 'Rute tidak ditemukan.' });
    }
    const fastest = fastestRoutes[0];

    // 2. Eco (jarak terpendek dari alternatif)
    const eco = fastestRoutes.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev), fastestRoutes[0]);

    // 3. Tanpa Tol
    let noToll;
    try {
      const noTollRoutes = await fetchOSRM({ exclude: 'toll', alternatives: false });
      if (noTollRoutes.length > 0) {
        noToll = noTollRoutes[0];
      } else {
        noToll = fastest; // fallback jika tidak ada rute tanpa tol
      }
    } catch (err) {
      console.warn('Gagal mendapatkan rute tanpa tol, menggunakan rute tercepat:', err.message);
      noToll = fastest;
    }

    // Fungsi pembangun objek rute
    const buildRoute = (route, type) => ({
      id: type,
      distance: route.distance,
      duration: route.duration,
      distanceKm: (route.distance / 1000).toFixed(1),
      durationMin: Math.round(route.duration / 60),
      eta: new Date(Date.now() + route.duration * 1000).toISOString(),
      etaFormatted: new Date(Date.now() + route.duration * 1000).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
      }),
      geometry: route.geometry,
      steps: route.legs?.flatMap(leg => leg.steps) || [],
      fuelCost: Math.round((route.distance / 1000) * 1350),
      co2: Math.round((route.distance / 1000) * 115),
      ecoScore: Math.min(100, Math.max(10, 100 - Math.floor(((route.distance / 1000) * 115 / 500) * 100))),
      type: type
    });

    const routes = [
      buildRoute(fastest, 'fastest'),
      buildRoute(eco, 'eco'),
      buildRoute(noToll, 'no_toll')
    ];

    // Simpan trip (opsional)
    let tripId = null;
    try {
      const trip = await Trip.create({
        user: req.user._id,
        origin: { name: origin.name || 'Titik Asal', lat: origin.lat, lng: origin.lng },
        destination: { name: destination.name || 'Tujuan', lat: destination.lat, lng: destination.lng },
        route: {
          geometry: fastest.geometry,
          distance: fastest.distance,
          duration: fastest.duration,
          steps: fastest.legs?.[0]?.steps || [],
          routeType: 'fastest'
        },
        estimatedArrival: new Date(Date.now() + fastest.duration * 1000),
        status: 'planned'
      });
      tripId = trip._id;
    } catch (e) {
      console.error('Gagal simpan trip:', e.message);
    }

    res.json({ success: true, data: { routes, tripId, origin, destination } });

  } catch (err) {
    console.error('Gagal menghitung rute:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Gagal menghitung rute. Silakan coba lagi.' });
  }
}));

// ============ MULTI-STOP OPTIMIZER ============
router.post('/optimize-stops', asyncHandler(async (req, res) => {
  const { origin, stops, vehicle = 'car' } = req.body;
  if (!origin || !stops?.length) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
  if (stops.length > 8) return res.status(400).json({ success: false, message: 'Maksimal 8 titik pemberhentian.' });

  const coords = [origin, ...stops].map(p => `${p.lng},${p.lat}`).join(';');
  const resp = await axios.get(`${OSRM}/trip/v1/driving/${coords}`, {
    params: { source: 'first', destination: 'last', roundtrip: false, geometries: 'geojson', steps: true },
    timeout: 10000
  });

  const trip = resp.data.trips?.[0];
  if (!trip) return res.status(404).json({ success: false, message: 'Tidak bisa optimalkan rute.' });

  const order = resp.data.waypoints.map(w => w.waypoint_index);
  res.json({
    success: true,
    data: {
      optimizedOrder: order,
      optimizedStops: order.slice(1).map(i => stops[i - 1]),
      totalDistance: (trip.distance / 1000).toFixed(1),
      totalDuration: Math.round(trip.duration / 60),
      geometry: trip.geometry
    }
  });
}));

// ============ GENERATE LIVE SHARE TOKEN ============
router.post('/share/:tripId', asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, user: req.user._id });
  if (!trip) return res.status(404).json({ success: false, message: 'Perjalanan tidak ditemukan.' });
  const shareToken = crypto.randomBytes(8).toString('hex');
  trip.shareToken = shareToken;
  trip.shareExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await trip.save();
  res.json({
    success: true,
    data: {
      shareUrl: `${process.env.FRONTEND_URL}/live/${shareToken}`,
      shareToken,
      expiresAt: trip.shareExpiry
    }
  });
}));

// ============ CEK LIVE SHARE (tanpa auth) ============
router.get('/live/:token', asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ shareToken: req.params.token, shareExpiry: { $gt: new Date() } }).populate('user', 'name avatar');
  if (!trip) return res.status(404).json({ success: false, message: 'Link tidak valid atau kadaluarsa.' });
  res.json({
    success: true,
    data: {
      origin: trip.origin,
      destination: trip.destination,
      status: trip.status,
      eta: trip.estimatedArrival,
      driver: { name: trip.user.name, avatar: trip.user.avatar }
    }
  });
}));

module.exports = router;