// routes/route.js – Routing & Geocoding dengan location bias
// FIX: /search sekarang menerima lat/lng untuk bias lokasi ke GPS pengguna.
//      Nominatim menggunakan viewbox agar hasil diprioritaskan dekat user.
//      Mengembalikan hingga 5 kandidat beserta jarak dari pengguna.
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const Trip    = require('../models/Trip');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto  = require('crypto');

const OSRM      = process.env.OSRM_BASE_URL      || 'https://router.project-osrm.org';
const NOMINATIM = process.env.NOMINATIM_BASE_URL  || 'https://nominatim.openstreetmap.org';

// ── Hitung jarak dua koordinat (Haversine, km) ────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Format satu hasil geocoding ───────────────────────────────────────
function formatResult(r, userLat, userLng) {
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon || r.lng);
  const nameParts = (r.display_name || '').split(',');
  return {
    id:          r.place_id || r.id,
    name:        nameParts[0]?.trim() || r.name || 'Tempat',
    address:     nameParts.slice(1, 4).join(',').trim(),
    fullAddress: r.display_name || '',
    lat,
    lng,
    type:        r.type     || r.class || 'place',
    category:    r.class    || r.category || '',
    distanceKm:  (userLat && userLng)
      ? parseFloat(haversine(userLat, userLng, lat, lng).toFixed(1))
      : null,
  };
}

