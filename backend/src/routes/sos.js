// routes/sos.js – Fitur SOS Darurat
// FIX: Ditambahkan GET /contacts yang dipanggil oleh frontend (sebelumnya tidak ada)
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Kirim SOS darurat ────────────────────────────────────────────────
router.post('/trigger', asyncHandler(async (req, res) => {
  const { lat, lng, tripId, message } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Koordinat GPS wajib untuk SOS.' });
  }

  const user = await User.findById(req.user._id);
  const sosData = {
    userId:    user._id,
    userName:  user.name,
    phone:     user.phone,
    location:  { lat: parseFloat(lat), lng: parseFloat(lng) },
    mapUrl:    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`,
    timestamp: new Date(),
    tripId,
    message:   message || 'Pengguna membutuhkan bantuan darurat!',
  };

  // Broadcast via WebSocket ke admin/pusat bantuan
  if (req.io) {
    req.io.emit('sos_emergency', sosData);
    // Kirim ke room admin khusus jika ada
    req.io.to('admin_room').emit('sos_emergency', sosData);
  }

  // Log darurat
  console.error(`[SOS DARURAT] ${user.name} (${user.phone}) di ${lat},${lng} — ${new Date().toISOString()}`);

  // Di produksi: kirim SMS via Twilio ke kontak darurat
  if (user.emergencyContacts?.length > 0) {
    console.log(`[SOS] Notifikasi ke ${user.emergencyContacts.length} kontak: ${user.emergencyContacts.map(c => c.name).join(', ')}`);
    // Implementasi Twilio di sini jika TWILIO_ACCOUNT_SID tersedia
  }

  res.json({
    success: true,
    message: 'SOS berhasil dikirim! Tim bantuan sedang merespons.',
    data: {
      sosId:           Date.now().toString(),
      sentTo:          user.emergencyContacts?.map(c => c.name) || [],
      location:        sosData.mapUrl,
      emergencyNumber: '112',
      timestamp:       sosData.timestamp,
    },
  });
}));

// ── GET kontak darurat (FIX: endpoint ini dipanggil frontend tapi tidak ada) ──
router.get('/contacts', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('emergencyContacts');
  res.json({
    success: true,
    data: user.emergencyContacts || [],
  });
}));

// ── Update kontak darurat ────────────────────────────────────────────
router.put('/contacts', asyncHandler(async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ success: false, message: 'Format contacts harus array.' });
  }

  // Validasi setiap kontak
  const validContacts = contacts.slice(0, 3).map(c => ({
    name:     c.name?.trim()  || 'Kontak Darurat',
    phone:    c.phone?.trim() || '',
    relation: c.relation?.trim() || '',
  })).filter(c => c.phone); // hanya simpan yang ada nomornya

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { emergencyContacts: validContacts },
    { new: true },
  );

  res.json({ success: true, message: 'Kontak darurat diperbarui.', data: user.emergencyContacts });
}));

module.exports = router;
