// src/screens/LiveShareScreen.jsx – Pantau perjalanan tanpa login
// FIX: Auto-refresh setiap 30 detik benar-benar diimplementasi (sebelumnya hanya klaim di teks)
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { routeAPI } from '../services/api';

export default function LiveShareScreen() {
  const { token }   = useParams();
  const [trip,      setTrip]     = useState(null);
  const [error,     setError]    = useState(null);
  const [lastSync,  setLastSync] = useState(null);
  const [countdown, setCountdown]= useState(30);
  const intervalRef = useRef(null);
  const countRef    = useRef(null);

  const fetchTrip = async () => {
    try {
      const r = await routeAPI.getLiveShare(token);
      setTrip(r.data.data);
      setLastSync(new Date());
      setCountdown(30);
      setError(null);
    } catch {
      setError('Link tidak valid atau sudah kadaluarsa.');
    }
  };

  useEffect(() => {
    fetchTrip();

    // Auto-refresh setiap 30 detik
    intervalRef.current = setInterval(fetchTrip, 30000);

    // Countdown display
    countRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? 30 : c - 1));
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countRef.current);
    };
  }, [token]); // eslint-disable-line

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1117', color: '#F0F6FC', textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ marginBottom: 8 }}>Link Tidak Valid</h2>
        <p style={{ color: '#8B949E', maxWidth: 260, margin: '0 auto' }}>{error}</p>
      </div>
    </div>
  );

  if (!trip) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0D1117', gap: 14 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
      <p style={{ color: '#8B949E', fontSize: 13 }}>Memuat data perjalanan...</p>
    </div>
  );

  const eta = trip.eta
    ? new Date(trip.eta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '-';
  const syncTime = lastSync
    ? lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-';

  const statusConfig = {
    active:    { label: '● Sedang Berjalan', color: '#1FAD8E', bg: 'rgba(31,173,142,0.12)' },
    completed: { label: '✓ Telah Tiba',      color: '#7B6FFF', bg: 'rgba(107,92,231,0.12)' },
    planned:   { label: '⏳ Belum Berangkat', color: '#C47F20', bg: 'rgba(196,127,32,0.12)' },
  };
  const sc = statusConfig[trip.status] || statusConfig.planned;

  return (
    <div style={{ height: '100%', background: '#0D1117', display: 'flex', flexDirection: 'column', color: '#F0F6FC', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#161B22', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>RouteAI — Live Share</div>
            <div style={{ fontSize: 11, color: '#8B949E' }}>Pantau perjalanan secara real-time</div>
          </div>
        </div>
      </div>

      {/* Konten */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Info driver & status */}
        <div style={{ background: '#161B22', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#21262D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {trip.driver?.avatar
                ? <img src={trip.driver.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
                : <span style={{ fontSize: 20 }}>👤</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{trip.driver?.name || 'Pengguna RouteAI'}</div>
              <span style={{ fontSize: 10, padding: '2px 8px', background: sc.bg, color: sc.color, borderRadius: 10, fontWeight: 600 }}>
                {sc.label}
              </span>
            </div>
          </div>

          {/* Rute */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { dot: '#1FAD8E', label: 'Dari', val: trip.origin?.name || trip.origin?.address || '-' },
              { dot: '#D95050', label: 'Ke',   val: trip.destination?.name || trip.destination?.address || '-' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: '#8B949E' }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <div style={{ background: '#161B22', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#7B6FFF' }}>{eta}</div>
            <div style={{ fontSize: 11, color: '#8B949E', marginTop: 4 }}>Estimasi Tiba</div>
          </div>
          <div style={{ background: '#161B22', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: sc.color }}>{trip.status === 'active' ? '● Live' : trip.status === 'completed' ? '✓ Tiba' : '⏳'}</div>
            <div style={{ fontSize: 11, color: '#8B949E', marginTop: 4 }}>Status</div>
          </div>
        </div>

        {/* Auto-refresh info — sekarang benar-benar berjalan */}
        <div style={{ background: 'rgba(107,92,231,0.07)', border: '0.5px solid rgba(107,92,231,0.15)', borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, color: '#F0F6FC', fontWeight: 500 }}>🔄 Auto-refresh aktif</p>
              <p style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>
                Terakhir diperbarui: {syncTime}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#6B5CE7' }}>{countdown}</div>
              <div style={{ fontSize: 9, color: '#3D444D' }}>detik</div>
            </div>
          </div>
          {/* Progress bar countdown */}
          <div style={{ height: 2, background: '#21262D', borderRadius: 1, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((30 - countdown) / 30) * 100}%`, background: '#6B5CE7', borderRadius: 1, transition: 'width 1s linear' }} />
          </div>
        </div>

        {/* Manual refresh */}
        <button
          onClick={fetchTrip}
          style={{ background: '#21262D', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px', color: '#F0F6FC', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          ↻ Refresh Sekarang
        </button>

        <p style={{ fontSize: 10, color: '#3D444D', textAlign: 'center' }}>
          Powered by RouteAI · Platform Navigasi Cerdas Indonesia
        </p>
      </div>
    </div>
  );
}
