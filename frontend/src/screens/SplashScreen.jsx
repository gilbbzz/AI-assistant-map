// src/screens/SplashScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

const STEPS = [
  'Mendeteksi lokasi GPS...',
  'Memuat data lalu lintas...',
  'Menghubungkan layanan AI...',
  'Siap!',
];

export default function SplashScreen() {
  const navigate       = useNavigate();
  const isAuthenticated= useStore(s => s.isAuthenticated);
  const [step,     setStep]    = useState(0);
  const [progress, setProgress]= useState(0);

  useEffect(() => {
    const stepI = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 600);
    const progI = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 44);

    const timer = setTimeout(() => {
      clearInterval(stepI); clearInterval(progI);
      navigate(isAuthenticated ? '/app' : '/auth');
    }, 2500);

    return () => { clearTimeout(timer); clearInterval(stepI); clearInterval(progI); };
  }, [navigate, isAuthenticated]);

  return (
    <div style={{ height: '100%', background: '#0D1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      {/* Logo */}
      <div style={{ position: 'relative' }}>
        <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg,#6B5CE7,#8B5CF6)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounceIn 0.6s ease', boxShadow: '0 8px 32px rgba(107,92,231,0.4)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', inset: -8, borderRadius: 30, background: 'rgba(107,92,231,0.12)', animation: 'pulse 2s ease-in-out infinite' }} />
      </div>

      {/* Teks */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5, color: '#F0F6FC' }}>RouteAI</h1>
        <p style={{ fontSize: 13, color: '#8B949E', marginTop: 5 }}>Platform Navigasi Cerdas Indonesia</p>
      </div>

      {/* Progress */}
      <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ width: '100%', height: 3, background: '#21262D', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#6B5CE7,#1FAD8E)', borderRadius: 2, transition: 'width 0.05s linear' }} />
        </div>
        <p style={{ fontSize: 11, color: '#3D444D', height: 16 }}>{STEPS[step]}</p>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 28, color: '#3D444D', fontSize: 11, textAlign: 'center' }}>
        v1.0.0 · Groq AI (llama-3.3-70b) · OpenStreetMap
      </div>
    </div>
  );
}