// ══════════════════════════════════════════════════════════════════════
// GET /search  — Geocoding dengan location bias
// FIX: Menerima lat, lng, city, locationType untuk hasil yang akurat
// ══════════════════════════════════════════════════════════════════════
router.get('/search', asyncHandler(async (req, res) => {
  const { q, limit = 8, lat, lng, city, locationType } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Query terlalu pendek.' });
  }

  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;

  // Bangun query yang diperkaya dengan konteks lokasi
  let enrichedQuery = q.trim();
  // Tambahkan tipe lokasi jika ada (meningkatkan presisi)
  if (locationType && !enrichedQuery.toLowerCase().includes(locationType.toLowerCase())) {
    enrichedQuery = `${enrichedQuery} ${locationType}`;
  }
  // Tambahkan nama kota jika ada (cegah hasil dari kota lain)
  if (city && !enrichedQuery.toLowerCase().includes(city.toLowerCase())) {
    enrichedQuery = `${enrichedQuery}, ${city}`;
  }

  // Viewbox: kotak ~25km di sekitar pengguna untuk bias lokasi
  const DELTA = 0.25; // ~25km
  const viewbox = (userLat && userLng)
    ? `${userLng - DELTA},${userLat + DELTA},${userLng + DELTA},${userLat - DELTA}`
    : null;

  // ── 1. Nominatim dengan location bias ──────────────────────────────
  try {
    const params = {
      format:          'json',
      q:               enrichedQuery + (city ? '' : ', Indonesia'),
      limit:           Math.min(parseInt(limit), 10),
      addressdetails:  1,
      'accept-language': 'id',
      countrycodes:    'id',
    };
    // Location bias: prefer results inside viewbox
    if (viewbox) {
      params.viewbox = viewbox;
      params.bounded = 0; // 0 = prefer, 1 = strict (kadang terlalu ketat)
    }

    const r1 = await axios.get(`${NOMINATIM}/search`, {
      params, headers: { 'User-Agent': 'RouteAI-App/1.0' }, timeout: 6000,
    });

    if (r1.data?.length > 0) {
      let results = r1.data.map(r => formatResult(r, userLat, userLng));

      // Sort: jika ada koordinat user, urutkan berdasarkan jarak terdekat
      if (userLat && userLng) {
        results.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
      }

      // Filter Indonesia (double-check)
      results = results.filter(r => r.lat >= -11 && r.lat <= 6 && r.lng >= 95 && r.lng <= 141);

      return res.json({ success: true, data: results, source: 'nominatim' });
    }
  } catch (err) {
    console.warn('[Search] Nominatim gagal:', err.message);
  }

  // ── 2. Photon (fallback, dengan bias lokasi) ──────────────────────
  try {
    const photonParams = {
      q:     enrichedQuery,
      limit: Math.min(parseInt(limit), 10),
      lang:  'id',
    };
    if (userLat && userLng) {
      photonParams.lat = userLat;
      photonParams.lon = userLng;
    }

    const r2 = await axios.get('https://photon.komoot.io/api/', {
      params: photonParams, timeout: 6000,
    });

    const features = r2.data?.features || [];
    if (features.length > 0) {
      let results = features.map(f => ({
        id:          f.properties.osm_id,
        name:        f.properties.name || f.properties.street || q,
        address:     [f.properties.street, f.properties.city, f.properties.state]
                       .filter(Boolean).join(', '),
        fullAddress: [f.properties.name, f.properties.street, f.properties.city, 'Indonesia']
                       .filter(Boolean).join(', '),
        lat:         f.geometry.coordinates[1],
        lng:         f.geometry.coordinates[0],
        type:        f.properties.osm_value || 'tempat',
        category:    f.properties.osm_key   || '',
        distanceKm:  (userLat && userLng)
          ? parseFloat(haversine(userLat, userLng, f.geometry.coordinates[1], f.geometry.coordinates[0]).toFixed(1))
          : null,
      })).filter(r => r.lat >= -11 && r.lat <= 6 && r.lng >= 95 && r.lng <= 141);

      if (userLat && userLng) results.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
      return res.json({ success: true, data: results, source: 'photon' });
    }
  } catch (err) {
    console.warn('[Search] Photon gagal:', err.message);
  }

  // ── 3. Overpass (terakhir) ────────────────────────────────────────
  try {
    const safeQ = q.replace(/['"\\]/g, '');
    let areaFilter = userLat && userLng
      ? `(around:25000,${userLat},${userLng})`
      : '(area["ISO3166-1"="ID"])';
    const overpassQ = `[out:json][timeout:12];(node["name"~"${safeQ}",i]${areaFilter};way["name"~"${safeQ}",i]${areaFilter};);out center 8;`;
    const r3 = await axios.post('https://overpass-api.de/api/interpreter', overpassQ, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 12000,
    });
    const els = (r3.data?.elements || []).slice(0, 8);
    if (els.length > 0) {
      let results = els.map(el => ({
        id:         el.id,
        name:       el.tags?.name || q,
        address:    [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') || 'Indonesia',
        fullAddress:[el.tags?.name, el.tags?.['addr:street'], el.tags?.['addr:city'], 'Indonesia'].filter(Boolean).join(', '),
        lat:        el.lat || el.center?.lat,
        lng:        el.lon || el.center?.lon,
        type:       el.tags?.amenity || el.tags?.shop || 'tempat',
        category:   el.tags?.amenity || '',
        distanceKm: (userLat && userLng && (el.lat || el.center?.lat))
          ? parseFloat(haversine(userLat, userLng, el.lat || el.center.lat, el.lon || el.center.lon).toFixed(1))
          : null,
      })).filter(r => r.lat && r.lng);

      if (userLat && userLng) results.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
      return res.json({ success: true, data: results, source: 'overpass' });
    }
  } catch (err) {
    console.error('[Search] Overpass gagal:', err.message);
  }

  res.json({ success: false, message: 'Lokasi tidak ditemukan.', data: [] });
}));

// ══════════════════════════════════════════════════════════════════════
// GET /reverse
// ══════════════════════════════════════════════════════════════════════
router.get('/reverse', asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'Koordinat wajib diisi.' });
  const r = await axios.get(`${NOMINATIM}/reverse`, {
    params: { format: 'json', lat, lon: lng, 'accept-language': 'id' },
    headers: { 'User-Agent': 'RouteAI-App/1.0' }, timeout: 5000,
  });
  const d = r.data;
  res.json({
    success: true,
    data: {
      name:    d.display_name.split(',')[0],
      address: d.display_name,
      lat:     parseFloat(lat), lng: parseFloat(lng),
      details: d.address,
    },
  });
}));

// ── Route cache ───────────────────────────────────────────────────────
const routeCache = new Map();

