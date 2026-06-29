// config/database.js – Koneksi MongoDB dengan retry otomatis
// FIX: Ditambahkan retry logic agar tidak langsung crash jika koneksi gagal pertama kali
const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 detik

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS:          45000,
      maxPoolSize:              10,
    });
    console.log(`✓ MongoDB terhubung: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠ MongoDB terputus. Auto-reconnect aktif...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected.');
    });

  } catch (err) {
    console.error(`✗ Gagal koneksi MongoDB (percobaan ${retryCount + 1}/${MAX_RETRIES}): ${err.message}`);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`⏳ Coba lagi dalam ${RETRY_DELAY / 1000} detik...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retryCount + 1);
    }

    console.error('❌ Semua percobaan koneksi MongoDB gagal.');
    console.error('   Pastikan MONGODB_URI di .env sudah benar dan MongoDB berjalan.');
    process.exit(1);
  }
};

module.exports = connectDB;
