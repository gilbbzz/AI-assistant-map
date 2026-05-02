// src/components/NavBar.jsx
import React from 'react';
export default function NavBar({ active, onTab }) {
  const tabs = [
    { id: 'home', label: 'Beranda', icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>, icon2: <polyline points="9 22 9 12 15 12 15 22"/> },
    { id: 'search', label: 'Cari', icon: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></> },
    { id: 'driver', label: 'Driver', icon: <><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></> },
    { id: 'ai', label: 'AI Chat', icon: <><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0110 4a2 2 0 012-2z"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/></> },
    { id: 'profile', label: 'Profil', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(13,17,23,0.98)', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', padding: '6px 0 18px' }}>
      {tabs.map(t => (
        <button key={t.id} className="nav-item" style={{ color: active === t.id ? '#7B6FFF' : '#8B949E' }} onClick={() => onTab(t.id)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{t.icon}{t.icon2}</svg>
          <span style={{ fontSize: 10 }}>{t.label}</span>
          {t.id === 'ai' && <span style={{ position: 'absolute', top: 2, right: 'calc(50% - 18px)', background: '#D95050', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 7 }}>1</span>}
        </button>
      ))}
    </div>
  );
}
