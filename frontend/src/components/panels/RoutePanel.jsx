// src/components/panels/RoutePanel.jsx
import React, { useEffect, useState } from 'react';
import { PanelBase } from '../index';
import { aiAPI, routeAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function RoutePanel({
  isOpen, onClose, route, origin, destination,
  onClearRoute, onStartNav, onChangeRouteType
}) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!route || !destination) return;
    setAiAnalysis(null);
    aiAPI.analyzeRoute(route, origin?.name || 'Asal', destination.name, 'Mobil')
      .then(r => setAiAnalysis(r.data.data.analysis))
      .catch(() => setAiAnalysis('Rute optimal ditemukan. Waspadai kemacetan dan potensi hujan sore hari.'));
  }, [route?.id, destination?.name]);

  if (!route || !destination) return null;

  const dist     = ((route.distance || 0) / 1000).toFixed(1);
  const dur      = Math.round((route.duration || 0) / 60);
  const eta      = new Date(Date.now() + (route.duration || 0) * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fuelCost = route.fuelCost || Math.round((route.distance / 1000) * 1350);
  const co2      = route.co2 || Math.round((route.distance / 1000) * 115);
  const ecoScore = route.ecoScore || Math.min(100, Math.max(20, 100 - Math.floor(co2 / 500 * 100)));

  const steps = route.legs?.[0]?.steps?.slice(0, 7) || route.steps?.slice(0, 7) || [];

  const typeConfig = {
    fastest: { label: '⚡ Tercepat', color: '#7B6FFF' },
    eco:     { label: '🌿 Hemat BBM', color: '#1FAD8E' },
    no_toll: { label: '🛣 Tanpa Tol', color: '#C47F20' },
  };

  // FIX: share link sekarang memanggil API yang sesungguhnya
  const handleShare = async () => {
    if (!route._tripId && !route.tripId) {
      toast.error('Simpan rute terlebih dahulu untuk berbagi.');
      return;
    }
    setSharing(true);
    try {
      const tripId = route._tripId || route.tripId;
      const res = await routeAPI.shareTrip(tripId);
      if (res.data.success) {
        const { shareUrl } = res.data.data;
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        toast.success('Link perjalanan disalin!', { icon: '🔗' });
      }
    } catch (err) {
      toast.error('Gagal membuat link perjalanan.');
    } finally {
      setSharing(false);
    }
  };

  const maneuverIcon = (type, modifier) => {
    if (type === 'turn' && modifier === 'left') return '↰';
    if (type === 'turn' && modifier === 'right') return '↱';
    if (type === 'arrive') return '📍';
    if (type === 'depart') return '🟢';
    return '↑';
  };

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Detail Rute">
      {/* Stats utama */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          ['⏱', dur + ' mnt', 'Waktu'],
          ['📍', dist + ' km', 'Jarak'],
          ['🕐', eta, 'Tiba'],
        ].map(([ic, v, l]) => (
          <div key={l} style={{ background: '#21262D', borderRadius: 10, padding: 11, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#7B6FFF' }}>{v}</div>
            <div style={{ fontSize: 10, color: '#8B949E', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Pemilih tipe rute */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {['fastest', 'eco', 'no_toll'].map(type => {
          const cfg = typeConfig[type];
          const isActive = route.type === type;
          return (
            <button
              key={type}
              onClick={() => onChangeRouteType?.(type)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 10,
                border: `0.5px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                background: isActive ? `${cfg.color}20` : '#21262D',
                color: isActive ? cfg.color : '#8B949E',
                fontSize: 11,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Analisis AI */}
      <div style={{ background: 'rgba(107,92,231,0.08)', border: '0.5px solid rgba(107,92,231,0.2)', borderRadius: 11, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#7B6FFF', marginBottom: 5 }}>🤖 Analisis RouteAI</p>
        {aiAnalysis ? (
          <p style={{ fontSize: 12, color: '#8B949E', lineHeight: 1.6 }}>{aiAnalysis}</p>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div className="loading-dots">
              <div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/>
            </div>
            <span style={{ fontSize: 11, color: '#3D444D' }}>Menganalisis rute...</span>
          </div>
        )}
      </div>

      {/* Eco & Biaya */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'rgba(31,173,142,0.1)', border: '0.5px solid rgba(31,173,142,0.2)', borderRadius: 9, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1FAD8E' }}>{ecoScore}</div>
          <div style={{ fontSize: 10, color: '#8B949E' }}>Eco Score</div>
          <div style={{ fontSize: 10, color: '#3D444D', marginTop: 2 }}>{co2} g CO₂</div>
        </div>
        <div style={{ background: 'rgba(196,127,32,0.1)', border: '0.5px solid rgba(196,127,32,0.2)', borderRadius: 9, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#C47F20' }}>Rp {fuelCost.toLocaleString('id-ID')}</div>
          <div style={{ fontSize: 10, color: '#8B949E' }}>Est. BBM</div>
          <div style={{ fontSize: 10, color: '#3D444D', marginTop: 2 }}>~{dist} km</div>
        </div>
      </div>

      {/* Langkah navigasi */}
      {steps.length > 0 && (
        <>
          <p className="section-label">Petunjuk Arah</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {steps.map((s, i) => {
              const ds  = s.distance > 1000 ? (s.distance / 1000).toFixed(1) + ' km' : Math.round(s.distance) + ' m';
              const type = s.maneuver?.type || '';
              const mod  = s.maneuver?.modifier || '';
              const name = s.name || 'jalan';
              let instruction;
              if (type === 'depart')       instruction = 'Mulai dari lokasi Anda';
              else if (type === 'arrive')  instruction = `Tiba di ${destination.name}`;
              else if (type === 'turn')    instruction = `Belok ${mod === 'left' ? 'kiri' : mod === 'right' ? 'kanan' : mod} ke ${name}`;
              else if (type === 'continue') instruction = `Lurus terus di ${name}`;
              else                          instruction = name;
              return (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? 'rgba(31,173,142,0.2)' : i === steps.length - 1 ? 'rgba(217,80,80,0.2)' : 'rgba(107,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 1 }}>
                    {maneuverIcon(type, mod)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{instruction}</div>
                    <div style={{ fontSize: 10, color: '#8B949E' }}>{ds} · {Math.round((s.duration || 0) / 60)} mnt</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CTA buttons */}
      <button className="btn-primary" onClick={onStartNav} style={{ marginBottom: 8 }}>
        ▶ Mulai Navigasi
      </button>
      <button
        className="btn-secondary"
        onClick={handleShare}
        disabled={sharing}
        style={{ marginBottom: 8 }}
      >
        {sharing ? 'Membuat link...' : '🔗 Bagikan Link Perjalanan'}
      </button>
      <button className="btn-secondary" onClick={onClearRoute} style={{ color: '#D95050' }}>
        Hapus Rute
      </button>
    </PanelBase>
  );
}
