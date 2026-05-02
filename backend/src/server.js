// ============================================
// RouteAI Backend - server.js
// Entry point aplikasi Express
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const routeRoutes = require('./routes/route');
const aiRoutes = require('./routes/ai');
const weatherRoutes = require('./routes/weather');
const trafficRoutes = require('./routes/traffic');
const driverRoutes = require('./routes/driver');
const tripRoutes = require('./routes/trip');
const sosRoutes = require('./routes/sos');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const socketHandler = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Socket.IO untuk real-time updates
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// ============================================
// MIDDLEWARE GLOBAL
// ============================================
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti.' }
});
app.use('/api/', globalLimiter);

// Rate limit ketat untuk auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan login.' }
});

// Attach io ke request agar bisa digunakan di controllers
app.use((req, res, next) => { req.io = io; next(); });

// ============================================
// ROUTES
// ============================================
app.get('/', (req, res) => res.json({
  success: true,
  message: 'RouteAI API v1.0 - Platform Navigasi Cerdas Indonesia',
  version: '1.0.0',
  docs: '/api/docs'
}));

app.get('/api/health', (req, res) => res.json({
  success: true,
  status: 'OK',
  timestamp: new Date().toISOString(),
  uptime: process.uptime()
}));

// Public routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/traffic', trafficRoutes);

// Protected routes (butuh login)
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/route', authenticateToken, routeRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/driver', authenticateToken, driverRoutes);
app.use('/api/trip', authenticateToken, tripRoutes);
app.use('/api/sos', authenticateToken, sosRoutes);

// 404 handler
app.use('*', (req, res) => res.status(404).json({
  success: false,
  message: `Route ${req.originalUrl} tidak ditemukan`
}));

// Error handler global
app.use(errorHandler);

// Socket.IO handler
socketHandler(io);

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║         RouteAI Backend v1.0          ║
║   Platform Navigasi Cerdas Indonesia  ║
╠═══════════════════════════════════════╣
║  Server  : http://localhost:${PORT}       ║
║  Status  : Berjalan ✓                 ║
║  DB      : MongoDB Connected ✓        ║
║  Socket  : WebSocket Ready ✓          ║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Gagal menjalankan server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
