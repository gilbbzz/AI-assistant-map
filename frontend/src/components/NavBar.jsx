// src/components/NavBar.jsx
import React from 'react';

const TABS = [
  {
    id: 'home', label: 'Beranda',
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </>
    )
  },
  {
    id: 'search', label: 'Cari',
    icon: (
      <>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </>
    )
  },
  {
    id: 'driver', label: 'Driver',
    icon: (
      <>
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </>
    )
  },
  {
    id: 'ai', label: 'AI Chat', badge: true,
    icon: (
      <>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </>
    )
  },
  {
    id: 'profile', label: 'Profil',
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </>
    )
  },
];

export default function NavBar({ active, onTab }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      zIndex: 200,
      background: 'rgba(13,17,23,0.98)',
      borderTop: '0.5px solid rgba(255,255,255,0.07)',
      display: 'flex',
      padding: '5px 0 env(safe-area-inset-bottom, 16px)',
      backdropFilter: 'blur(12px)'
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            className="nav-item"
            style={{ color: isActive ? '#7B6FFF' : '#8B949E', position: 'relative' }}
            onClick={() => onTab(tab.id)}
          >
            {/* Active indicator dot */}
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 18, height: 2, borderRadius: 2,
                background: '#7B6FFF',
                transition: 'all 0.25s'
              }} />
            )}

            <svg
              width="20" height="20"
              viewBox="0 0 24 24"
              fill={isActive ? 'rgba(107,92,231,0.15)' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'transform 0.2s', transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
            >
              {tab.icon}
            </svg>

            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              transition: 'font-weight 0.15s'
            }}>
              {tab.label}
            </span>

            {/* AI badge */}
            {tab.badge && (
              <span style={{
                position: 'absolute', top: 3, right: 'calc(50% - 18px)',
                background: '#D95050', color: '#fff',
                fontSize: 8, fontWeight: 700,
                padding: '1px 4px', borderRadius: 8,
                lineHeight: 1.4
              }}>
                AI
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
