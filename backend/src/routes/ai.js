// routes/ai.js – RouteAI AI Integration (Groq/llama-3.3-70b)
// FIX: Menambahkan field "origin" dan "navigateTo" dalam respons.
//      Prompt ditingkatkan untuk menangkap "dari X ke Y".

const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');
const rateLimit = require('express-rate-limit');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Groq client ──────────────────────────────────────────────────────
let _groq = null;
const getGroq = () => {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY tidak dikonfigurasi. Tambahkan ke file .env");
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
};
const MODEL = 'llama-3.3-70b-versatile';

// ── AI-specific rate limiter ──────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Terlalu banyak permintaan AI. Tunggu 1 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(aiLimiter);

// ── Fungsi pembantu: panggil Groq ─────────────────────────────────────
async function generate(prompt, systemInstruction, isJson = false) {
  try {
    const response = await getGroq().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.7,
      max_tokens: isJson ? 800 : 600,
      ...(isJson && { response_format: { type: 'json_object' } }),
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('[Groq] generate error:', err.message);
    if (isJson) return JSON.stringify({ error: true, message: 'AI sedang sibuk, coba lagi nanti.' });
    return 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi nanti.';
  }
}

// ── Fungsi pembantu: parse JSON dengan fallback ────────────────────────
function safeParseJSON(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
    console.error('[Groq] JSON parse failed for:', str.slice(0, 200));
    return fallback;
  }
}

// ============ AI CHAT ============
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, history = [], context = {} } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
  }

  const hour = new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

  const systemInstruction = `Kamu adalah RouteAI, asisten navigasi AI cerdas untuk Indonesia.

KONTEKS REAL-TIME:
- Waktu: ${new Date().toLocaleString('id-ID')}
- Kota pengguna: ${context.city || 'tidak diketahui'}
- Koordinat pengguna: ${context.userLocation || 'tidak diketahui'}
- Lalu lintas: ${isRushHour ? 'JAM SIBUK — padat' : 'Normal'}
- Cuaca: ${context.weather || 'Berawan'}
- Kendaraan: ${context.vehicle || 'Mobil'}
${context.activeRoute ? '- Rute aktif: menuju ' + context.activeRoute.to : ''}

PANDUAN NAVIGASI — SANGAT PENTING:
Jika pengguna meminta navigasi/arah ke suatu tempat, kamu WAJIB mengembalikan data lokasi TERSTRUKTUR dan SPESIFIK:
- "navigateTo"   : nama tujuan PERSIS seperti yang diucapkan user (jangan ubah/translate)
- "origin"       : jika user menyebutkan titik awal, misal "dari Sun Plaza", "dari rumah", "dari kantor", isi dengan nama tempat tersebut. Jika tidak disebutkan, kosongkan atau null.
- "locationType" : kategori OSM yang tepat (hospital, mall, restaurant, school, mosque, airport, hotel, market, bank, pharmacy, park, station, university, supermarket, cafe, gas_station)  
- "locationCity" : nama kota tempat itu berada (gunakan konteks dari kota pengguna jika tidak disebutkan user)
- "locationHint" : alamat/petunjuk tambahan jika user menyebutkannya (misal: "dekat alun-alun", "di jalan sudirman")

CONTOH RESPONS NAVIGASI YANG BENAR:
User: "saya ingin ke mall podomoro, tapi titik awal dari sun plaza"
JSON: {"reply":"Oke, saya akan cari rute dari Sun Plaza ke Mall Podomoro.","navigateTo":"Mall Podomoro","origin":"Sun Plaza","locationType":"mall","locationCity":"${context.city || 'Indonesia'}","locationHint":""}

User: "Antar aku ke RS Umum terdekat"
JSON: {"reply":"Mencari rumah sakit umum terdekat dari lokasi Anda...","navigateTo":"Rumah Sakit Umum","origin":null,"locationType":"hospital","locationCity":"${context.city || 'Indonesia'}","locationHint":""}

User: "Mau ke McDonalds"  
JSON: {"reply":"Oke, mencari McDonald's terdekat!","navigateTo":"McDonald's","origin":null,"locationType":"fast_food","locationCity":"${context.city || 'Indonesia'}","locationHint":""}

User: "Ke Stasiun Gambir dong"
JSON: {"reply":"Siap, membuat rute ke Stasiun Gambir!","navigateTo":"Stasiun Gambir","origin":null,"locationType":"station","locationCity":"Jakarta","locationHint":""}

ATURAN PENTING:
- Jika TIDAK ada navigasi: {"reply":"jawaban"}
- Jika ADA navigasi: WAJIB sertakan navigateTo, locationType, locationCity
- locationCity harus spesifik (ambil dari konteks percakapan atau kota pengguna)
- Jawaban reply: ramah, singkat (max 80 kata), bahasa Indonesia natural
- Jika user menyebutkan titik awal (dari ...), masukkan ke field "origin". Jika tidak, origin = null.`;

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const response = await getGroq().chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const aiText = response.choices[0].message.content;
    const parsed = safeParseJSON(aiText, { reply: 'Maaf, saya tidak dapat memproses permintaan saat ini.' });

    // KIRIM SEMUA FIELD ke frontend
    res.json({
      success: true,
      data: {
        reply: parsed.reply || aiText,
        navigateTo: parsed.navigateTo || null,
        origin: parsed.origin || null,
        locationType: parsed.locationType || null,
        locationCity: parsed.locationCity || null,
        locationHint: parsed.locationHint || null,
      }
    });
  } catch (err) {
    console.error('[Groq] chat error:', err.message);
    res.json({
      success: true,
      data: {
        reply: 'Maaf, layanan AI sedang sibuk. Coba lagi nanti.',
        navigateTo: null,
        origin: null,
        locationType: null,
        locationCity: null,
        locationHint: null,
      },
    });
  }
}));

