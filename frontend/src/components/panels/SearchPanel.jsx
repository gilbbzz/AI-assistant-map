// frontend/src/components/panels/SearchPanel.jsx
import React, { useState, useCallback, useRef } from 'react';
import { PanelBase } from '../index';
import { routeAPI } from '../../services/api';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

export default function SearchPanel({ isOpen, onClose, onDestinationSelect, onPickLocation }) {
  const user = useStore(s => s.user);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const isInIndonesia = (lat, lng) => lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;

  const handleSearch = useCallback(async (val) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await routeAPI.search(val);
        if (res.data.success) {
          // Filter tambahan untuk memastikan hanya dalam Indonesia
          const filtered = res.data.data.filter(r => isInIndonesia(r.lat, r.lng));
          setResults(filtered);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 450);
  }, []);

  const handleSelect = (place) => {
    if (!isInIndonesia(place.lat, place.lng)) {
      toast.error('Lokasi di luar Indonesia tidak didukung.');
      return;
    }
    if (onPickLocation) {
      onPickLocation(place);
    } else if (onDestinationSelect) {
      onDestinationSelect(place);
    }
    onClose();
  };

  const favs = user?.savedLocations || [];

  const recent = [
    { name: 'Jembatan Ampera', address: 'Palembang, Sumatera Selatan', lat: -2.9921, lng: 104.7631 },
    { name: 'Bandara SMB II', address: 'Jl. Tanjung Api-api, Palembang', lat: -2.8982, lng: 104.6999 },
    { name: 'RS Charitas', address: 'Jl. Jend. Sudirman, Palembang', lat: -2.9900, lng: 104.7500 },
  ];

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title={onPickLocation ? 'Pilih Lokasi' : 'Cari Tujuan'}>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input
          style={{ width: '100%', paddingLeft: 38 }}
          placeholder="Cari tempat, alamat, atau landmark..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          autoFocus
        />
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        {loading && <div className="spinner" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />}
      </div>

      {results.length > 0 ? (
        <>
          <p className="section-label">Hasil Pencarian</p>
          {results.map((r, i) => (
            <div key={i} onClick={() => handleSelect(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(107,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7B6FFF" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</div>
              </div>
            </div>
          ))}
        </>
      ) : query.length >= 2 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#8B949E' }}>
          <p style={{ fontSize: 14 }}>Tidak ditemukan. Coba kata kunci lain.</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setQuery('')}>
            Lihat Lokasi Favorit
          </button>
        </div>
      ) : (
        <>
          <p className="section-label">Lokasi Favorit</p>
          {favs.length > 0 ? favs.map((f, i) => (
            <div key={f._id || i} onClick={() => handleSelect(f)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(31,173,142,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1FAD8E', flexShrink: 0 }}>
                {f.name?.[0] || '📍'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>{f.address}</div>
              </div>
            </div>
          )) : (
            <p style={{ fontSize: 12, color: '#8B949E', marginBottom: 8 }}>Belum ada lokasi favorit. Tambahkan di Profil.</p>
          )}
          <p className="section-label" style={{ marginTop: 16 }}>Riwayat Pencarian</p>
          {recent.map((r, i) => (
            <div key={i} onClick={() => handleSelect(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#21262D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>{r.address}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </PanelBase>
  );
}