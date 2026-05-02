// config/database.js - Koneksi MongoDB
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB terhubung: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB terputus. Mencoba reconnect...');
    });
  } catch (err) {
    console.error('Gagal koneksi MongoDB:', err.message);
    console.error('Pastikan MONGODB_URI sudah diisi di .env');
    process.exit(1);
  }
};

module.exports = connectDB;
