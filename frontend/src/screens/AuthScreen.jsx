// src/screens/AuthScreen.jsx (tanpa OTP) - DIPERBAIKI: Input tidak kehilangan fokus
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';

// ✅ Pindahkan I ke luar komponen agar tidak dibuat ulang setiap render
const I = ({ label, ...props }) => (
  <div style={{ marginBottom: 13 }}>
    <label style={{ display: 'block', fontSize: 12, color: '#8B949E', marginBottom: 5 }}>{label}</label>
    <input style={{ width: '100%' }} {...props} />
  </div>
);

export default function AuthScreen() {
  const navigate = useNavigate();
  const setAuth = useStore(s => s.setAuth);
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '', name: '', email: '', phone: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogin = async () => {
    if (!form.identifier || !form.password) return toast.error('Isi semua kolom!');
    setLoading(true);
    try {
      const res = await authAPI.login(form.identifier, form.password);
      const { token, refreshToken, user } = res.data.data;
      setAuth(user, token, refreshToken);
      toast.success(`Selamat datang, ${user.name}!`);
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login gagal. Coba lagi.');
    } finally { setLoading(false); }
  };

  // Demo login — langsung masuk tanpa backend
  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-001', name: 'Demo User', email: 'demo@routeai.id',
      role: 'user', isPremium: true, isVerified: true,
      preferences: { vehicle: 'car', routeType: 'fastest', voiceNavigation: true, notifications: { traffic: true, weather: true } },
      stats: { totalTrips: 247, totalDistance: 1230000, co2Saved: 18000 }
    };
    setAuth(demoUser, 'demo-token-xxx', 'demo-refresh-xxx');
    toast.success('Mode Demo aktif!');
    navigate('/app');
  };

  const handleRegister = async () => {
    if (!form.name || !form.password || (!form.email && !form.phone)) {
      return toast.error('Isi nama, email/HP, dan password!');
    }
    if (form.password.length < 6) return toast.error('Password minimal 6 karakter!');
    setLoading(true);
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
  return toast.error('Format email tidak valid.');
}
    try {
      const res = await authAPI.register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      const { token, refreshToken, user } = res.data.data;
      setAuth(user, token, refreshToken);
      toast.success(`Akun berhasil dibuat. Selamat datang, ${user.name}!`);
      navigate('/app');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        handleDemoLogin();
      } else {
        toast.error(err.response?.data?.message || 'Registrasi gagal.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={ss.root}>
      <div style={ss.topArea}>
        <div style={ss.logo}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <h1 style={ss.title}>RouteAI</h1>
        <p style={ss.sub}>Navigasi + AI = Perjalanan Lebih Cerdas</p>
      </div>
      <div style={ss.form}>
        {/* Tabs */}
        <div style={ss.tabs}>
          {['login','register'].map(t => (
            <button key={t} style={{ ...ss.tabBtn, ...(tab === t ? ss.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <>
            <I label="Email / No. HP" type="text" placeholder="Email atau nomor HP"
              value={form.identifier} onChange={e => set('identifier', e.target.value)} />
            <I label="Password" type="password" placeholder="Password Anda"
              value={form.password} onChange={e => set('password', e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()} />
            <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ marginBottom: 10 }}>
              {loading ? 'Masuk...' : 'Masuk ke RouteAI'}
            </button>
          </>
        ) : (
          <>
            <I label="Nama Lengkap" type="text" placeholder="Nama lengkap Anda"
              value={form.name} onChange={e => set('name', e.target.value)} />
            <I label="Email" type="email" placeholder="contoh@email.com"
              value={form.email} onChange={e => set('email', e.target.value)} />
            <I label="No. HP (opsional)" type="tel" placeholder="+62 812 3456 7890"
              value={form.phone} onChange={e => set('phone', e.target.value)} />
            <I label="Password" type="password" placeholder="Min. 6 karakter"
              value={form.password} onChange={e => set('password', e.target.value)} />
            <button className="btn-primary" onClick={handleRegister} disabled={loading} style={{ marginBottom: 10 }}>
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </>
        )}

        <div style={ss.divider}><span style={{ background: '#161B22', padding: '0 12px', color: '#3D444D' }}>atau</span></div>

        <div style={{ display: 'flex', gap: 9 }}>
          <button style={ss.socialBtn} onClick={handleDemoLogin}>
            <span style={{ fontSize: 16 }}>🚀</span> Coba Demo
          </button>
          <button style={ss.socialBtn} onClick={handleDemoLogin}>
            <span style={{ fontSize: 16 }}>G</span> Google
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3D444D', marginTop: 18 }}>
          Dengan mendaftar, kamu setuju dengan Syarat & Ketentuan RouteAI
        </p>
      </div>
    </div>
  );
}

const ss = {
  root: { height: '100%', background: '#0D1117', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  topArea: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 0 20px' },
  logo: { width: 64, height: 64, background: '#6B5CE7', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 26, fontWeight: 700, color: '#F0F6FC' },
  sub: { fontSize: 13, color: '#8B949E', marginTop: 5, textAlign: 'center', padding: '0 30px' },
  form: { background: '#161B22', borderRadius: '22px 22px 0 0', padding: '26px 22px 40px' },
  tabs: { display: 'flex', background: '#0D1117', borderRadius: 10, padding: 3, marginBottom: 18 },
  tabBtn: { flex: 1, padding: '9px', border: 'none', background: 'transparent', color: '#8B949E', borderRadius: 7, fontSize: 14, fontWeight: 500 },
  tabActive: { background: '#6B5CE7', color: '#fff' },
  divider: { textAlign: 'center', color: 'transparent', borderTop: '0.5px solid rgba(255,255,255,0.07)', margin: '16px 0', position: 'relative', lineHeight: 0 },
  socialBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, background: '#0D1117', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#F0F6FC', fontSize: 13 },
  linkBtn: { background: 'none', border: 'none', color: '#7B6FFF', fontSize: 13, width: '100%', textAlign: 'center', padding: 8 }
};