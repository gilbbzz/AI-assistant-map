// src/screens/AuthScreen.jsx
// BARU: Google OAuth nyata menggunakan @react-oauth/google.
//       Tombol Google membuka popup resmi Google (bukan demo).
//       Scroll fix untuk tampilan laptop/desktop.
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';

// ── Form Input kecil ─────────────────────────────────────────────────
const FormInput = ({ label, error, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, color: '#8B949E', marginBottom: 5, fontWeight: 500 }}>
      {label}
    </label>
    <input style={{ width: '100%', borderColor: error ? '#D95050' : undefined }} {...props} />
    {error && <p style={{ fontSize: 11, color: '#D95050', marginTop: 4 }}>{error}</p>}
  </div>
);

// ── Loading Spinner kecil ─────────────────────────────────────────────
const SmallSpinner = () => (
  <div style={{
    width: 18, height: 18, borderRadius: '50%',
    border: '2.5px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block', verticalAlign: 'middle', marginRight: 8,
  }} />
);

export default function AuthScreen() {
  const navigate = useNavigate();
  const setAuth  = useStore(s => s.setAuth);

  const [tab,     setTab]     = useState('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form,    setForm]    = useState({ identifier: '', password: '', name: '', email: '', phone: '' });
  const [errors,  setErrors]  = useState({});

  const set = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  }, [errors]);

  // ── Validasi ─────────────────────────────────────────────────────────
  const validateLogin = () => {
    const e = {};
    if (!form.identifier.trim()) e.identifier = 'Email atau nomor HP wajib diisi';
    if (!form.password)          e.password   = 'Password wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e = {};
    if (!form.name.trim())       e.name     = 'Nama wajib diisi';
    if (!form.email && !form.phone) e.email = 'Email atau nomor HP wajib diisi';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format email tidak valid';
    if (!form.password)          e.password = 'Password wajib diisi';
    else if (form.password.length < 6)       e.password = 'Password minimal 6 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Login email/HP ───────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const res = await authAPI.login(form.identifier.trim(), form.password);
      const { token, refreshToken, user } = res.data.data;
      setAuth(user, token, refreshToken);
      toast.success(`Selamat datang kembali, ${user.name}! 👋`);
      navigate('/app');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        toast.error('Server tidak dapat dijangkau. Pastikan backend berjalan.');
      } else {
        toast.error(err.response?.data?.message || 'Login gagal. Coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validateRegister()) return;
    setLoading(true);
    try {
      const res = await authAPI.register({
        name:     form.name.trim(),
        email:    form.email.trim()  || undefined,
        phone:    form.phone.trim()  || undefined,
        password: form.password,
      });
      const { token, refreshToken, user } = res.data.data;
      setAuth(user, token, refreshToken);
      toast.success(`Akun berhasil dibuat! Selamat datang, ${user.name}! 🎉`, { duration: 4000 });
      navigate('/app');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        toast.error('Server tidak dapat dijangkau. Pastikan backend berjalan di port 5000.');
      } else {
        toast.error(err.response?.data?.message || 'Registrasi gagal.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth NYATA ────────────────────────────────────────────────
  // Dipanggil oleh @react-oauth/google setelah user memilih akun Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      // credential adalah JWT ID token dari Google
      const res = await authAPI.googleLogin({ credential: credentialResponse.credential });
      const { token, refreshToken, user } = res.data.data;
      setAuth(user, token, refreshToken);
      toast.success(`Selamat datang, ${user.name}! Login Google berhasil ✅`, { duration: 4000 });
      navigate('/app');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login Google gagal. Coba lagi.';
      toast.error(msg);
      // Jika GOOGLE_CLIENT_ID belum dikonfigurasi di backend, beri petunjuk
      if (err.response?.status === 500) {
        toast.error('GOOGLE_CLIENT_ID belum diset di .env backend. Lihat dokumentasi setup.', { duration: 6000 });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    // Bisa terjadi jika: popup diblokir, akun ditolak, atau GOOGLE_CLIENT_ID salah
    toast.error('Login Google dibatalkan atau gagal. Pastikan popup tidak diblokir browser.');
  };

  // ── Demo login (tanpa akun nyata) ────────────────────────────────────
  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-001', name: 'Demo User', email: 'demo@routeai.id',
      role: 'user', isPremium: true, isVerified: true,
      preferences: { vehicle: 'car', routeType: 'fastest', voiceNavigation: true,
        notifications: { traffic: true, weather: true } },
      stats: { totalTrips: 247, totalDistance: 1230000, co2Saved: 18000 },
      savedLocations: [], emergencyContacts: [],
    };
    setAuth(demoUser, 'demo-token-xxx', 'demo-refresh-xxx');
    toast.success('Mode Demo aktif! Jelajahi semua fitur RouteAI.', { icon: '🚀', duration: 4000 });
    navigate('/app');
  };

  const handleKey = (e) => { if (e.key === 'Enter') tab === 'login' ? handleLogin() : handleRegister(); };

  // ── Cek apakah Google Client ID sudah dikonfigurasi ──────────────────
  const hasGoogleClientId = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <div style={ss.root}>
      {/* ── AREA ATAS: Logo & fitur ──────────────────────────────── */}
      <div style={ss.topArea}>
        <div style={ss.logoWrap}>
          <div style={ss.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style={ss.pulse} />
        </div>
        <h1 style={ss.title}>RouteAI</h1>
        <p style={ss.subtitle}>Navigasi + AI = Perjalanan Lebih Cerdas</p>
        <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['🗺 Rute Real-time', '🤖 AI Groq', '🌦 Cuaca Live'].map(f => (
            <span key={f} style={{ background: 'rgba(107,92,231,0.2)', border: '0.5px solid rgba(107,92,231,0.3)', color: '#7B6FFF', fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* ── CARD FORM ────────────────────────────────────────────── */}
      <div style={ss.card}>
        {/* Tab Login / Daftar */}
        <div style={ss.tabs}>
          {['login', 'register'].map(t => (
            <button key={t} style={{ ...ss.tabBtn, ...(tab === t ? ss.tabActive : {}) }}
              onClick={() => { setTab(t); setErrors({}); }}>
              {t === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        {/* ── Login form ── */}
        {tab === 'login' ? (
          <>
            <FormInput label="Email / No. HP" type="text" placeholder="Email atau nomor HP"
              value={form.identifier} onChange={e => set('identifier', e.target.value)}
              onKeyPress={handleKey} error={errors.identifier} autoComplete="username" />
            <FormInput label="Password" type="password" placeholder="Password Anda"
              value={form.password} onChange={e => set('password', e.target.value)}
              onKeyPress={handleKey} error={errors.password} autoComplete="current-password" />
            <button className="btn-primary" onClick={handleLogin} disabled={loading}
              style={{ marginBottom: 10, opacity: loading ? 0.75 : 1 }}>
              {loading ? <><SmallSpinner />Masuk...</> : 'Masuk ke RouteAI'}
            </button>
          </>
        ) : (
          /* ── Register form ── */
          <>
            <FormInput label="Nama Lengkap" type="text" placeholder="Nama lengkap Anda"
              value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
            <FormInput label="Email" type="email" placeholder="contoh@email.com"
              value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} autoComplete="email" />
            <FormInput label="No. HP (opsional)" type="tel" placeholder="+62 812 3456 7890"
              value={form.phone} onChange={e => set('phone', e.target.value)} />
            <FormInput label="Password" type="password" placeholder="Minimal 6 karakter"
              value={form.password} onChange={e => set('password', e.target.value)}
              onKeyPress={handleKey} error={errors.password} autoComplete="new-password" />
            <button className="btn-primary" onClick={handleRegister} disabled={loading}
              style={{ marginBottom: 10, opacity: loading ? 0.75 : 1 }}>
              {loading ? <><SmallSpinner />Mendaftar...</> : 'Buat Akun Gratis'}
            </button>
          </>
        )}

        {/* ── Divider ── */}
        <div style={{ position: 'relative', textAlign: 'center', margin: '16px 0' }}>
          <div style={{ position: 'absolute', inset: '50% 0 0', borderTop: '0.5px solid rgba(255,255,255,0.07)' }} />
          <span style={{ position: 'relative', background: '#161B22', padding: '0 12px', fontSize: 12, color: '#3D444D' }}>atau lanjutkan dengan</span>
        </div>

        {/* ── Google OAuth Button NYATA ── */}
        {hasGoogleClientId ? (
          <div style={{ marginBottom: 10 }}>
            {googleLoading ? (
              <div style={{ ...ss.googleBtn, justifyContent: 'center', opacity: 0.7, cursor: 'not-allowed' }}>
                <SmallSpinner /> Menghubungi Google...
              </div>
            ) : (
              /* GoogleLogin dari @react-oauth/google – membuka popup Google resmi */
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  size="large"
                  shape="rectangular"
                  width="100%"
                  text={tab === 'login' ? 'signin_with' : 'signup_with'}
                  locale="id"
                />
              </div>
            )}
          </div>
        ) : (
          /* Tampilkan tombol Google yang disabled dengan petunjuk setup */
          <div style={{ marginBottom: 10 }}>
            <button
              style={{ ...ss.googleBtn, opacity: 0.5, cursor: 'not-allowed', position: 'relative' }}
              onClick={() => toast('Konfigurasi REACT_APP_GOOGLE_CLIENT_ID di .env frontend terlebih dahulu.', { icon: '⚙️', duration: 5000 })}
            >
              <GoogleIcon />
              Login dengan Google
            </button>
            <p style={{ fontSize: 10, color: '#3D444D', textAlign: 'center', marginTop: 5 }}>
              ⚙️ Perlu konfigurasi Google Client ID · <span style={{ color: '#7B6FFF', cursor: 'pointer' }} onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}>Buat di sini</span>
            </p>
          </div>
        )}

        {/* ── Demo Mode ── */}
        <button style={ss.demoBtn} onClick={handleDemoLogin}>
          🚀 Coba Tanpa Akun (Mode Demo)
        </button>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#3D444D', marginTop: 14, lineHeight: 1.6 }}>
          Dengan masuk, kamu setuju dengan{' '}
          <span style={{ color: '#7B6FFF' }}>Syarat &amp; Ketentuan</span> dan{' '}
          <span style={{ color: '#7B6FFF' }}>Kebijakan Privasi</span> RouteAI.
        </p>
      </div>
    </div>
  );
}

// ── Ikon Google SVG ───────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const ss = {
  root: {
    height: '100%', background: '#0D1117',
    display: 'flex', flexDirection: 'column', overflowY: 'auto',
  },
  topArea: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '30px 20px 20px',
    minHeight: 220,
  },
  logoWrap: { position: 'relative', marginBottom: 16 },
  logo: {
    width: 70, height: 70, background: 'linear-gradient(135deg, #6B5CE7, #8B5CF6)',
    borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(107,92,231,0.35)', animation: 'bounceIn 0.6s ease',
    position: 'relative', zIndex: 1,
  },
  pulse: {
    position: 'absolute', inset: -8, borderRadius: 28,
    background: 'rgba(107,92,231,0.15)', animation: 'pulse 2s ease-in-out infinite',
  },
  title:    { fontSize: 28, fontWeight: 800, color: '#F0F6FC', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#8B949E', marginTop: 6, textAlign: 'center' },
  card: {
    background: '#161B22', borderRadius: '22px 22px 0 0',
    padding: '24px 20px 36px', flexShrink: 0,
  },
  tabs: { display: 'flex', background: '#0D1117', borderRadius: 10, padding: 3, marginBottom: 18 },
  tabBtn: {
    flex: 1, padding: 9, border: 'none', background: 'transparent',
    color: '#8B949E', borderRadius: 7, fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
  },
  tabActive: { background: '#6B5CE7', color: '#fff', boxShadow: '0 2px 8px rgba(107,92,231,0.35)' },
  googleBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '11px 16px', background: '#fff',
    border: 'none', borderRadius: 10, color: '#1a1a1a',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
  },
  demoBtn: {
    width: '100%', padding: '10px 16px', background: 'transparent',
    border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: '#8B949E', fontSize: 13, cursor: 'pointer', transition: 'border-color 0.2s',
  },
};