// ============ ANALISIS RUTE ============
router.post('/analyze-route', asyncHandler(async (req, res) => {
  const { route, origin, destination, vehicle } = req.body;
  if (!route || !destination) {
    return res.status(400).json({ success: false, message: 'Data rute tidak lengkap.' });
  }
  const dk = ((route.distance || 0) / 1000).toFixed(1);
  const dm = Math.round((route.duration || 0) / 60);

  const prompt = `Analisis rute:
- Dari: ${origin || 'Asal'} ke ${destination}
- Jarak: ${dk} km, Estimasi: ${dm} menit
- Kendaraan: ${vehicle || 'Mobil'}
- Waktu: ${new Date().toLocaleTimeString('id-ID')}

Berikan analisis SINGKAT (3 kalimat) dalam bahasa Indonesia:
1. Kondisi rute saat ini
2. Peringatan utama (kemacetan, cuaca, dll)
3. Saran praktis untuk pengemudi.`;

  const analysis = await generate(
    prompt,
    'Kamu analis navigasi ringkas. Bahasa Indonesia. Langsung ke inti, maksimal 3 kalimat.',
    false,
  );

  res.json({ success: true, data: { analysis } });
}));

// ============ PREDIKSI KEMACETAN ============
router.post('/predict-traffic', asyncHandler(async (req, res) => {
  const { area = 'Kota Anda', timeRange = 60 } = req.body;
  const prompt = `Prediksi kemacetan untuk ${area} dalam ${timeRange} menit ke depan.
Waktu sekarang: ${new Date().toLocaleString('id-ID')}.
Keluarkan HANYA JSON valid:
{
  "level": "lancar",
  "confidence": 85,
  "peakTime": "17:30",
  "description": "deskripsi singkat kondisi lalu lintas",
  "recommendation": "saran tindakan untuk pengemudi"
}
Pilih level dari: lancar, sedang, padat, macet.`;

  const pred = await generate(prompt, 'Kamu prediktor lalu lintas Indonesia. Jawab hanya dengan JSON valid.', true);
  const data  = safeParseJSON(pred, {
    level: 'sedang', confidence: 70,
    peakTime: '17:30', description: 'Data AI tidak tersedia saat ini.',
    recommendation: 'Pantau kondisi lalu lintas secara langsung.',
  });
  res.json({ success: true, data });
}));

