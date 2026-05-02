// src/screens/LiveShareScreen.jsx - Pantau perjalanan tanpa login
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { routeAPI } from '../services/api';

export default function LiveShareScreen() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    routeAPI.getLiveShare(token)
      .then(r => setTrip(r.data.data))
      .catch(() => setError('Link tidak valid atau sudah kadaluarsa.'));
  }, [token]);

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1117', color: '#F0F6FC', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <h2 style={{ marginBottom: 8 }}>Link Tidak Valid</h2>
        <p style={{ color: '#8B949E' }}>{error}</p>
      </div>
    </div>
  );

  if (!trip) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1117' }}>
      <div className="spinner" />
    </div>
  );

  const eta = trip.eta ? new Date(trip.eta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div style={{ height: '100%', background: '#0D1117', display: 'flex', flexDirection: 'column', color: '#F0F6FC' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>RouteAI — Live Share</div>
            <div style={{ fontSize: 11, color: '#8B949E' }}>Pantau perjalanan real-time</div>
          </div>
        </div>
      </div>

      {/* Trip info */}
      <div style={{ padding: 16 }}>
        <div style={{ background: '#161B22', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#21262D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{trip.driver?.name || 'Pengguna RouteAI'}</div>
              <span style={{ fontSize: 10, padding: '2px 8px', background: trip.status === 'active' ? 'rgba(31,173,142,0.15)' : 'rgba(107,92,231,0.15)', color: trip.status === 'active' ? '#1FAD8E' : '#7B6FFF', borderRadius: 10, fontWeight: 600 }}>
                {trip.status === 'active' ? '● Sedang Berjalan' : trip.status === 'completed' ? '✓ Selesai' : 'Direncanakan'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1FAD8E', marginTop: 3, flexShrink: 0 }} />
              <div><div style={{ fontSize: 11, color: '#8B949E' }}>Dari</div><div style={{ fontSize: 13, fontWeight: 500 }}>{trip.origin?.name || trip.origin?.address || '-'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D95050', marginTop: 3, flexShrink: 0 }} />
              <div><div style={{ fontSize: 11, color: '#8B949E' }}>Ke</div><div style={{ fontSize: 13, fontWeight: 500 }}>{trip.destination?.name || trip.destination?.address || '-'}</div></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
          <div style={{ background: '#161B22', borderRadius: 11, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#7B6FFF' }}>{eta}</div>
            <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>Estimasi Tiba</div>
          </div>
          <div style={{ background: '#161B22', borderRadius: 11, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: trip.status === 'active' ? '#1FAD8E' : '#8B949E' }}>
              {trip.status === 'active' ? '● Live' : trip.status === 'completed' ? '✓ Tiba' : '⏳ Belum'}
            </div>
            <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>Status</div>
          </div>
        </div>

        <div style={{ background: 'rgba(107,92,231,0.1)', border: '0.5px solid rgba(107,92,231,0.2)', borderRadius: 11, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#8B949E' }}>Halaman ini diperbarui otomatis setiap 30 detik.</p>
          <p style={{ fontSize: 11, color: '#3D444D', marginTop: 4 }}>Powered by RouteAI — Platform Navigasi Cerdas Indonesia</p>
        </div>
      </div>
    </div>
  );
}
