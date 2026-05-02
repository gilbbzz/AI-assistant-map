// src/components/MapControls.jsx
import React from 'react';
export default function MapControls({ onLocateMe, onSOS }) {
  return (
    <div style={{ position: 'absolute', right: 12, bottom: 100, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={onLocateMe} style={{ width: 44, height: 44, borderRadius: '50%', background: '#6B5CE7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      </button>
      <button onClick={onSOS} style={{ width: 44, height: 44, borderRadius: '50%', background: '#D95050', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </button>
    </div>
  );
}

// src/components/AlertOverlay.jsx
export function AlertOverlay({ alerts }) {
  const typeMap = { success: 'success', warning: 'warning', danger: 'danger', info: 'info' };
  return (
    <div style={{ position: 'absolute', top: 70, left: 12, right: 140, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
      {alerts.map(a => (
        <div key={a.id} className={`alert-item ${typeMap[a.type] || 'info'}`} style={{ pointerEvents: 'all' }}>
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// src/components/RouteBar.jsx
export function RouteBar({ route, destination, onViewRoute, onCancel, onStart }) {
  const dist = (route.distance / 1000).toFixed(1);
  const dur = Math.round(route.duration / 60);
  const eta = new Date(Date.now() + route.duration * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ position: 'absolute', bottom: 70, left: 12, right: 12, zIndex: 100, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }} onClick={onViewRoute}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destination?.name}</div>
        <div style={{ fontSize: 11, color: '#8B949E', marginTop: 1 }}>{dur} mnt · {dist} km · Tiba {eta}</div>
      </div>
      <button onClick={onCancel} style={{ padding: '6px 10px', borderRadius: 8, background: '#21262D', border: 'none', color: '#8B949E', fontSize: 12 }}>Batal</button>
      <button onClick={onStart} style={{ padding: '7px 13px', borderRadius: 8, background: '#6B5CE7', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600 }}>Mulai</button>
    </div>
  );
}

// src/components/PanelBase.jsx
// src/components/index.js
export function PanelBase({ isOpen, onClose, title, children, maxHeight = '85%', headerRight }) {
  return (
    <div className={`panel ${isOpen ? 'open' : ''}`} style={{ zIndex: 150, maxHeight, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-handle" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerRight}
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#21262D', border: 'none', color: '#8B949E', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>{children}</div>
    </div>
  );
}
