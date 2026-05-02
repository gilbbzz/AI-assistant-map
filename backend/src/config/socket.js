// config/socket.js - Real-time dengan Socket.IO
const jwt = require('jsonwebtoken');

const socketHandler = (io) => {
  // Middleware autentikasi Socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token tidak ada'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Token tidak valid'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} terhubung via WebSocket`);
    socket.join(`user_${socket.userId}`);

    // Driver bergabung ke room area
    socket.on('join_area', (area) => {
      socket.join(`area_${area}`);
      console.log(`Driver ${socket.userId} masuk ke area ${area}`);
    });

    // Update lokasi real-time (untuk Live Share Trip)
    socket.on('update_location', (data) => {
      const { lat, lng, tripId } = data;
      if (tripId) {
        socket.to(`trip_${tripId}`).emit('location_update', {
          userId: socket.userId,
          lat, lng,
          timestamp: new Date()
        });
      }
    });

    // Join trip room (untuk live share)
    socket.on('join_trip', (tripId) => {
      socket.join(`trip_${tripId}`);
    });

    // Lapor bahaya/kecelakaan
    socket.on('report_hazard', (data) => {
      const { type, lat, lng, description } = data;
      // Broadcast ke user dalam radius 5km
      io.emit('hazard_alert', {
        type, lat, lng, description,
        reportedBy: socket.userId,
        timestamp: new Date()
      });
      console.log(`Bahaya dilaporkan: ${type} di ${lat},${lng}`);
    });

    // SOS darurat
    socket.on('sos_trigger', (data) => {
      io.emit('sos_alert', {
        userId: socket.userId,
        ...data,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} terputus`);
    });
  });

  // Kirim update traffic otomatis setiap 30 detik
  setInterval(() => {
    const trafficUpdate = generateTrafficUpdate();
    io.emit('traffic_update', trafficUpdate);
  }, 30000);
};

// Simulasi update traffic (ganti dengan data real dari sensor)
function generateTrafficUpdate() {
  const areas = ['Ilir Barat I', 'Bukit Besar', 'Seberang Ulu', 'Plaju', 'Sako'];
  const levels = ['lancar', 'sedang', 'padat', 'macet'];
  return {
    timestamp: new Date(),
    updates: areas.map(area => ({
      area,
      level: levels[Math.floor(Math.random() * levels.length)],
      speed: Math.floor(Math.random() * 60) + 10
    }))
  };
}

module.exports = socketHandler;
