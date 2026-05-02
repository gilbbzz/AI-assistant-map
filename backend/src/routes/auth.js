// routes/auth.js - Autentikasi TANPA OTP
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

// ============ REGISTER (langsung aktif tanpa OTP) ============
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !password) return res.status(400).json({ success: false, message: 'Nama dan password wajib diisi.' });
  if (!email && !phone) return res.status(400).json({ success: false, message: 'Email atau nomor HP wajib diisi.' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });

  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(409).json({ success: false, message: 'Email atau nomor HP sudah terdaftar.' });

  // Buat user langsung terverifikasi
  const user = await User.create({
    name, email, phone, password,
    isVerified: true  // <-- langsung aktif
  });

  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);

  res.status(201).json({
    success: true,
    message: 'Akun berhasil dibuat. Selamat datang!',
    data: { token, refreshToken, user: formatUser(user) }
  });
}));

// ============ LOGIN ============
router.post('/login', asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, message: 'Email/HP dan password wajib diisi.' });

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }]
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Email/HP atau password salah.' });
  }
  if (!user.isActive) return res.status(401).json({ success: false, message: 'Akun Anda dinonaktifkan.' });

  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);

  res.json({
    success: true,
    message: 'Login berhasil!',
    data: { token, refreshToken, user: formatUser(user) }
  });
}));

// ============ REFRESH TOKEN ============
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token tidak ada.' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    const newToken = signToken(user._id);
    res.json({ success: true, data: { token: newToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token tidak valid.' });
  }
}));

// ============ LOGOUT ============
router.post('/logout', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Berhasil keluar.' });
}));

// ============ LOGIN GOOGLE (OAuth) ============
router.post('/google', asyncHandler(async (req, res) => {
  const { googleToken, name, email, googleId, avatar } = req.body;
  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    user = await User.create({
      name, email, googleId, avatar,
      password: Math.random().toString(36) + Date.now(),
      isVerified: true
    });
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);
  res.json({ success: true, data: { token, refreshToken, user: formatUser(user) } });
}));

// Helper: format data user untuk response
function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    isPremium: user.isPremium,
    isVerified: user.isVerified,
    preferences: user.preferences,
    stats: user.stats,
    savedLocations: user.savedLocations
  };
}

module.exports = router;  