// models/User.js - Schema Pengguna RouteAI
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Info dasar
  name: { type: String, required: [true, 'Nama harus diisi'], trim: true, maxlength: 100 },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: [true, 'Password harus diisi'], minlength: 6, select: false },
  avatar: { type: String, default: null },

  // Role & Status
  role: { type: String, enum: ['user', 'driver', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  premiumExpiry: { type: Date, default: null },


  // Preferensi pengguna
  preferences: {
    vehicle: { type: String, enum: ['car', 'motorcycle', 'electric', 'bicycle'], default: 'car' },
    routeType: { type: String, enum: ['fastest', 'eco', 'no_toll', 'shortest'], default: 'fastest' },
    language: { type: String, default: 'id' },
    voiceNavigation: { type: Boolean, default: true },
    notifications: {
      traffic: { type: Boolean, default: true },
      weather: { type: Boolean, default: true },
      driver_demand: { type: Boolean, default: true },
      surge_pricing: { type: Boolean, default: true }
    }
  },

  // Lokasi favorit
  savedLocations: [{
    name: String,
    address: String,
    lat: Number,
    lng: Number,
    icon: { type: String, default: 'pin' },
    createdAt: { type: Date, default: Date.now }
  }],

  // Kontak darurat (SOS)
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String
  }],

  // Statistik
  stats: {
    totalTrips: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }, // dalam meter
    totalTime: { type: Number, default: 0 },      // dalam detik
    co2Saved: { type: Number, default: 0 },       // dalam gram
    avgRating: { type: Number, default: 5.0 }
  },

  // Data driver (jika role = driver)
  driverInfo: {
    licenseNumber: String,
    vehiclePlate: String,
    vehicleModel: String,
    isOnline: { type: Boolean, default: false },
    currentLocation: { lat: Number, lng: Number },
    rating: { type: Number, default: 5.0 },
    totalEarnings: { type: Number, default: 0 }
  },

  // Token refresh
  refreshTokens: [{ token: String, expiry: Date }],

  // Google OAuth
  googleId: { type: String, sparse: true },

}, { timestamps: true });

// Index untuk performa query
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'driverInfo.isOnline': 1 });

// Hash password sebelum simpan
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method cek password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiry: new Date(Date.now() + 10 * 60 * 1000), // 10 menit
    attempts: 0
  };
  return otp;
};

module.exports = mongoose.model('User', userSchema);
