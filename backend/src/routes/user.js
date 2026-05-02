// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/profile', asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const allowed = ['name', 'avatar', 'preferences', 'emergencyContacts', 'savedLocations'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: user, message: 'Profil berhasil diperbarui.' });
}));

router.post('/saved-locations', asyncHandler(async (req, res) => {
  const { name, address, lat, lng, icon, type } = req.body;
  if (!name || !lat || !lng) return res.status(400).json({ success: false, message: 'Nama dan koordinat wajib.' });

  const user = await User.findById(req.user._id);
  user.savedLocations.push({ name, address, lat, lng, icon, type });
  await user.save();

  res.status(201).json({ success: true, data: user.savedLocations });
}));

router.put('/saved-locations/:id', asyncHandler(async (req, res) => {
  const { name, address, lat, lng, icon, type } = req.body;
  const user = await User.findById(req.user._id);
  const loc = user.savedLocations.id(req.params.id);
  if (!loc) return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan.' });

  if (name) loc.name = name;
  if (address) loc.address = address;
  if (lat !== undefined) loc.lat = lat;
  if (lng !== undefined) loc.lng = lng;
  if (icon) loc.icon = icon;
  if (type) loc.type = type;

  await user.save();
  res.json({ success: true, data: user.savedLocations });
}));

router.delete('/saved-locations/:id', asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { savedLocations: { _id: req.params.id } } });
  res.json({ success: true, message: 'Lokasi dihapus.' });
}));

module.exports = router;
