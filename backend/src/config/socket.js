// config/socket.js – WebSocket Handler
// FIX: Izinkan koneksi TANPA token (sebagai guest) agar Live Share bisa menerima
//      real-time updates tanpa harus login. User terautentikasi dapat bergabung ke
//      room privat; guest hanya menerima broadcast publik.
const jwt = require('jsonwebtoken');

const socketHandler = (io) => {
  // ── Middleware auth (opsional — guest diizinkan) ──────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.userId  = null;
      socket.isGuest = true;
      return next(); // FIX: izinkan guest
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId  = decoded.id;
      socket.isGuest = false;
      next();
    } catch {
      // Token invalid → treat as guest (jangan tolak koneksi)
      socket.userId  = null;
      socket.isGuest = true;
      next();
    }
  });

  io.on('connection', (socket) => {
    if (!socket.isGuest) {
      console.log(`[Socket] User ${socket.userId} terhubung`);
      socket.join(`user_${socket.userId}`);
    } else {
      console.log(`[Socket] Guest terhubung (${socket.id.slice(0,8)})`);
    }

    // ── Join area room (driver) ──────────────────────────────────────
    socket.on('join_area', (area) => {
      if (!socket.isGuest) {
        socket.join(`area_${area}`);
        console.log(`[Socket] Driver ${socket.userId} masuk area ${area}`);
      }
    });

    // ── Update lokasi real-time untuk Live Share ─────────────────────
    socket.on('update_location', (data) => {
      if (socket.isGuest) return; // hanya user terautentikasi
      const { lat, lng, tripId } = data;
      if (tripId) {
        socket.to(`trip_${tripId}`).emit('location_update', {
          userId: socket.userId, lat, lng, timestamp: new Date(),
        });
      }
    });

    // ── Join trip room (Live Share — guest diizinkan) ────────────────
    socket.on('join_trip', (tripId) => {
      if (tripId) socket.join(`trip_${tripId}`);
    });

    // ── Lapor bahaya ─────────────────────────────────────────────────
    socket.on('report_hazard', (data) => {
      if (socket.isGuest) return;
      const { type, lat, lng, description } = data;
      io.emit('hazard_alert', {
        type, lat, lng, description,
        reportedBy: socket.userId, timestamp: new Date(),
      });
    });

    // ── SOS via socket (fallback jika HTTP gagal) ────────────────────
    socket.on('sos_trigger', (data) => {
      if (socket.isGuest) return;
      io.emit('sos_alert', { userId: socket.userId, ...data, timestamp: new Date() });
    });

    socket.on('disconnect', () => {
      if (!socket.isGuest) console.log(`[Socket] User ${socket.userId} terputus`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error for ${socket.id}:`, err.message);
    });
  });

  // ── Traffic update broadcast setiap 30 detik ─────────────────────
  const trafficInterval = setInterval(() => {
    io.emit('traffic_update', {
      timestamp: new Date(),
      updates: generateTrafficUpdate(),
    });
  }, 30000);

  // Cleanup saat server shutdown
  process.on('SIGTERM', () => clearInterval(trafficInterval));
};

function generateTrafficUpdate() {
  const areas = ['Ilir Barat I', 'Bukit Besar', 'Seberang Ulu', 'Plaju', 'Sako', 'Ilir Timur'];
  const levels = ['lancar', 'sedang', 'padat', 'macet'];
  const weights = [0.35, 0.35, 0.2, 0.1]; // distribusi lebih realistis
  const weighted = () => {
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (r < sum) return levels[i];
    }
    return levels[1];
  };
  return areas.map(area => ({
    area, level: weighted(), speed: Math.floor(Math.random() * 50) + 10,
  }));
}

module.exports = socketHandler;
