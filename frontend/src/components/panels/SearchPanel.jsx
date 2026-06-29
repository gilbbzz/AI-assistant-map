// src/components/panels/SearchPanel.jsx
// FIXED: Hapus semua tempat hardcoded Palembang.
// "Tempat Populer" sekarang diambil dari Nominatim API berdasarkan GPS pengguna.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PanelBase } from '../index';
import { routeAPI } from '../../services/api';
import useStore from '../../store/useStore';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SearchPanel({ isOpen, onClose, onSelect, mode = 'destination' }) {
  const { user, userLocation } = useStore();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [nearby,   setNearby]   = useState([]);
  const [loadingNearby, setLN]  = useState(false);
  const timerRef   = useRef(null);
  const mountedRef = useRef(true);
  

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimeout(timerRef.current); };
  }, []);

  // Reset & fetch nearby saat panel dibuka
  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]); setLoading(false); clearTimeout(timerRef.current); return; }
    // Fetch tempat populer di sekitar GPS pengguna
    if (userLocation?.lat && userLocation?.lng) {
      fetchNearby(userLocation.lat, userLocation.lng);
    }
  }, [isOpen, userLocation?.lat, userLocation?.lng]); // eslint-disable-line

  // Ambil tempat menarik dari Nominatim berdasarkan GPS
  const fetchNearby = async (lat, lng) => {
    setLN(true);
    try {
      const delta = 0.05; // ~5km radius
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format:          'json',
          viewbox:         `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`,
          bounded:         1,
          limit:           8,
          'accept-language':'id',
          featuretype:     'settlement',
          q:               'hospital OR mall OR market OR station OR airport OR school OR university',
        },
        headers: { 'User-Agent': 'RouteAI-App/1.0' },
        timeout: 6000,
      });
      if (!mountedRef.current) return;
      const places = (res.data || [])
        .filter(p => p.lat && p.lon)
        .map(p => ({
          id:      p.place_id,
          name:    p.name || p.display_name?.split(',')[0] || 'Tempat',
          address: p.display_name?.split(',').slice(1, 3).join(',').trim() || '',
          lat:     parseFloat(p.lat),
          lng:     parseFloat(p.lon),
          type:    p.type || p.class || 'place',
        }))
        .filter(p => p.name && p.name.length > 1);
      setNearby(places.slice(0, 6));
    } catch {
      setNearby([]); // tidak tampilkan placeholder
    } finally {
      if (mountedRef.current) setLN(false);
    }
  };

  const isInIndonesia = (lat, lng) => lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;

  const handleSearch = useCallback(async (val) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await routeAPI.search(val);
        if (!mountedRef.current) return;
        if (res.data.success) setResults(res.data.data.filter(r => isInIndonesia(r.lat, r.lng)));
        else setResults([]);
      } catch { if (mountedRef.current) setResults([]); }
      finally   { if (mountedRef.current) setLoading(false); }
    }, 450);
  }, []);

  const handleSelect = (place) => {
  if (!isInIndonesia(place.lat, place.lng)) {
    toast.error('Lokasi di luar Indonesia tidak didukung.');
    return;
  }
  if (onSelect) onSelect(place);
  onClose();
};

  const favs = user?.savedLocations || [];
  const typeIcon = t => ({ home: '🏠', work: '🏢', school: '🎓', other: '📍' }[t] || '📍');

  // Ikon berdasarkan type OSM
  const nearbyIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('hospital') || t.includes('clinic'))   return '🏥';
    if (t.includes('school') || t.includes('university')) return '🎓';
    if (t.includes('airport'))  return '✈️';
    if (t.includes('station'))  return '🚉';
    if (t.includes('mall') || t.includes('supermarket'))  return '🛒';
    if (t.includes('market'))   return '🏪';
    if (t.includes('mosque'))   return '🕌';
    if (t.includes('church'))   return '⛪';
    if (t.includes('hotel'))    return '🏨';
    if (t.includes('park'))     return '🌳';
    return '📍';
  };

  const ItemRow = ({ icon, name, address, onPress, bg = 'rgba(107,92,231,0.12)' }) => (
    <div onClick={onPress} style={{ display:'flex',alignItems:'center',gap:11,padding:'10px 0',borderBottom:'0.5px solid rgba(255,255,255,0.05)',cursor:'pointer' }}>
      <div style={{ width:34,height:34,borderRadius:9,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1,overflow:'hidden' }}>
        <div style={{ fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</div>
        {address && <div style={{ fontSize:11,color:'#8B949E',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{address}</div>}
      </div>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3D444D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  );

  return (
    <PanelBase
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'origin' ? 'Pilih Titik Awal' : mode === 'picker' ? 'Pilih Lokasi' : 'Cari Tujuan'}
    >
      {/* Input pencarian */}
      <div style={{ position:'relative',marginBottom:14 }}>
        <input
          style={{ width:'100%',paddingLeft:38 }}
          placeholder="Cari tempat, alamat, atau nama jalan..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          autoFocus={isOpen}
        />
        <svg style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        {loading && <div className="spinner" style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)' }} />}
        {query.length > 0 && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); clearTimeout(timerRef.current); }} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#8B949E',fontSize:16,lineHeight:1,padding:2 }}>×</button>
        )}
      </div>

      {/* Hasil pencarian */}
      {results.length > 0 ? (
        <>
          <p className="section-label">Hasil Pencarian ({results.length})</p>
          {results.map((r, i) => (
            <ItemRow key={r.id || i} icon="📍" name={r.name} address={r.address} onPress={() => handleSelect(r)} />
          ))}
        </>
      ) : query.length >= 2 && !loading ? (
        <div style={{ padding:'24px 0',textAlign:'center',color:'#8B949E' }}>
          <div style={{ fontSize:28,marginBottom:10 }}>🔍</div>
          <p style={{ fontSize:14 }}>Lokasi tidak ditemukan.</p>
          <p style={{ fontSize:12,marginTop:4 }}>Coba kata kunci lain atau periksa ejaan.</p>
          <button className="btn-secondary" style={{ marginTop:14 }} onClick={() => { setQuery(''); setResults([]); }}>Coba Lagi</button>
        </div>
      ) : (
        <>
          {/* Lokasi favorit pengguna */}
          {favs.length > 0 && (
            <>
              <p className="section-label">Favorit Anda</p>
              {favs.map((loc, i) => (
                <ItemRow key={`fav-${loc._id || i}`} icon={typeIcon(loc.type)} name={loc.name} address={loc.address} onPress={() => handleSelect(loc)} />
              ))}
            </>
          )}

          {/* Tempat terdekat dari GPS — diambil dari Nominatim secara real-time */}
          <p className="section-label" style={{ marginTop: favs.length > 0 ? 14 : 0 }}>
            Tempat Terdekat
            {loadingNearby && <span style={{ fontSize:10,color:'#3D444D',marginLeft:6 }}>memuat...</span>}
          </p>
          {loadingNearby ? (
            <div style={{ display:'flex',justifyContent:'center',padding:20 }}><div className="spinner" /></div>
          ) : nearby.length > 0 ? (
            nearby.map((r, i) => (
              <ItemRow key={`nb-${r.id || i}`} icon={nearbyIcon(r.type)} name={r.name} address={r.address} onPress={() => handleSelect(r)} bg="#21262D" />
            ))
          ) : (
            <div style={{ padding:'14px 0',textAlign:'center',color:'#3D444D',fontSize:12 }}>
              {userLocation ? 'Tidak ada tempat ditemukan di sekitar lokasi Anda.' : 'Aktifkan GPS untuk melihat tempat terdekat.'}
            </div>
          )}
        </>
      )}
    </PanelBase>
  );
}
