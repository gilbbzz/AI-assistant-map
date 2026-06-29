// src/components/index.js – Komponen bersama
// FIX SCROLL: PanelBase sekarang menghitung tinggi yang benar dengan
//   paddingBottom agar konten tidak tertutup NavBar (70px).
//   overflow:hidden di container mencegah konten meluap keluar panel.
import React from 'react';

// ──────────────────────────────────────────────────────────────────────
// PANEL BASE – bottom-sheet modal yang bisa di-scroll
// ──────────────────────────────────────────────────────────────────────
export function PanelBase({ isOpen, onClose, title, children, maxHeight, headerRight }) {
  return (
    <div
      className={`panel ${isOpen ? 'open' : ''}`}
      style={{
        zIndex: 150,
        // FIX: max-height dihitung dari var(--vh) yang akurat di mobile & desktop
        // minus 70px untuk NavBar + 10px ruang napas
        maxHeight: maxHeight || 'calc(var(--vh, 1vh) * 88)',
        // FIX: overflow:hidden WAJIB agar inner scroll area bekerja dengan benar
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Handle drag */}
      <div className="panel-handle" style={{ flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 12px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        background: '#161B22',
      }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerRight}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#21262D', border: 'none',
              color: '#8B949E', fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >✕</button>
        </div>
      </div>

      {/* Scrollable content area */}
      {/* FIX: flex:1 + overflowY:auto + paddingBottom 80px agar konten */}
      {/*      terakhir tidak tertutup NavBar (70px) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch', // smooth scroll di iOS
        padding: '16px 16px 80px',        // FIX: 80px bottom = di atas NavBar
        minHeight: 0,                      // FIX: penting agar flex shrink bekerja
      }}>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// MAP CONTROLS – tombol lokasi & SOS di atas peta
// ──────────────────────────────────────────────────────────────────────
export default function MapControls({ onLocateMe, onSOS }) {
  return (
    <div style={{
      position: 'absolute', right: 12, bottom: 100,
      zIndex: 100, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <button onClick={onLocateMe} style={btnStyle} title="Lokasi Saya">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B6FFF" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
      </button>
      <button onClick={onSOS} style={{ ...btnStyle, background: 'rgba(217,80,80,0.9)', border: '0.5px solid rgba(217,80,80,0.5)', animation: 'pulse 3s ease-in-out infinite', boxShadow: '0 2px 10px rgba(217,80,80,0.4)' }} title="SOS Darurat">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </div>
  );
}

const btnStyle = {
  width: 44, height: 44, borderRadius: '50%',
  background: 'rgba(22,27,34,0.97)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)', cursor: 'pointer',
};

// ──────────────────────────────────────────────────────────────────────
// ALERT OVERLAY – notifikasi in-map
// ──────────────────────────────────────────────────────────────────────
export function AlertOverlay({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div style={{
      position: 'absolute', top: 68, left: 12, right: 140,
      zIndex: 100, display: 'flex', flexDirection: 'column',
      gap: 6, pointerEvents: 'none',
    }}>
      {alerts.map(a => (
        <div key={a.id}
          className={`alert-item ${({ success: 'success', warning: 'warning', danger: 'danger', info: 'info' }[a.type] || 'info')}`}
          style={{ pointerEvents: 'all', animation: 'slideDown 0.3s ease' }}
        >
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ROUTE BAR – bar ringkas rute di atas navbar
// ──────────────────────────────────────────────────────────────────────
export function RouteBar({ route, destination, onViewRoute, onCancel, onStart }) {
  const dist = ((route.distance || 0) / 1000).toFixed(1);
  const dur  = Math.round((route.duration || 0) / 60);
  const eta  = new Date(Date.now() + (route.duration || 0) * 1000)
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      position: 'absolute', bottom: 80, left: 12, right: 12, zIndex: 100,
      background: 'rgba(22,27,34,0.97)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 14, padding: '11px 13px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ flex: 1, minWidth: 0 }} onClick={onViewRoute}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          {destination?.name}
        </div>
        <div style={{ fontSize: 11, color: '#8B949E', marginTop: 1 }}>
          {dur} mnt · {dist} km · Tiba {eta}
        </div>
      </div>
      <button onClick={onCancel} style={{ padding: '6px 10px', borderRadius: 8, background: '#21262D', border: 'none', color: '#8B949E', fontSize: 12, flexShrink: 0 }}>
        Batal
      </button>
      <button onClick={onStart} style={{ padding: '7px 14px', borderRadius: 8, background: '#6B5CE7', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0, boxShadow: '0 2px 8px rgba(107,92,231,0.4)' }}>
        Mulai
      </button>
    </div>
  );
}
