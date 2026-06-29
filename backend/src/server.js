// server.js – Entry point RouteAI Backend
// FIX: /api/route/live/:token dipindah ke public routes (tanpa auth)
//      agar LiveShareScreen bisa diakses tanpa login.
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const http         = require('http');
const { Server }   = require('socket.io');
const rateLimit    = require('express-rate-limit');

const connectDB          = require('./config/database');
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/user');
const routeRoutes        = require('./routes/route');
const aiRoutes           = require('./routes/ai');
const weatherRoutes      = require('./routes/weather');
const trafficRoutes      = require('./routes/traffic');
const driverRoutes       = require('./routes/driver');
const tripRoutes         = require('./routes/trip');
const sosRoutes          = require('./routes/sos');
const { errorHandler }       = require('./middleware/errorHandler');
const { authenticateToken }  = require('./middleware/auth');
const { asyncHandler }       = require('./middleware/errorHandler');
const socketHandler          = require('./config/socket');
const Trip                   = require('./models/Trip');

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:  process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// ── Middleware Global ──────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// FIX: CORS mendukung Capacitor, iOS, dan web
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'capacitor://localhost', 'ionic://localhost', 'http://localhost'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile / Postman
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS: Origin tidak diizinkan'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  message:  { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  standardHeaders: true, legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Terlalu banyak percobaan login. Tunggu 15 menit.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// ── Inject Socket.IO ke setiap request ────────────────────────────────
app.use((req, _res, next) => { req.io = io; next(); });

// ══════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════

// Health check publik
app.get('/', (_req, res) => res.json({
  success: true, message: 'RouteAI API v1.0', version: '1.0.0',
}));
app.get('/api/health', (_req, res) => res.json({
  success: true, status: 'OK',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV,
}));

// ── PUBLIC routes (tanpa auth) ─────────────────────────────────────────
app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/traffic', trafficRoutes);

// FIX: /live/:token harus public — sebelumnya terkena middleware auth
// karena semua /api/route/* memerlukan token
app.get('/api/route/live/:token', asyncHandler(async (req, res) => {
  const trip = await Trip.findOne({
    shareToken:  req.params.token,
    shareExpiry: { $gt: new Date() },
  }).populate('user', 'name avatar');

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Link tidak valid atau sudah kadaluarsa.' });
  }

  res.json({
    success: true,
    data: {
      origin:      trip.origin,
      destination: trip.destination,
      status:      trip.status,
      eta:         trip.estimatedArrival,
      driver:      { name: trip.user?.name, avatar: trip.user?.avatar },
    },
  });
}));

// ── PROTECTED routes (butuh JWT) ──────────────────────────────────────
app.use('/api/user',   authenticateToken, userRoutes);
app.use('/api/route',  authenticateToken, routeRoutes);
app.use('/api/ai',     authenticateToken, aiRoutes);
app.use('/api/driver', authenticateToken, driverRoutes);
app.use('/api/trip',   authenticateToken, tripRoutes);
app.use('/api/sos',    authenticateToken, sosRoutes);

// ── 404 ────────────────────────────────────────────────────────────────
app.use('*', (req, res) => res.status(404).json({
  success: false, message: `Endpoint ${req.originalUrl} tidak ditemukan.`,
}));

// ── Error handler global ───────────────────────────────────────────────
app.use(errorHandler);

// ── Socket.IO ──────────────────────────────────────────────────────────
socketHandler(io);

// ══════════════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT) || 5000;

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║         RouteAI Backend v1.0              ║
║    Platform Navigasi Cerdas Indonesia     ║
╠═══════════════════════════════════════════╣
║  Server  : http://localhost:${PORT}           ║
║  Mode    : ${(process.env.NODE_ENV || 'development').padEnd(12)} ✓             ║
║  AI      : Groq llama-3.3-70b ✓           ║
╚═══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Gagal start server:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => { console.log('Shutting down...'); server.close(() => process.exit(0)); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); process.exit(1); });

start();
module.exports = { app, io };