// ══════════════════════════════════════════════════════════════════════
// POST /calculate
// ══════════════════════════════════════════════════════════════════════
router.post('/calculate', asyncHandler(async (req, res) => {
  const { origin, destination, waypoints = [], vehicle = 'car' } = req.body;
  if (!origin?.lat || !destination?.lat) {
    return res.status(400).json({ success: false, message: 'Asal dan tujuan wajib diisi.' });
  }

  const coords  = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const profile = vehicle === 'bicycle' ? 'bike' : 'driving';

  const fetchOSRM = async (overrides = {}) => {
    const url = `${OSRM}/route/v1/${profile}/${coords}`;
    const params = { overview: 'full', geometries: 'geojson', steps: true, annotations: true, alternatives: true, ...overrides };
    const res = await axios.get(url, { params, timeout: 12000 });
    return res.data.routes || [];
  };

  try {
    const fastestRoutes = await fetchOSRM();
    if (!fastestRoutes.length) return res.status(404).json({ success: false, message: 'Rute tidak ditemukan.' });

    const fastest = fastestRoutes[0];
    const eco     = fastestRoutes.reduce((p, c) => c.distance < p.distance ? c : p, fastest);
    let noToll    = fastest;
    try {
      const nt = await fetchOSRM({ exclude: 'toll', alternatives: false });
      if (nt.length > 0) noToll = nt[0];
    } catch {}

    const buildRoute = (route, type) => ({
      id: type, type,
      distance: route.distance, duration: route.duration,
      distanceKm: (route.distance / 1000).toFixed(1),
      durationMin: Math.round(route.duration / 60),
      eta: new Date(Date.now() + route.duration * 1000).toISOString(),
      etaFormatted: new Date(Date.now() + route.duration * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      geometry: route.geometry,
      steps: route.legs?.flatMap(l => l.steps) || [],
      legs: route.legs || [],
      fuelCost: Math.round((route.distance / 1000) * 1350),
      co2: Math.round((route.distance / 1000) * 115),
      ecoScore: Math.min(100, Math.max(10, 100 - Math.floor(((route.distance / 1000) * 115 / 500) * 100))),
    });

    const routes = [buildRoute(fastest, 'fastest'), buildRoute(eco, 'eco'), buildRoute(noToll, 'no_toll')];

    let tripId = null;
    try {
      const trip = await Trip.create({
        user: req.user._id,
        origin:      { name: origin.name || 'Asal', lat: origin.lat, lng: origin.lng },
        destination: { name: destination.name || 'Tujuan', lat: destination.lat, lng: destination.lng },
        route: { geometry: fastest.geometry, distance: fastest.distance, duration: fastest.duration, steps: fastest.legs?.[0]?.steps || [], routeType: 'fastest' },
        estimatedArrival: new Date(Date.now() + fastest.duration * 1000),
        status: 'planned',
      });
      tripId = trip._id;
    } catch (e) { console.error('[Trip] Gagal simpan:', e.message); }

    res.json({ success: true, data: { routes, tripId, origin, destination } });
  } catch (err) {
    console.error('[Route] Gagal:', err.message);
    res.status(500).json({ success: false, message: 'Gagal menghitung rute. Coba lagi.' });
  }
}));

// ══════════════════════════════════════════════════════════════════════
// POST /optimize-stops
// ══════════════════════════════════════════════════════════════════════
router.post('/optimize-stops', asyncHandler(async (req, res) => {
  const { origin, stops, vehicle = 'car' } = req.body;
  if (!origin || !stops?.length) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
  if (stops.length > 8) return res.status(400).json({ success: false, message: 'Maksimal 8 titik.' });

  const coords = [origin, ...stops].map(p => `${p.lng},${p.lat}`).join(';');
  const resp   = await axios.get(`${OSRM}/trip/v1/driving/${coords}`, {
    params: { source: 'first', destination: 'last', roundtrip: false, geometries: 'geojson', steps: true },
    timeout: 10000,
  });
  const trip = resp.data.trips?.[0];
  if (!trip) return res.status(404).json({ success: false, message: 'Tidak bisa optimalkan rute.' });

  const order = resp.data.waypoints.map(w => w.waypoint_index);
  res.json({ success: true, data: { optimizedOrder: order, optimizedStops: order.slice(1).map(i => stops[i - 1]), totalDistance: (trip.distance / 1000).toFixed(1), totalDuration: Math.round(trip.duration / 60), geometry: trip.geometry } });
}));

// ══════════════════════════════════════════════════════════════════════
// POST /share/:tripId
// ══════════════════════════════════════════════════════════════════════
router.post('/share/:tripId', asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, user: req.user._id });
  if (!trip) return res.status(404).json({ success: false, message: 'Perjalanan tidak ditemukan.' });
  const shareToken = crypto.randomBytes(8).toString('hex');
  trip.shareToken  = shareToken;
  trip.shareExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await trip.save();
  res.json({ success: true, data: { shareUrl: `${process.env.FRONTEND_URL}/live/${shareToken}`, shareToken, expiresAt: trip.shareExpiry } });
}));

// ══════════════════════════════════════════════════════════════════════
// GET /live/:token (tanpa auth – sudah di-handle di server.js)
// ══════════════════════════════════════════════════════════════════════
router.get('/live/:token', asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({ shareToken: req.params.token, shareExpiry: { $gt: new Date() } }).populate('user', 'name avatar');
  if (!trip) return res.status(404).json({ success: false, message: 'Link tidak valid atau kadaluarsa.' });
  res.json({ success: true, data: { origin: trip.origin, destination: trip.destination, status: trip.status, eta: trip.estimatedArrival, driver: { name: trip.user?.name, avatar: trip.user?.avatar } } });
}));

module.exports = router;
