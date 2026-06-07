// routes/weather.js – Cuaca real dari OpenWeatherMap
// FIX: Ditambahkan mapping icon OWM (kode seperti "01d") ke emoji yang benar
//      agar WeatherPanel frontend bisa menampilkan ikon cuaca dengan tepat.
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Mapping kode icon OWM → emoji ─────────────────────────────────────
const OWM_ICON_MAP = {
  '01d': '☀️',  '01n': '🌙',   // clear sky
  '02d': '🌤',  '02n': '🌤',   // few clouds
  '03d': '⛅',  '03n': '⛅',   // scattered clouds
  '04d': '☁️',  '04n': '☁️',   // broken/overcast clouds
  '09d': '🌧',  '09n': '🌧',   // shower rain
  '10d': '🌦',  '10n': '🌦',   // rain
  '11d': '⛈',  '11n': '⛈',   // thunderstorm
  '13d': '❄️',  '13n': '❄️',   // snow
  '50d': '🌫',  '50n': '🌫',   // mist/fog
};

function owmIconToEmoji(iconCode) {
  return OWM_ICON_MAP[iconCode] || '⛅';
}

router.get('/', asyncHandler(async (req, res) => {
  const { lat, lng, city } = req.query;
  // Wajib dari GPS — tidak ada default kota tertentu
  if (!lat || !lng) {
    return res.json({ success: true, simulated: true, data: simulatedWeather(city || 'Lokasi Anda') });
  }
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey.includes('xxx')) {
    return res.json({ success: true, simulated: true, data: simulatedWeather() });
  }

  try {
    const [current, forecast] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon: lng, appid: apiKey, units: 'metric', lang: 'id' },
        timeout: 8000,
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: { lat, lon: lng, appid: apiKey, units: 'metric', lang: 'id', cnt: 8 },
        timeout: 8000,
      }),
    ]);

    const c = current.data;
    const f = forecast.data;

    res.json({
      success: true,
      data: {
        temperature: Math.round(c.main.temp),
        feelsLike:   Math.round(c.main.feels_like),
        description: c.weather[0].description,
        // FIX: Konversi kode icon OWM ke emoji sebelum dikirim ke frontend
        icon:        owmIconToEmoji(c.weather[0].icon),
        iconCode:    c.weather[0].icon,
        humidity:    c.main.humidity,
        windSpeed:   Math.round((c.wind?.speed || 0) * 3.6), // m/s → km/h
        visibility:  Math.round((c.visibility || 10000) / 1000),
        rainChance:  c.rain ? Math.min(90, Math.round((c.rain['1h'] || 0) * 10) + 60) : 10,
        city:        c.name,
        forecast: f.list.map(item => ({
          time:        new Date(item.dt * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          temp:        Math.round(item.main.temp),
          // FIX: icon di forecast juga dikonversi ke emoji
          icon:        owmIconToEmoji(item.weather[0].icon),
          iconCode:    item.weather[0].icon,
          description: item.weather[0].description,
          rainChance:  Math.round((item.pop || 0) * 100),
        })),
        alerts: generateWeatherAlerts(c),
      },
    });
  } catch (err) {
    console.error('[Weather] API error:', err.message);
    res.json({ success: true, simulated: true, data: simulatedWeather() });
  }
}));

function simulatedWeather(cityName = 'Lokasi Anda') {
  return {
    temperature: 31, feelsLike: 35, description: 'Berawan sebagian',
    icon: '⛅', iconCode: '03d',
    humidity: 78, windSpeed: 12, visibility: 8, rainChance: 40,
    city: cityName,
    forecast: [
      { time: '15:00', temp: 30, icon: '⛅', iconCode: '03d', description: 'Berawan', rainChance: 25 },
      { time: '18:00', temp: 27, icon: '🌧', iconCode: '10d', description: 'Hujan lebat', rainChance: 90 },
      { time: '21:00', temp: 26, icon: '🌦', iconCode: '10n', description: 'Gerimis', rainChance: 45 },
      { time: '00:00', temp: 24, icon: '🌙', iconCode: '01n', description: 'Cerah berawan', rainChance: 10 },
    ],
    alerts: [{ type: 'warning', message: 'Potensi hujan lebat pukul 17:00-19:00. Hindari jalan rawan banjir.' }],
  };
}

function generateWeatherAlerts(weather) {
  const alerts = [];
  if (weather.rain)              alerts.push({ type: 'danger',  message: 'Hujan aktif. Kurangi kecepatan dan nyalakan lampu.' });
  if ((weather.wind?.speed || 0) > 10) alerts.push({ type: 'warning', message: 'Angin kencang. Waspada di jembatan dan jalan terbuka.' });
  if ((weather.main?.humidity || 0) > 90) alerts.push({ type: 'info', message: 'Kelembaban sangat tinggi. Visibilitas mungkin berkurang.' });
  return alerts;
}

module.exports = router;
