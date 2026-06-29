// src/components/HeatmapLayer.jsx
// Heatmap visual berkualitas tinggi menggunakan Leaflet Circle berlapis.
// Setiap titik kemacetan ditampilkan sebagai gradient multi-layer dengan
// animasi pulse dan label keterangan.
import React, { useEffect, useRef } from 'react';
import { Circle, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// ── Warna berdasarkan level kemacetan ─────────────────────────────────
const LEVEL_COLORS = {
  macet:  { fill: '#D95050', stroke: '#FF3B3B', label: 'Macet' },
  padat:  { fill: '#C47F20', stroke: '#FFA500', label: 'Padat' },
  sedang: { fill: '#C8A800', stroke: '#FFD700', label: 'Sedang' },
  lancar: { fill: '#1FAD8E', stroke: '#00E5C3', label: 'Lancar' },
};

// ── Ikon label kemacetan di peta ──────────────────────────────────────
const createTrafficIcon = (level, speed, name) => {
  const c = LEVEL_COLORS[level] || LEVEL_COLORS.sedang;
  const short = name.replace(/^Jl\.\s*/i, '').replace(/^Simpang\s*/i, '⊕ ').slice(0, 14);
  return L.divIcon({
    html: `
      <div style="
        background:${c.fill}CC;
        border:1.5px solid ${c.stroke};
        border-radius:8px;
        padding:3px 7px;
        font-size:10px;
        font-weight:700;
        color:#fff;
        white-space:nowrap;
        text-shadow:0 1px 3px rgba(0,0,0,0.6);
        backdrop-filter:blur(4px);
        box-shadow:0 2px 8px ${c.fill}60;
        display:flex;align-items:center;gap:4px;
      ">
        <span style="font-size:8px">${speed} km/h</span>
        <span style="opacity:0.7;font-size:9px">${short}</span>
      </div>`,
    className: '',
    iconAnchor: [0, 0],
    iconSize: null,
  });
};

// ── Ikon insiden ──────────────────────────────────────────────────────
const createIncidentIcon = (type) => {
  const config = {
    accident:     { emoji: '🚨', bg: '#D95050', shadow: 'rgba(217,80,80,0.5)' },
    flood:        { emoji: '🌊', bg: '#2060D9', shadow: 'rgba(32,96,217,0.5)' },
    construction: { emoji: '🚧', bg: '#C47F20', shadow: 'rgba(196,127,32,0.5)' },
    default:      { emoji: '⚠️', bg: '#8B6914', shadow: 'rgba(139,105,20,0.5)' },
  };
  const { emoji, bg, shadow } = config[type] || config.default;
  return L.divIcon({
    html: `
      <div style="
        width:34px;height:34px;
        background:${bg};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 3px 10px ${shadow};
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:14px;line-height:1">${emoji}</span>
      </div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
};

// ── Ikon CCTV ─────────────────────────────────────────────────────────
const createCCTVIcon = (status) => L.divIcon({
  html: `
    <div style="
      width:22px;height:22px;
      background:${status === 'online' ? '#1FAD8E' : '#3D444D'};
      border-radius:50%;
      border:2px solid ${status === 'online' ? '#00E5C3' : '#555'};
      display:flex;align-items:center;justify-content:center;
      font-size:10px;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    ">📹</div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// ── Zona banjir ───────────────────────────────────────────────────────
const createFloodIcon = (risk) => {
  const colors = { tinggi: '#2060D9', sedang: '#4090E0', rendah: '#70B0F0' };
  return L.divIcon({
    html: `<div style="font-size:18px;filter:drop-shadow(0 2px 4px rgba(32,96,217,0.6))">🌊</div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// ══════════════════════════════════════════════════════════════════════
// KOMPONEN UTAMA: HeatmapLayer
// ══════════════════════════════════════════════════════════════════════
export default function HeatmapLayer({
  trafficData,
  showHeatmap,
  showTraffic,
  showFlood,
  showCCTV,
  showIncidents,
}) {
  if (!trafficData) return null;

  const { heatmapPoints = [], incidents = [], floodZones = [], cctvPoints = [] } = trafficData;

  return (
    <>
      {/* ── HEATMAP: Titik kemacetan berlapis (gradient visual) ─────── */}
      {showHeatmap && heatmapPoints.map((p, i) => {
        const c = LEVEL_COLORS[p.level] || LEVEL_COLORS.sedang;
        const r = p.radius || 350;
        const int = p.intensity || 0.5;
        return (
          <React.Fragment key={`heat-${i}`}>
            {/* Layer 1: Lingkaran terluar (sangat transparan) */}
            <Circle
              center={[p.lat, p.lng]}
              radius={r * 2.2}
              pathOptions={{ color: 'transparent', fillColor: c.fill, fillOpacity: 0.04 * int, weight: 0 }}
            />
            {/* Layer 2: Lingkaran tengah */}
            <Circle
              center={[p.lat, p.lng]}
              radius={r * 1.4}
              pathOptions={{ color: 'transparent', fillColor: c.fill, fillOpacity: 0.12 * int, weight: 0 }}
            />
            {/* Layer 3: Inti (paling padat) */}
            <Circle
              center={[p.lat, p.lng]}
              radius={r * 0.7}
              pathOptions={{
                color: c.stroke, fillColor: c.fill,
                fillOpacity: 0.35 * int, weight: 1,
                opacity: 0.4,
              }}
            />
            {/* Label kecepatan di tengah */}
            <Marker position={[p.lat, p.lng]} icon={createTrafficIcon(p.level, p.speed, p.name)}>
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                  <strong>{p.name}</strong><br />
                  Status: <span style={{ color: c.fill, fontWeight: 700 }}>{c.label || p.level}</span><br />
                  Kecepatan: {p.speed} km/h<br />
                  Kepadatan: {Math.round(p.intensity * 100)}%
                </div>
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}

      {/* ── INSIDEN: Kecelakaan, banjir, konstruksi ─────────────────── */}
      {showIncidents && incidents.map((inc) => (
        <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={createIncidentIcon(inc.type)}>
          <Tooltip direction="top" offset={[0, -34]} opacity={0.97} permanent={false}>
            <div style={{ fontSize: 11, lineHeight: 1.5, maxWidth: 160 }}>
              <strong>{inc.type === 'accident' ? '🚨 Kecelakaan' : inc.type === 'flood' ? '🌊 Banjir' : '🚧 Konstruksi'}</strong><br />
              {inc.description}<br />
              <span style={{ color: '#8B949E', fontSize: 10 }}>
                📍 {inc.street} · {timeAgo(inc.reportedAt)}
              </span>
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* ── ZONA BANJIR ──────────────────────────────────────────────── */}
      {showFlood && floodZones.map((z, i) => (
        <React.Fragment key={`flood-${i}`}>
          <Circle
            center={[z.lat, z.lng]}
            radius={z.risk === 'tinggi' ? 350 : z.risk === 'sedang' ? 250 : 150}
            pathOptions={{
              color: '#2060D9',
              fillColor: '#2060D9',
              fillOpacity: z.risk === 'tinggi' ? 0.25 : z.risk === 'sedang' ? 0.18 : 0.10,
              weight: 1.5,
              opacity: 0.6,
              dashArray: '5,5',
            }}
          />
          <Marker position={[z.lat, z.lng]} icon={createFloodIcon(z.risk)}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
              <div style={{ fontSize: 11 }}>
                <strong>🌊 Zona Rawan Banjir</strong><br />
                {z.name}<br />
                Risiko: <strong style={{ color: z.risk === 'tinggi' ? '#D95050' : z.risk === 'sedang' ? '#C47F20' : '#1FAD8E' }}>
                  {z.risk.charAt(0).toUpperCase() + z.risk.slice(1)}
                </strong>
              </div>
            </Tooltip>
          </Marker>
        </React.Fragment>
      ))}

      {/* ── CCTV ─────────────────────────────────────────────────────── */}
      {showCCTV && cctvPoints.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={createCCTVIcon(c.status)}>
          <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
            <div style={{ fontSize: 11 }}>
              <strong>📹 {c.name}</strong><br />
              Status: <span style={{ color: c.status === 'online' ? '#1FAD8E' : '#D95050', fontWeight: 700 }}>
                {c.status === 'online' ? 'Online ●' : 'Offline ○'}
              </span>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 2) return 'baru saja';
  if (diff < 60) return `${diff} mnt lalu`;
  return `${Math.floor(diff / 60)} jam lalu`;
}
