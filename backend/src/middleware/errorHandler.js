// middleware/errorHandler.js – Global error handler + asyncHandler
// FIX: Tambahkan penanganan Axios error dan logging yang lebih informatif
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Terjadi kesalahan server internal';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'data';
    message = `${field === 'email' ? 'Email' : field === 'phone' ? 'Nomor HP' : 'Data'} ini sudah terdaftar.`;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = 'ID tidak valid.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Token tidak valid.'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Sesi habis. Silakan login ulang.'; }
  if (err.name === 'NotBeforeError')     { statusCode = 401; message = 'Token belum aktif.'; }

  // Axios errors (HTTP request ke layanan eksternal gagal)
  if (err.isAxiosError) {
    statusCode = 502;
    message    = 'Layanan eksternal tidak merespons. Coba lagi nanti.';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.errors,
    }),
  });
};

// Wrapper untuk async route handlers — menangkap promise rejection
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