// ============ REKOMENDASI DRIVER ============
router.post('/driver-recommendation', asyncHandler(async (req, res) => {
  const { currentLocation = 'Pusat Kota', currentEarnings = 0, timeOfDay, city = 'kota Anda' } = req.body;
  const prompt = `Rekomendasikan 3 area terbaik untuk mencari penumpang di sekitar ${city}.
Data driver: Lokasi ${currentLocation}, pendapatan hari ini Rp ${currentEarnings.toLocaleString()}, \
waktu ${timeOfDay || new Date().getHours() + ':00'}.
Format JSON valid:
{
  "recommendations": [
    {
      "area": "Nama Area",
      "demand": "Tinggi",
      "estimatedWait": "2-3 menit",
      "potentialEarning": "Rp 25.000-40.000/jam",
      "reason": "alasan singkat",
      "distance": "1.2 km"
    }
  ],
  "tip": "saran strategi hari ini"
}`;

  const rec  = await generate(prompt, `Kamu analis demand driver ojek online di ${city}. Jawab dengan JSON valid.`, true);
  const data = safeParseJSON(rec, {
    recommendations: [
      { area: currentLocation, demand: 'Sedang', estimatedWait: '5-10 menit',
        potentialEarning: 'Rp 20.000-30.000/jam', reason: 'Area asal Anda', distance: '0 km' },
    ],
    tip: 'Pantau area pusat kota untuk permintaan lebih tinggi.',
  });
  res.json({ success: true, data });
}));

// ============ ECO SCORING ============
router.post('/eco-score', asyncHandler(async (req, res) => {
  const { distance, routeType, vehicle } = req.body;
  if (!distance) return res.status(400).json({ success: false, message: 'Jarak wajib diisi.' });

  const prompt = `Hitung eco score kendaraan:
- Jarak: ${(distance / 1000).toFixed(1)} km
- Jenis rute: ${routeType || 'fastest'}
- Kendaraan: ${vehicle || 'Mobil bensin'}
Format JSON valid: {"score": 75, "co2kg": 1.2, "grade": "B", "tips": ["tip1", "tip2", "tip3"]}
Score 0-100 (100 paling ramah lingkungan). Grade: A+, A, B, C, D.`;

  const eco  = await generate(prompt, 'Kamu kalkulator eco score kendaraan. Jawab dengan JSON valid.', true);
  const data = safeParseJSON(eco, {
    score: Math.min(100, Math.max(20, 100 - Math.floor((distance / 1000) * 115 / 500 * 100))),
    co2kg: parseFloat(((distance / 1000) * 0.115).toFixed(2)),
    grade: 'B',
    tips: ['Gunakan rute eco untuk hemat BBM', 'Pertahankan kecepatan konstan', 'Hindari rem mendadak'],
  });
  res.json({ success: true, data });
}));

// ============ REKOMENDASI RUTE TERBAIK ============
router.post('/best-route', asyncHandler(async (req, res) => {
  const { origin, destination, vehicle, weather, traffic, timeOfDay } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ success: false, message: 'Origin dan destination wajib.' });
  }

  const weatherStr = weather
    ? `${weather.temp || 31}°C, ${weather.desc || 'cerah'}, hujan: ${weather.rain ? 'ya' : 'tidak'}`
    : '31°C, cerah, tidak hujan';

  const trafficStr = traffic?.level || 'sedang';

  const prompt = `Rekomendasikan tipe rute terbaik untuk perjalanan dari "${origin.name || 'Asal'}" ke \
"${destination.name || 'Tujuan'}".

Kondisi saat ini:
- Cuaca: ${weatherStr}
- Lalu lintas: ${trafficStr}
- Waktu: ${timeOfDay !== undefined ? timeOfDay + ':00' : new Date().toLocaleTimeString('id-ID')}
- Kendaraan: ${vehicle || 'Mobil'}

Pilih salah satu dari tiga opsi rute:
- "fastest": rute tercepat meski macet
- "eco": rute hemat BBM & CO2
- "no_toll": menghindari jalan tol

Format JSON valid: {"recommended": "fastest", "reason": "alasan singkat satu kalimat"}`;

  const rec  = await generate(prompt, 'Kamu ahli navigasi Indonesia. Pilih rute terbaik berdasarkan kondisi.', true);
  const data = safeParseJSON(rec, { recommended: 'fastest', reason: 'Rute tercepat dipilih sebagai default.' });

  const valid = ['fastest', 'eco', 'no_toll'];
  if (!valid.includes(data.recommended)) data.recommended = 'fastest';

  res.json({ success: true, data });
}));

// ============ HEALTH CHECK AI ============
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      model: MODEL,
      provider: 'Groq',
      status: process.env.GROQ_API_KEY ? 'configured' : 'missing_api_key',
      endpoints: ['/chat', '/analyze-route', '/predict-traffic', '/driver-recommendation', '/eco-score', '/best-route'],
    },
  });
}));

module.exports = router;