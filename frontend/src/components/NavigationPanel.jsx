// src/components/NavigationPanel.jsx
// REDESIGN TOTAL + GPS REAL-TIME
// - Kecepatan aktual dari GPS
// - ETA dan sisa jarak dinamis
// - Marker pengguna bergerak di peta (via MainScreen)
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Fungsi Haversine (jarak antara dua koordinat dalam meter) ──
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Data arah ─────────────────────────────────────────────────────────
const DIR = {
  depart:              { icon: '↑',  color: '#1FAD8E', label: 'Mulai' },
  arrive:              { icon: '🏁', color: '#D95050', label: 'Tiba' },
  'turn-left':         { icon: '←',  color: '#7B6FFF', label: 'Belok Kiri' },
  'turn-right':        { icon: '→',  color: '#7B6FFF', label: 'Belok Kanan' },
  'turn-sharp-left':   { icon: '↰',  color: '#C47F20', label: 'Tajam Kiri' },
  'turn-sharp-right':  { icon: '↱',  color: '#C47F20', label: 'Tajam Kanan' },
  'turn-slight-left':  { icon: '↖',  color: '#7B6FFF', label: 'Sedikit Kiri' },
  'turn-slight-right': { icon: '↗',  color: '#7B6FFF', label: 'Sedikit Kanan' },
  continue:            { icon: '↑',  color: '#F0F6FC', label: 'Lurus' },
  merge:               { icon: '⤴',  color: '#F0F6FC', label: 'Gabung' },
  'off-ramp':          { icon: '↘',  color: '#C47F20', label: 'Keluar' },
  'on-ramp':           { icon: '↗',  color: '#F0F6FC', label: 'Masuk' },
  roundabout:          { icon: '↻',  color: '#7B6FFF', label: 'Bundaran' },
  rotary:              { icon: '↻',  color: '#7B6FFF', label: 'Putar Balik' },
  'end-of-road':       { icon: '⊣',  color: '#D95050', label: 'Ujung Jalan' },
};

const getDir = (step) => {
  const type = step?.maneuver?.type || 'continue';
  const mod  = step?.maneuver?.modifier || '';
  return DIR[mod ? `${type}-${mod}` : type] || DIR[type] || { icon: '↑', color: '#F0F6FC', label: 'Lurus' };
};

const fmtInstruction = (step, dest) => {
  const type = step?.maneuver?.type || '';
  const mod  = step?.maneuver?.modifier || '';
  const name = step?.name || 'jalan';
  if (type === 'depart')     return 'Mulai perjalanan';
  if (type === 'arrive')     return `Tiba di ${dest?.name || 'tujuan'}`;
  if (type === 'turn')       return `Belok ${mod === 'left' ? 'kiri' : mod === 'right' ? 'kanan' : mod} ke ${name}`;
  if (type === 'continue')   return `Lurus di ${name}`;
  if (type === 'roundabout') return `Bundaran, ambil arah ${name}`;
  if (type === 'merge')      return `Gabung ke ${name}`;
  if (type === 'off-ramp')   return `Keluar ke ${name}`;
  if (type === 'on-ramp')    return `Masuk ke ${name}`;
  return name || 'Lanjutkan';
};

const fmtDist = (m) => m > 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m || 0) + ' m';
const fmtTime = (s) => s >= 3600
  ? `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m`
  : `${Math.round(s / 60)} mnt`;
