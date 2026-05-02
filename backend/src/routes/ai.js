const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const { asyncHandler } = require('../middleware/errorHandler');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

async function generate(prompt, systemInstruction, isJson = false) {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: isJson ? 500 : 400,
      ...(isJson && { response_format: { type: 'json_object' } })
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('Groq API error:', err.message);
    if (isJson) return JSON.stringify({ error: true, message: 'AI sedang sibuk, coba lagi nanti.' });
    return 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi nanti.';
  }
}

// ============ AI CHAT (dengan konteks real-time) ============
// Ganti endpoint /chat yang lama dengan ini
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, history = [], context = {} } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });

  const hour = new Date().getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

  const systemInstruction = `Kamu adalah RouteAI, asisten navigasi AI canggih untuk Indonesia, khususnya ${context.city || 'sekitar lokasi pengguna'}.

KONTEKS REAL-TIME:
- Waktu: ${new Date().toLocaleString('id-ID')}
- Lalu lintas: ${isRushHour ? 'JAM SIBUK - padat' : 'Normal'}
- Cuaca: ${context.weather || 'Berawan, 31°C, potensi hujan'}
- Lokasi pengguna: ${context.userLocation || 'tidak diketahui'}
- Kendaraan: ${context.vehicle || 'Mobil bensin'}
${context.activeRoute ? `- Rute aktif: ${context.activeRoute.from} → ${context.activeRoute.to}, ${context.activeRoute.distance} km` : ''}

GAYA KOMUNIKASI: Ramah, ringkas (max 120 kata), informatif, bahasa Indonesia natural. 
Jika pengguna bertanya arah, rute, atau navigasi ke suatu tempat, kamu harus memberikan jawaban dan AKHIRI dengan JSON navigasi: {"reply":"teks jawaban","navigateTo":"Nama Tempat"}
Contoh: {"reply":"Jalan terbaik ke Podomoro City adalah...","navigateTo":"Podomoro City Medan"}
Jika tidak ada permintaan navigasi, jawab dengan format: {"reply":"teks jawaban"}`;

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-8),
    { role: 'user', content: message }
  ];

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' }  // wajibkan JSON
    });
    const aiText = response.choices[0].message.content;
    const parsed = JSON.parse(aiText);
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('AI error:', err.message);
    // Fallback jika parsing gagal
    res.json({
      success: true,
      data: {
        reply: 'Maaf, saya tidak dapat memproses permintaan saat ini.',
        navigateTo: null
      }
    });
  }
}));

// ============ ANALISIS RUTE ============
router.post('/analyze-route', asyncHandler(async (req, res) => {
  const { route, origin, destination, vehicle } = req.body;
  const dk = (route.distance / 1000).toFixed(1);
  const dm = Math.round(route.duration / 60);

  const prompt = `Analisis rute:
- Dari: ${origin} ke ${destination}
- Jarak: ${dk} km, Estimasi: ${dm} menit
- Kendaraan: ${vehicle || 'Mobil'}
- Waktu: ${new Date().toLocaleTimeString('id-ID')}

Berikan analisis SINGKAT (3 kalimat) dalam bahasa Indonesia:
1. Kondisi rute saat ini
2. Peringatan utama
3. Saran praktis.`;

  const analysis = await generate(prompt, 'Kamu analis navigasi singkat. Bahasa Indonesia. Langsung ke inti.', false);
  res.json({ success: true, data: { analysis } });
}));

// ============ PREDIKSI KEMACETAN ============
router.post('/predict-traffic', asyncHandler(async (req, res) => {
  const { area = 'Palembang', timeRange = 60 } = req.body;
  const prompt = `Prediksi kemacetan untuk ${area} dalam ${timeRange} menit. Waktu sekarang: ${new Date().toLocaleString('id-ID')}.
Keluarkan HANYA JSON:
{
  "level": "lancar|sedang|padat|macet",
  "confidence": 85,
  "peakTime": "17:30",
  "description": "deskripsi singkat",
  "recommendation": "saran"
}`;

  const pred = await generate(prompt, 'Kamu prediktor lalu lintas. Jawab dengan JSON.', true);
  res.json({ success: true, data: JSON.parse(pred) });
}));

// ============ REKOMENDASI DRIVER ============
router.post('/driver-recommendation', asyncHandler(async (req, res) => {
  const { currentLocation = 'Pusat Kota', currentEarnings = 0, timeOfDay } = req.body;
  const prompt = `Rekomendasikan 3 area terbaik untuk mencari penumpang di Palembang. 
Data driver: Lokasi ${currentLocation}, pendapatan Rp ${currentEarnings}, waktu ${timeOfDay || new Date().getHours() + ':00'}.
Format JSON:
{
  "recommendations": [
    { "area": "Nama", "demand": "Tinggi", "estimatedWait": "2-3 menit", "potentialEarning": "Rp 25.000-40.000/jam", "reason": "alasan", "distance": "1.2 km" }
  ],
  "tip": "saran strategi"
}`;

  const rec = await generate(prompt, 'Kamu analis demand driver ojek online. Jawab dengan JSON.', true);
  res.json({ success: true, data: JSON.parse(rec) });
}));

// ============ ECO SCORING ============
router.post('/eco-score', asyncHandler(async (req, res) => {
  const { distance, routeType, vehicle } = req.body;
  const prompt = `Hitung eco score:
- Jarak: ${distance / 1000} km, Jenis: ${routeType}, Kendaraan: ${vehicle}
Format JSON: {"score": 75, "co2kg": 1.2, "grade": "B", "tips": ["tip1", "tip2"]}`;

  const eco = await generate(prompt, 'Kamu kalkulator eco score kendaraan. Jawab dengan JSON.', true);
  res.json({ success: true, data: JSON.parse(eco) });
}));

module.exports = router;

router.post('/best-route', asyncHandler(async (req, res) => {
  const { origin, destination, vehicle, weather, traffic, timeOfDay } = req.body;
  // Menggunakan AI untuk memilih rute terbaik
  const prompt = `Berdasarkan data:
- Cuaca: ${weather.temp}°C, ${weather.desc}, hujan: ${weather.rain}
- Lalu lintas: ${traffic.level} di area ${traffic.area}
- Waktu: ${timeOfDay}
Pilih rekomendasi rute antara "fastest", "eco", atau "no_toll" dan berikan alasan singkat (1 kalimat).
Format JSON: { "recommended": "fastest", "reason": "..." }`;
  const result = await generate(prompt, 'Ahli navigasi', true);
  res.json({ success: true, data: JSON.parse(result) });
}));

router.post('/best-route', asyncHandler(async (req, res) => {
  const { origin, destination, vehicle, weather, traffic, timeOfDay } = req.body;
  let prompt = `Rekomendasikan tipe rute ("fastest", "eco", "no_toll") untuk perjalanan dari ${origin.name} ke ${destination.name}. 
Cuaca: ${weather.temp}°C, ${weather.desc}, hujan: ${weather.rain ? 'ya' : 'tidak'}.
Lalu lintas: ${traffic.level}.
Waktu: ${timeOfDay}:00.
Berikan JSON {"recommended": "fastest", "reason": "alasan singkat"}.`;
  const rec = await generate(prompt, 'Kamu ahli navigasi. Pilih rute terbaik.', true);
  res.json({ success: true, data: JSON.parse(rec) });
}));