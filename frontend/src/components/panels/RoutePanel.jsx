// src/components/panels/RoutePanel.jsx
import React, { useEffect, useState } from 'react';
import { PanelBase } from '../index';
import { aiAPI } from '../../services/api';

export default function RoutePanel({ isOpen, onClose, route, origin, destination, onClearRoute, onStartNav, onChangeRouteType }) {
  const [aiAnalysis, setAiAnalysis] = useState('Menganalisis kondisi rute...');

  useEffect(() => {
    if (!route || !destination) return;
    aiAPI.analyzeRoute(route, origin?.name || 'Asal', destination.name, 'Mobil')
      .then(r => setAiAnalysis(r.data.data.analysis))
      .catch(() => setAiAnalysis('Rute optimal ditemukan. Waspadai kemacetan dan potensi hujan sore hari.'));
  }, [route, destination]);

  if (!route || !destination) return null;

  const dist = (route.distance / 1000).toFixed(1);
  const dur = Math.round(route.duration / 60);
  const eta = new Date(Date.now() + route.duration * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fuelCost = Math.round((route.distance / 1000) * 1300);
  const co2 = Math.round((route.distance / 1000) * 120);
  const ecoScore = Math.min(100, Math.max(20, 100 - Math.floor(co2 / 500 * 100)));

  const steps = route.legs?.[0]?.steps?.slice(0, 7) || [];

  const typeLabels = { fastest: 'Tercepat', eco: 'Hemat BBM', no_toll: 'Tanpa Tol' };

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Detail Rute">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[['⏱', dur + ' mnt', 'Waktu'], ['📍', dist + ' km', 'Jarak'], ['🕐', eta, 'Tiba']].map(([ic, v, l]) => (
          <div key={l} style={{ background: '#21262D', borderRadius: 10, padding: 11, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#7B6FFF' }}>{v}</div>
            <div style={{ fontSize: 10, color: '#8B949E', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Route type selector */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
        {['fastest', 'eco', 'no_toll'].map(type => (
          <button
            key={type}
            onClick={() => onChangeRouteType?.(type)}
            style={{
              padding: '6px 12px',
              borderRadius: 18,
              border: '0.5px solid rgba(255,255,255,0.1)',
              background: route.type === type ? '#6B5CE7' : '#21262D',
              color: '#F0F6FC',
              fontSize: 12,
              cursor: 'pointer'
            }}>
            {typeLabels[type]}
          </button>
        ))}
      </div>

      {/* AI Analysis */}
      <div style={{ background: 'rgba(107,92,231,0.1)', border: '0.5px solid rgba(107,92,231,0.25)', borderRadius: 11, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#7B6FFF', marginBottom: 5 }}>Analisis AI RouteAI</p>
        <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.6 }}>{aiAnalysis}</p>
      </div>

      {/* Eco & Cost */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'rgba(31,173,142,0.1)', border: '0.5px solid rgba(31,173,142,0.2)', borderRadius: 9, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1FAD8E' }}>{ecoScore}</div>
          <div style={{ fontSize: 10, color: '#8B949E' }}>Eco Score</div>
        </div>
        <div style={{ background: 'rgba(196,127,32,0.1)', border: '0.5px solid rgba(196,127,32,0.2)', borderRadius: 9, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#C47F20' }}>Rp {fuelCost.toLocaleString('id-ID')}</div>
          <div style={{ fontSize: 10, color: '#8B949E' }}>Est. BBM</div>
        </div>
      </div>

      {/* Steps */}
      <p className="section-label">Langkah Navigasi</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {steps.map((s, i) => {
          const ds = s.distance > 1000 ? (s.distance / 1000).toFixed(1) + ' km' : Math.round(s.distance) + ' m';
          const name = s.name || 'jalan';
          const type = s.maneuver?.type || '';
          const mod = s.maneuver?.modifier || '';
          let instruction = name;
          if (type === 'depart') instruction = 'Mulai dari lokasi Anda';
          else if (type === 'arrive') instruction = `Tiba di ${destination.name}`;
          else if (type === 'turn') instruction = `Belok ${mod === 'left' ? 'kiri' : mod === 'right' ? 'kanan' : mod} ke ${name}`;
          else if (type === 'continue') instruction = `Lurus di ${name}`;
          return (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#1FAD8E' : i === steps.length - 1 ? '#D95050' : '#6B5CE7', marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{instruction}</div>
                <div style={{ fontSize: 11, color: '#8B949E' }}>{ds} · {Math.round(s.duration / 60)} mnt</div>
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 11, padding: '8px 0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D95050', marginTop: 4, flexShrink: 0 }} />
          <div style={{ fontSize: 13 }}>Tiba di {destination.name}</div>
        </div>
      </div>

      <button className="btn-primary" onClick={onStartNav} style={{ marginBottom: 8 }}>Mulai Navigasi</button>
      <button className="btn-secondary" onClick={() => {
        const url = `routeai.id/s/${Math.random().toString(36).substr(2, 7)}`;
        alert('Link dibuat: ' + url);
      }}>Bagikan Link Perjalanan</button>
    </PanelBase>
  );
}