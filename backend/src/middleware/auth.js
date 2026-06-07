// middleware/auth.js - JWT Authentication
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan. Silakan login.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Akun dinonaktifkan.' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Sesi habis. Silakan login ulang.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid.' });
  }
};

const requireDriver = (req, res, next) => {
  if (req.user.role !== 'driver' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Fitur ini khusus untuk driver.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses admin diperlukan.' });
  }
  next();
};

module.exports = { authenticateToken, requireDriver, requireAdmin };
