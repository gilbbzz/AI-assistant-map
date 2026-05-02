// routes/weather.js - Cuaca real dari OpenWeatherMap
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  const { lat = -2.9761, lng = 104.7754, city = 'Palembang' } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey.includes('xxx')) {
    // Data simulasi jika API key belum diisi
    return res.json({ success: true, simulated: true, data: simulatedWeather() });
  }

  try {
    const [current, forecast] = await Promise.all([
      axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=id`),
      axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=id&cnt=8`)
    ]);

    const c = current.data;
    const f = forecast.data;

    res.json({
      success: true,
      data: {
        temperature: Math.round(c.main.temp),
        feelsLike: Math.round(c.main.feels_like),
        description: c.weather[0].description,
        icon: c.weather[0].icon,
        humidity: c.main.humidity,
        windSpeed: Math.round(c.wind.speed * 3.6), // m/s ke km/h
        visibility: Math.round((c.visibility || 10000) / 1000),
        rainChance: c.rain ? 90 : 10,
        city: c.name,
        forecast: f.list.map(item => ({
          time: new Date(item.dt * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          temp: Math.round(item.main.temp),
          icon: item.weather[0].icon,
          description: item.weather[0].description,
          rainChance: Math.round((item.pop || 0) * 100)
        })),
        alerts: generateWeatherAlerts(c)
      }
    });
  } catch (err) {
    res.json({ success: true, simulated: true, data: simulatedWeather() });
  }
}));

function simulatedWeather() {
  return {
    temperature: 31, feelsLike: 35, description: 'Berawan sebagian', humidity: 78,
    windSpeed: 12, visibility: 8, rainChance: 40, city: 'Palembang',
    forecast: [
      { time: '15:00', temp: 30, description: 'Berawan', rainChance: 25 },
      { time: '18:00', temp: 27, description: 'Hujan lebat', rainChance: 90 },
      { time: '21:00', temp: 26, description: 'Gerimis', rainChance: 45 },
      { time: '00:00', temp: 24, description: 'Cerah berawan', rainChance: 10 }
    ],
    alerts: [{ type: 'warning', message: 'Potensi hujan lebat pukul 17:00-19:00. Hindari jalan rawan banjir.' }]
  };
}

function generateWeatherAlerts(weather) {
  const alerts = [];
  if (weather.rain) alerts.push({ type: 'danger', message: 'Hujan aktif. Kurangi kecepatan dan nyalakan lampu.' });
  if (weather.wind?.speed > 10) alerts.push({ type: 'warning', message: 'Angin kencang. Waspada di jembatan dan jalan terbuka.' });
  if (weather.main?.humidity > 90) alerts.push({ type: 'info', message: 'Kelembaban sangat tinggi. Visibilitas mungkin berkurang.' });
  return alerts;
}

module.exports = router;
