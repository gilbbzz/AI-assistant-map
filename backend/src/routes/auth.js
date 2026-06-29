// routes/auth.js – Autentikasi RouteAI
// FIX: Google OAuth sekarang memverifikasi ID token secara nyata menggunakan
//      google-auth-library. Token dicek langsung ke server Google.
const express        = require('express');
const router         = express.Router();
const jwt            = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User           = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET  = () => process.env.JWT_SECRET;
const JWT_EXP     = () => process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH = () => process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signToken   = (id) => jwt.sign({ id }, JWT_SECRET(), { expiresIn: JWT_EXP() });
const signRefresh = (id) => jwt.sign({ id }, JWT_SECRET(), { expiresIn: JWT_REFRESH() });

// ── Simpan refresh token ke DB (max 5 device) ─────────────────────────
async function storeRefreshToken(user, refreshToken) {
  user.cleanExpiredTokens();
  if (user.refreshTokens.length >= 5) user.refreshTokens = user.refreshTokens.slice(-4);
  const decoded = jwt.decode(refreshToken);
  user.refreshTokens.push({ token: refreshToken, expiry: new Date(decoded.exp * 1000) });
  await user.save({ validateBeforeSave: false });
}

// ── Format user untuk response (hapus field sensitif) ─────────────────
function formatUser(user) {
  return {
    id: user._id, name: user.name, email: user.email,
    phone: user.phone, avatar: user.avatar, role: user.role,
    isPremium: user.isPremium, isVerified: user.isVerified,
    preferences: user.preferences, stats: user.stats,
    savedLocations: user.savedLocations, emergencyContacts: user.emergencyContacts,
  };
}

// ══════════════════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════════════════
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name?.trim())   return res.status(400).json({ success: false, message: 'Nama wajib diisi.' });
  if (!email && !phone) return res.status(400).json({ success: false, message: 'Email atau nomor HP wajib.' });
  if (!password)       return res.status(400).json({ success: false, message: 'Password wajib diisi.' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Format email tidak valid.' });

  const q = [];
  if (email) q.push({ email: email.toLowerCase().trim() });
  if (phone) q.push({ phone: phone.trim() });
  if (await User.findOne({ $or: q }))
    return res.status(409).json({ success: false, message: 'Email atau nomor HP sudah terdaftar.' });

  const user = await User.create({
    name: name.trim(),
    email: email ? email.toLowerCase().trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    password, isVerified: true,
  });

  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);
  await storeRefreshToken(user, refreshToken);

  res.status(201).json({
    success: true, message: 'Akun berhasil dibuat!',
    data: { token, refreshToken, user: formatUser(user) },
  });
}));

// ══════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════
router.post('/login', asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ success: false, message: 'Email/HP dan password wajib diisi.' });

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase().trim() }, { phone: identifier.trim() }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: 'Email/HP atau password salah.' });
  if (!user.isActive)
    return res.status(401).json({ success: false, message: 'Akun dinonaktifkan. Hubungi support.' });

  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);
  await storeRefreshToken(user, refreshToken);

  res.json({ success: true, message: 'Login berhasil!', data: { token, refreshToken, user: formatUser(user) } });
}));

// ══════════════════════════════════════════════════════
// GOOGLE OAUTH – Verifikasi ID Token dari Google
// ══════════════════════════════════════════════════════
router.post('/google', asyncHandler(async (req, res) => {
  const { credential } = req.body; // ID token dari @react-oauth/google

  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential tidak ditemukan.' });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: 'Google Client ID belum dikonfigurasi di server. Tambahkan GOOGLE_CLIENT_ID ke .env',
    });
  }

  // ── Verifikasi ID token langsung ke Google ─────────────────────────
  let payload;
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken:  credential,
      audience: GOOGLE_CLIENT_ID, // pastikan token untuk app kita
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error('[Google OAuth] Verifikasi token gagal:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Token Google tidak valid atau sudah kedaluwarsa. Coba login ulang.',
    });
  }

  const { sub: googleId, email, name, picture: avatar, email_verified } = payload;

  // Pastikan email sudah diverifikasi oleh Google
  if (!email_verified) {
    return res.status(401).json({
      success: false, message: 'Akun Google belum diverifikasi. Verifikasi email Google Anda terlebih dahulu.',
    });
  }

  // ── Cari atau buat user ────────────────────────────────────────────
  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (!user) {
    // Pengguna baru → buat akun otomatis
    user = await User.create({
      name,
      email: email.toLowerCase(),
      googleId,
      avatar,
      // Password acak karena tidak digunakan untuk Google login
      password: require('crypto').randomBytes(32).toString('hex'),
      isVerified: true,
    });
    console.log(`[Google OAuth] User baru dibuat: ${email}`);
  } else {
    // Pengguna lama → update googleId & avatar jika belum ada
    let changed = false;
    if (!user.googleId) { user.googleId = googleId; changed = true; }
    if (avatar && !user.avatar) { user.avatar = avatar; changed = true; }
    if (changed) await user.save({ validateBeforeSave: false });
  }

  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);
  await storeRefreshToken(user, refreshToken);

  res.json({
    success: true,
    message: `Selamat datang, ${user.name}!`,
    data: { token, refreshToken, user: formatUser(user) },
  });
}));

// ══════════════════════════════════════════════════════
// REFRESH TOKEN – rotation
// ══════════════════════════════════════════════════════
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token tidak ada.' });

  let decoded;
  try { decoded = jwt.verify(refreshToken, JWT_SECRET()); }
  catch { return res.status(401).json({ success: false, message: 'Refresh token tidak valid atau kedaluwarsa.' }); }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user) return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan.' });

  const entry = user.refreshTokens.find(t => t.token === refreshToken && t.expiry > new Date());
  if (!entry) return res.status(401).json({ success: false, message: 'Refresh token tidak dikenal. Silakan login ulang.' });

  // Hapus token lama, buat yang baru
  user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
  user.cleanExpiredTokens();

  const newToken = signToken(user._id);
  const newRefresh = signRefresh(user._id);
  const nd = jwt.decode(newRefresh);
  user.refreshTokens.push({ token: newRefresh, expiry: new Date(nd.exp * 1000) });
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, data: { token: newToken, refreshToken: newRefresh } });
}));

// ══════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET());
      await User.findByIdAndUpdate(decoded.id, { $pull: { refreshTokens: { token: refreshToken } } });
    } catch { /* token invalid, skip */ }
  }
  res.json({ success: true, message: 'Berhasil keluar.' });
}));

// ══════════════════════════════════════════════════════
// ME – cek token aktif
// ══════════════════════════════════════════════════════
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: formatUser(req.user) });
}));

module.exports = router;
