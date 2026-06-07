// src/components/MapLegend.jsx – Legenda peta yang muncul saat heatmap aktif
import React, { useState } from 'react';

const LEGEND_ITEMS = [
  { color: '#D95050', label: 'Macet',  sub: '< 10 km/h' },
  { color: '#C47F20', label: 'Padat',  sub: '10-25 km/h' },
  { color: '#C8A800', label: 'Sedang', sub: '25-45 km/h' },
  { color: '#1FAD8E', label: 'Lancar', sub: '> 45 km/h' },
];

export default function MapLegend({ show, activeLayers }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!show) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 92, left: 12, zIndex: 200,
      background: 'rgba(13,17,23,0.92)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, overflow: 'hidden',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      transition: 'all 0.25s ease',
      minWidth: 130,
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', padding: '7px 10px',
          background: 'rgba(107,92,231,0.12)',
          border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          color: '#F0F6FC', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
          🗺 LEGENDA
        </span>
        <span style={{ fontSize: 10, color: '#8B949E', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▲</span>
      </button>

      {!collapsed && (
        <div style={{ padding: '8px 10px' }}>
          {/* Traffic legend */}
          {activeLayers.heatmap && (
            <>
              <p style={{ fontSize: 9, color: '#3D444D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kemacetan</p>
              {LEGEND_ITEMS.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 9, borderRadius: 3, background: item.color, opacity: 0.85, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 9, color: '#8B949E', marginLeft: 4 }}>{item.sub}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Flood legend */}
          {activeLayers.flood && (
            <>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
              <p style={{ fontSize: 9, color: '#3D444D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Zona Banjir</p>
              {[
                { color: '#2060D9', opacity: 0.6, label: 'Risiko Tinggi' },
                { color: '#4090E0', opacity: 0.45, label: 'Risiko Sedang' },
                { color: '#70B0F0', opacity: 0.30, label: 'Risiko Rendah' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 9, borderRadius: 3, background: item.color, opacity: item.opacity, border: '1px dashed ' + item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10 }}>{item.label}</span>
                </div>
              ))}
            </>
          )}

          {/* Incident legend */}
          {activeLayers.incidents && (
            <>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
              <p style={{ fontSize: 9, color: '#3D444D', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Insiden</p>
              {[
                { icon: '🚨', label: 'Kecelakaan' },
                { icon: '🌊', label: 'Banjir' },
                { icon: '🚧', label: 'Konstruksi' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 10 }}>{item.label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
