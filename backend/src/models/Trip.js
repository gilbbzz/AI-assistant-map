// models/Trip.js - Schema Perjalanan
const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Titik asal & tujuan
  origin: {
    name: String,
    address: String,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destination: {
    name: String,
    address: String,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },

  // Multi-stop
  waypoints: [{
    name: String,
    address: String,
    lat: Number,
    lng: Number,
    arrivalTime: Date,
    order: Number
  }],

  // Rute
  route: {
    geometry: mongoose.Schema.Types.Mixed, // GeoJSON
    distance: Number,  // meter
    duration: Number,  // detik
    steps: mongoose.Schema.Types.Mixed,
    routeType: { type: String, default: 'fastest' }
  },

  // Status perjalanan
  status: {
    type: String,
    enum: ['planned', 'active', 'completed', 'cancelled'],
    default: 'planned'
  },

  // Waktu
  startedAt: Date,
  completedAt: Date,
  estimatedArrival: Date,

  // Kondisi saat perjalanan
  conditions: {
    weather: String,
    trafficLevel: String,
    weatherAlert: String,
    hazards: [{ type: String, lat: Number, lng: Number, description: String }]
  },

  // Statistik
  stats: {
    actualDistance: Number,
    actualDuration: Number,
    fuelCost: Number,
    co2Emission: Number,
    ecoScore: Number,
    avgSpeed: Number
  },

  // Live Share
  shareToken: { type: String, unique: true, sparse: true },
  shareExpiry: Date,

  // AI Analisis
  aiAnalysis: String,

  // Rating
  rating: { score: Number, comment: String, ratedAt: Date }

}, { timestamps: true });

tripSchema.index({ user: 1, createdAt: -1 });
tripSchema.index({ shareToken: 1 });
tripSchema.index({ status: 1 });

module.exports = mongoose.model('Trip', tripSchema);