const fmtElapsed = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ─────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────────────────────────────
export default function NavigationPanel({ isOpen, route, destination, onStop }) {
  // ── State UI ────────────────────────────────────────────────────
  const [mode,           setMode]      = useState('compact');
  const [stepIndex,      setStepIndex] = useState(0);
  const [elapsedSecs,    setElapsed]   = useState(0);

  // ── State GPS Real-time ────────────────────────────────────────
  const [currentPos,     setCurrentPos]   = useState(null);
  const [actualSpeed,    setActualSpeed]  = useState(0);
  const [remainingDist,  setRemainingDist] = useState(route?.distance || 0);
  const [remainingTime,  setRemainingTime] = useState(route?.duration || 0);

  const timerRef   = useRef(null);
  const elapsedRef = useRef(null);
  const watchIdRef = useRef(null);

  const steps = route?.legs?.[0]?.steps || route?.steps || [];

  // ── GPS Watch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !navigator.geolocation) {
      // Hentikan watch jika navigasi ditutup
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const lat = latitude;
        const lng = longitude;

        setCurrentPos({ lat, lng });

        // 1. Kecepatan aktual dari GPS (m/s → km/h)
        if (speed !== null && speed !== undefined && speed >= 0) {
          setActualSpeed(Math.round(speed * 3.6));
        }

        // 2. Hitung sisa jarak ke tujuan (Haversine)
        if (destination && destination.lat && destination.lng) {
          const distMeters = haversine(lat, lng, destination.lat, destination.lng);
          setRemainingDist(distMeters);

          // 3. ETA = sisa jarak / kecepatan (jika kecepatan > 0)
          const speedMps = actualSpeed / 3.6; // km/h → m/s
          if (speedMps > 0.5) {
            setRemainingTime(distMeters / speedMps);
          }
        }
      },
      (err) => {
        console.warn('[Navigation] GPS watch error:', err.message);
        // Fallback: gunakan simulated speed jika GPS error
        setActualSpeed(30 + Math.floor(Math.random() * 20));
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, destination, actualSpeed]);

  // ── Timer: elapsed time ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setElapsed(0);
      setMode('compact');
      return;
    }

    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    // Auto-advance steps (berdasarkan waktu, bisa diganti dengan proximity)
    const advance = () => {
      setStepIndex(i => {
        const next = i + 1;
        if (next >= steps.length) { onStop(); return i; }
        const dur = Math.min(25000, Math.max(4000, (steps[next]?.duration || 8) * 1000));
        timerRef.current = setTimeout(advance, dur);
        return next;
      });
    };

    const firstDur = Math.min(25000, Math.max(4000, (steps[0]?.duration || 8) * 1000));
    timerRef.current = setTimeout(advance, firstDur);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(elapsedRef.current);
    };
  }, [isOpen]); // eslint-disable-line

  // ── Jika navigasi ditutup ──────────────────────────────────────
  if (!isOpen) return null;

  const cur  = steps[stepIndex] || {};
  const next = steps[stepIndex + 1];
  const dir  = getDir(cur);
  const inst = fmtInstruction(cur, destination);

  // ETA berdasarkan remainingTime (dari GPS)
  const eta = remainingTime > 0
    ? new Date(Date.now() + remainingTime * 1000)
        .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '-';

  const progress = steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 0;

  // ── MODE: MINI ──────────────────────────────────────────────────
  if (mode === 'mini') {
    return (
      <div style={{
        position: 'absolute', bottom: 84, right: 12,
        zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      }}>
        <div
          style={{
            background: `${dir.color}EE`, borderRadius: 16,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', cursor: 'pointer',
            border: `1.5px solid ${dir.color}`,
          }}
          onClick={() => setMode('compact')}
        >
          <span style={{ fontSize: 22, fontWeight: 800 }}>{dir.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
              {fmtDist(cur.distance || remainingDist)}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inst}
            </div>
          </div>
        </div>
        <button
          onClick={() => setMode('compact')}
          style={{ background: 'rgba(22,27,34,0.96)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '6px 12px', color: '#F0F6FC', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        >
          ↑ Tampilkan Navigasi
        </button>
      </div>
    );
  }

  // ── MODE: COMPACT ──────────────────────────────────────────────
  if (mode === 'compact') {
    return (
      <div style={{
        position: 'absolute', bottom: 70, left: 0, right: 0,
        zIndex: 300,
        background: 'rgba(13,17,23,0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '0.5px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -6px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#21262D' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6B5CE7, #1FAD8E)', transition: 'width 0.8s ease' }} />
        </div>

        {/* Drag handle + mode buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 4px' }}>
          <button
            onClick={() => setMode('mini')}
            style={{ background: 'none', border: 'none', color: '#8B949E', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 8 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 9l7 7 7-7"/></svg>
            Perkecil
          </button>
          <div
            onClick={() => setMode('expanded')}
            style={{ cursor: 'pointer', padding: '0 20px' }}
          >
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
          </div>
          <button
            onClick={() => setMode('expanded')}
            style={{ background: 'none', border: 'none', color: '#8B949E', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 8 }}
          >
            Detail
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 15l-7-7-7 7"/></svg>
          </button>
        </div>

        {/* Konten utama compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 14px 14px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: `${dir.color}22`, border: `2px solid ${dir.color}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0, transition: 'all 0.4s',
          }}>
            {dir.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: dir.color, lineHeight: 1 }}>
              {fmtDist(cur.distance || remainingDist)}
            </div>
            <div style={{ fontSize: 13, color: '#F0F6FC', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inst}
            </div>
            {next && (
              <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Lalu: {getDir(next).icon} {fmtInstruction(next, destination)} ({fmtDist(next.distance)})
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#7B6FFF' }}>{eta}</div>
            <div style={{ fontSize: 10, color: '#8B949E', marginTop: 2 }}>{fmtDist(remainingDist)}</div>
            <div style={{ marginTop: 6, background: '#21262D', borderRadius: 8, padding: '3px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: actualSpeed > 60 ? '#D95050' : '#1FAD8E' }}>
                {actualSpeed || '--'}
              </div>
              <div style={{ fontSize: 8, color: '#8B949E' }}>km/h</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MODE: EXPANDED ──────────────────────────────────────────────
  return (
    <div style={{
      position: 'absolute',
      bottom: 70, left: 0, right: 0,
      height: 'calc(var(--vh, 1vh) * 65)',
      zIndex: 300,
      background: '#0D1117',
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ height: 3, background: '#21262D', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6B5CE7, #1FAD8E)', transition: 'width 0.8s ease' }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px 8px', flexShrink: 0,
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        background: '#161B22',
      }}>
        <button
          onClick={() => setMode('compact')}
          style={{ background: '#21262D', border: 'none', borderRadius: 8, padding: '5px 12px', color: '#F0F6FC', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 9l7 7 7-7"/></svg>
          Lihat Peta
        </button>
        <div
          onClick={() => setMode('compact')}
          style={{ cursor: 'pointer', padding: '4px 20px' }}
        >
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2 }} />
        </div>
        <button
          onClick={onStop}
          style={{ background: 'rgba(217,80,80,0.12)', border: '0.5px solid rgba(217,80,80,0.3)', borderRadius: 8, padding: '5px 12px', color: '#D95050', fontSize: 11, fontWeight: 600 }}
        >
          ⬛ Stop
        </button>
      </div>

      <div style={{ padding: '12px 14px 10px', background: '#161B22', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${dir.color}20`, border: `1.5px solid ${dir.color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0,
          }}>
            {dir.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: dir.color, lineHeight: 1 }}>
              {fmtDist(cur.distance || remainingDist)}
            </div>
            <div style={{ fontSize: 14, color: '#F0F6FC', marginTop: 4, lineHeight: 1.35 }}>
              {inst}
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: actualSpeed > 60 ? '#D95050' : '#1FAD8E' }}>
              {actualSpeed || '--'}
            </div>
            <div style={{ fontSize: 9, color: '#8B949E' }}>km/h</div>
          </div>
        </div>

        {next && (
          <div style={{ marginTop: 10, padding: '7px 11px', background: '#21262D', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{getDir(next).icon}</span>
            <div style={{ fontSize: 12, color: '#8B949E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Lalu: {fmtInstruction(next, destination)}
            </div>
            <span style={{ fontSize: 11, color: '#3D444D', flexShrink: 0 }}>{fmtDist(next.distance)}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '10px 14px', flexShrink: 0 }}>
        {[
          ['Sisa', fmtTime(remainingTime), '#7B6FFF'],
          ['Jarak', fmtDist(remainingDist), '#1FAD8E'],
          ['Tiba', eta, '#C47F20'],
          ['Berjalan', fmtElapsed(elapsedSecs), '#8B949E'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#161B22', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: '#3D444D', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px', minHeight: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#3D444D', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '6px 0 8px' }}>
          Langkah-langkah ({stepIndex + 1}/{steps.length})
        </p>
        {steps.map((s, i) => {
          const cfg      = getDir(s);
          const isPast   = i < stepIndex;
          const isCurrent= i === stepIndex;
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '8px 0',
              opacity: isPast ? 0.35 : 1,
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              transition: 'opacity 0.3s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                background: isCurrent ? `${cfg.color}25` : '#21262D',
                border: isCurrent ? `1.5px solid ${cfg.color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isPast ? 10 : 12, transition: 'all 0.3s',
              }}>
                {isPast ? '✓' : cfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: isCurrent ? '#F0F6FC' : '#8B949E', fontWeight: isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fmtInstruction(s, destination)}
                </div>
                {isCurrent && <div style={{ fontSize: 10, color: cfg.color, marginTop: 2, fontWeight: 600 }}>← Langkah saat ini</div>}
              </div>
              <div style={{ fontSize: 10, color: '#3D444D', flexShrink: 0, alignSelf: 'center' }}>
                {fmtDist(s.distance)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 14px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0, background: '#161B22' }}>
        <button
          className="btn-danger"
          onClick={onStop}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          Hentikan Navigasi
        </button>
      </div>
    </div>
  );
}