// src/screens/SplashScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

const steps = ['Mendeteksi lokasi...', 'Menghubungkan AI...', 'Inisialisasi layanan...', 'Siap!'];
export default function SplashScreen() {
  const navigate = useNavigate();
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 600);
    const progressInterval = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 44);

    const timer = setTimeout(() => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      navigate(isAuthenticated ? '/app' : '/auth');
    }, 2400);

    return () => { clearTimeout(timer); clearInterval(stepInterval); clearInterval(progressInterval); };
  }, [navigate, isAuthenticated]);

  return (
    <div style={{ height: '100%', background: '#0D1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 80, height: 80, background: '#6B5CE7', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounceIn 0.6s ease' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, color: '#F0F6FC' }}>RouteAI</h1>
        <p style={{ fontSize: 13, color: '#8B949E', marginTop: 4 }}>Platform Navigasi Cerdas Indonesia</p>
      </div>
      <div style={{ width: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ width: '100%', height: 3, background: '#21262D', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#6B5CE7', borderRadius: 2, transition: 'width 0.05s linear' }} />
        </div>
        <p style={{ fontSize: 11, color: '#3D444D' }}>{steps[step]}</p>
      </div>
      <div style={{ position: 'absolute', bottom: 30, color: '#3D444D', fontSize: 11 }}>
        v1.0.0 — Didukung OpenStreetMap & Claude AI
      </div>
    </div>
  );
}
