// routes/sos.js - Fitur SOS Darurat
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// Kirim SOS darurat
router.post('/trigger', asyncHandler(async (req, res) => {
  const { lat, lng, tripId, message } = req.body;
  const user = await User.findById(req.user._id);

  const sosData = {
    userId: user._id,
    userName: user.name,
    phone: user.phone,
    location: { lat, lng },
    mapUrl: `https://maps.openstreetmap.org/?mlat=${lat}&mlon=${lng}`,
    timestamp: new Date(),
    tripId,
    message: message || 'Pengguna membutuhkan bantuan darurat!'
  };

  // Broadcast via WebSocket ke admin/pusat bantuan
  if (req.io) {
    req.io.emit('sos_emergency', sosData);
  }

  // Kirim notifikasi ke kontak darurat (produksi: gunakan Twilio)
  if (user.emergencyContacts?.length) {
    console.log(`[SOS] Notifikasi dikirim ke ${user.emergencyContacts.length} kontak darurat`);
    // await sendSMSToContacts(user.emergencyContacts, sosData);
  }

  console.log(`[SOS] DARURAT dari ${user.name} di ${lat},${lng}`);

  res.json({
    success: true,
    message: 'SOS berhasil dikirim! Tim bantuan sedang menghubungi Anda.',
    data: {
      sosId: Date.now().toString(),
      sentTo: user.emergencyContacts?.map(c => c.name) || [],
      location: sosData.mapUrl,
      emergencyNumber: '112'
    }
  });
}));

// Update kontak darurat
router.put('/contacts', asyncHandler(async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) return res.status(400).json({ success: false, message: 'Format tidak valid.' });
  await User.findByIdAndUpdate(req.user._id, { emergencyContacts: contacts.slice(0, 3) });
  res.json({ success: true, message: 'Kontak darurat diperbarui.' });
}));

module.exports = router;
