// models/User.js – Schema Pengguna RouteAI
// FIX: Ditambahkan field 'otp'. Removed duplicate index definitions.
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, 'Nama harus diisi'], trim: true, maxlength: 100 },
  // FIX: Hapus unique/sparse dari field definition, sudah didefinisikan di userSchema.index()
  email:    { type: String, lowercase: true, trim: true },
  phone:    { type: String, trim: true },
  password: { type: String, required: [true, 'Password harus diisi'], minlength: 6, select: false },
  avatar:   { type: String, default: null },

  role:          { type: String, enum: ['user', 'driver', 'admin'], default: 'user' },
  isActive:      { type: Boolean, default: true },
  isVerified:    { type: Boolean, default: false },
  isPremium:     { type: Boolean, default: false },
  premiumExpiry: { type: Date, default: null },

  // FIX: Field OTP yang digunakan generateOTP() — sebelumnya tidak ada di schema
  otp: {
    code:     { type: String, select: false },
    expiry:   { type: Date },
    attempts: { type: Number, default: 0 },
  },

  preferences: {
    vehicle:   { type: String, enum: ['car', 'motorcycle', 'electric', 'bicycle'], default: 'car' },
    routeType: { type: String, enum: ['fastest', 'eco', 'no_toll', 'shortest'], default: 'fastest' },
    language:  { type: String, default: 'id' },
    voiceNavigation: { type: Boolean, default: true },
    notifications: {
      traffic:       { type: Boolean, default: true },
      weather:       { type: Boolean, default: true },
      driver_demand: { type: Boolean, default: true },
      surge_pricing: { type: Boolean, default: true },
    },
  },

  savedLocations: [{
    name:      String,
    address:   String,
    lat:       Number,
    lng:       Number,
    icon:      { type: String, default: 'pin' },
    type:      { type: String, enum: ['home', 'work', 'school', 'other'], default: 'other' },
    createdAt: { type: Date, default: Date.now },
  }],

  emergencyContacts: [{
    name:     String,
    phone:    String,
    relation: String,
  }],

  stats: {
    totalTrips:    { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalTime:     { type: Number, default: 0 },
    co2Saved:      { type: Number, default: 0 },
    avgRating:     { type: Number, default: 5.0 },
  },

  driverInfo: {
    licenseNumber:   String,
    vehiclePlate:    String,
    vehicleModel:    String,
    isOnline:        { type: Boolean, default: false },
    currentLocation: { lat: Number, lng: Number },
    rating:          { type: Number, default: 5.0 },
    totalEarnings:   { type: Number, default: 0 },
  },

  // FIX: Refresh tokens untuk mendukung revocation
  refreshTokens: [{
    token:     { type: String, select: false },
    expiry:    Date,
    createdAt: { type: Date, default: Date.now },
  }],

  googleId: { type: String },

}, { timestamps: true });

// ── Unique indexes (didefinisikan sekali di sini, bukan di field) ──────
userSchema.index({ email: 1 },    { unique: true, sparse: true });
userSchema.index({ phone: 1 },    { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ 'driverInfo.isOnline': 1 });

// ── Hash password ──────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare password ───────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Generate OTP ───────────────────────────────────────────────────────
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = { code: otp, expiry: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 };
  return otp;
};

// ── Hapus expired refresh tokens ──────────────────────────────────────
userSchema.methods.cleanExpiredTokens = function () {
  this.refreshTokens = (this.refreshTokens || []).filter(t => t.expiry > new Date());
};

module.exports = mongoose.model('User', userSchema);
