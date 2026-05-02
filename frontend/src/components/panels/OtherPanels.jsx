import React, { useState, useEffect } from 'react';
import { PanelBase } from '../index';
import useStore from '../../store/useStore';
import { userAPI } from '../../services/api';
import SearchPanel from './SearchPanel';
import toast from 'react-hot-toast';

export function ProfilePanel({ isOpen, onClose }) {
  const { user, updateUser, logout } = useStore();
  const navigate = require('react-router-dom').useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null); // null = tambah baru, ada isi = edit

  const savedLocations = user?.savedLocations || [];

  const handleLocationPick = async (place) => {
    try {
      if (editingLoc) {
        // Update existing
        const res = await userAPI.updateLocation(editingLoc._id, {
          name: place.name,
          address: place.address || place.name,
          lat: place.lat,
          lng: place.lng,
          type: editingLoc.type || 'other'
        });
        if (res.data.success) {
          updateUser({ savedLocations: res.data.data });
          toast.success('Lokasi diperbarui');
        }
      } else {
        // Add new
        const res = await userAPI.addLocation({
          name: place.name,
          address: place.address || place.name,
          lat: place.lat,
          lng: place.lng,
          type: 'other'
        });
        if (res.data.success) {
          updateUser({ savedLocations: res.data.data });
          toast.success('Lokasi ditambahkan');
        }
      }
    } catch (err) {
      toast.error('Gagal menyimpan lokasi');
    }
    setShowPicker(false);
    setEditingLoc(null);
  };

  const handleDelete = async (locId) => {
    try {
      const res = await userAPI.deleteLocation(locId);
      if (res.data.success) {
        updateUser({ savedLocations: res.data.data });
        toast.success('Lokasi dihapus');
      }
    } catch {
      toast.error('Gagal menghapus lokasi');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };


  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Profil Saya">
      {/* Profil utama */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
          {user?.name?.[0] || 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.name || 'Pengguna'}</div>
          <div style={{ fontSize: 12, color: '#8B949E' }}>{user?.email || ''}</div>
          <span className="chip chip-accent" style={{ marginTop: 5, display: 'inline-flex', fontSize: 10 }}>
            {user?.isPremium ? 'Premium' : 'Gratis'}
          </span>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(217,80,80,0.1)', border: '0.5px solid rgba(217,80,80,0.3)', borderRadius: 10, padding: '6px 12px', color: '#D95050', fontSize: 12, fontWeight: 600 }}>Keluar</button>
      </div>

      {/* Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 18 }}>
        {[['247', 'Total Trip'], ['1.2K km', 'Jarak'], ['18 kg', 'CO2 Hemat']].map(([v, l]) => (
          <div key={l} style={{ background: '#21262D', borderRadius: 9, padding: '11px 7px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
            <div style={{ fontSize: 10, color: '#8B949E', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Manajemen Lokasi Favorit */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="section-label" style={{ margin: 0 }}>Lokasi Favorit</p>
          <button
            onClick={() => { setEditingLoc(null); setShowPicker(true); }}
            style={{ background: '#6B5CE7', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
          >
            + Tambah
          </button>
        </div>

        {savedLocations.length === 0 && (
          <p style={{ color: '#8B949E', fontSize: 12, marginBottom: 8 }}>Belum ada lokasi favorit.</p>
        )}

        {savedLocations.map(loc => (
          <div key={loc._id} style={{ background: '#21262D', borderRadius: 9, padding: 11, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(107,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📍</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{loc.name}</div>
              <div style={{ fontSize: 11, color: '#8B949E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.address}</div>
              {loc.type && <span style={{ fontSize: 9, background: 'rgba(107,92,231,0.15)', color: '#7B6FFF', padding: '1px 6px', borderRadius: 8, marginTop: 3, display: 'inline-block' }}>{loc.type === 'home' ? 'Rumah' : loc.type === 'work' ? 'Kantor' : 'Lainnya'}</span>}
            </div>
            <button onClick={() => { setEditingLoc(loc); setShowPicker(true); }} style={{ background: 'none', border: 'none', color: '#8B949E', fontSize: 16, padding: 4, cursor: 'pointer' }}>✎</button>
            <button onClick={() => handleDelete(loc._id)} style={{ background: 'none', border: 'none', color: '#D95050', fontSize: 16, padding: 4, cursor: 'pointer' }}>✕</button>
          </div>
        ))}
      </div>

      {/* Menu lainnya */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          { label: 'Riwayat Perjalanan', sub: '247 perjalanan', icon: '🕐' },
          { label: 'Kendaraan Saya', sub: 'Toyota Avanza - Bensin', icon: '🚗' },
          { label: 'Kontak Darurat (SOS)', sub: '1 kontak terdaftar', icon: '🆘' },
          { label: 'Pengaturan Notifikasi', sub: 'Aktif: Macet & Cuaca', icon: '🔔' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 11, borderRadius: 9, cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#21262D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>{item.sub}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3D444D" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}
      </div>

      {/* Picker lokasi (SearchPanel dalam mode pick) */}
      {showPicker && (
        <SearchPanel
          isOpen={showPicker}
          onClose={() => { setShowPicker(false); setEditingLoc(null); }}
          mode="picker"
          onPickLocation={handleLocationPick}
        />
      )}
    </PanelBase>
  );
}


export function DriverPanel({ isOpen, onClose, onToggleHeatmap, onAlert }) {
  const [demand, setDemand] = useState(null);

  React.useEffect(() => {
    import('../../services/api').then(({ driverAPI }) => {
      driverAPI.getDemand()
        .then(r => setDemand(r.data.data))
        .catch(() => setDemand({
          areas: [
            { name: 'Ilir Barat I', demand: 147, activeDrivers: 8, demandScore: 95 },
            { name: 'Bukit Besar', demand: 98, activeDrivers: 12, demandScore: 75 },
            { name: 'Seberang Ulu I', demand: 76, activeDrivers: 5, demandScore: 85 },
            { name: 'Palembang Trade Center', demand: 120, activeDrivers: 6, demandScore: 90 },
            { name: 'Plaju', demand: 54, activeDrivers: 9, demandScore: 55 },
          ],
          peakHours: [
            { time: '07:00-09:00', level: 'tinggi', earning: 'Rp 40.000-60.000/jam' },
            { time: '17:00-19:00', level: 'sangat_tinggi', earning: 'Rp 55.000-80.000/jam' },
          ]
        }));
    });
  }, []);

  const scoreColor = (s) => s >= 80 ? '#D95050' : s >= 60 ? '#C47F20' : '#1FAD8E';

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Mode Driver">
      {/* ... konten DriverPanel asli Anda ... */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 16 }}>
        {[['Pendapatan Hari Ini', 'Rp 187.000', '#1FAD8E', '+12% vs kemarin'],
          ['Trip Hari Ini', '14 Trip', '#7B6FFF', '+2 trip'],
          ['Rating Driver', '4.9 ★', '#C47F20', 'Sangat Baik'],
          ['Est. Malam Ini', 'Rp 95.000', '#1FAD8E', '18:00-22:00']
        ].map(([l, v, c, s]) => (
          <div key={l} style={{ background: '#21262D', borderRadius: 11, padding: '12px 10px' }}>
            <div style={{ fontSize: 10, color: '#8B949E' }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c, marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10, color: c, marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      <p className="section-label">Area Permintaan Tertinggi (Real-time)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {(demand?.areas || []).map((a, i) => (
          <div key={a.name} style={{ background: '#21262D', borderRadius: 9, padding: 11, display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `rgba(${i < 2 ? '217,80,80' : '107,92,231'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: i < 2 ? '#D95050' : '#7B6FFF', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: '#8B949E' }}>{a.demand} permintaan · {a.activeDrivers} driver</div>
              <div style={{ height: 4, background: '#0D1117', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${a.demandScore}%`, background: scoreColor(a.demandScore), borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor(a.demandScore), flexShrink: 0 }}>{a.demandScore}%</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#21262D', borderRadius: 11, padding: 13, marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Prediksi Jam Sibuk</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="chip chip-danger">17:00-18:30 Sangat Tinggi</span>
          <span className="chip chip-warning">12:00-13:00 Tinggi</span>
          <span className="chip chip-success">08:00-09:00 Sedang</span>
        </div>
      </div>

      <button className="btn-success" onClick={() => { onToggleHeatmap(); onClose(); }}>
        Tampilkan Heatmap di Peta
      </button>
    </PanelBase>
  );
}

// ===== WEATHER PANEL =====
export function WeatherPanel({ isOpen, onClose, weather }) {
  const cityName = useStore(s => s.cityName);
   const w = weather || { temperature: 31, description: 'Berawan', humidity: 78, windSpeed: 12, visibility: 8, rainChance: 40 };
  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Cuaca & Info Rute">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: '#21262D', borderRadius: 13, marginBottom: 14 }}>
        <span style={{ fontSize: 46 }}>⛅</span>
        <div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{w.temperature}°C</div>
          <div style={{ color: '#8B949E', fontSize: 12 }}>{w.description} · {cityName || 'Lokasi Anda'}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 14 }}>
        {[['Kelembaban', w.humidity + '%'], ['Angin', w.windSpeed + ' km/h'], ['Visibilitas', (w.visibility || 8) + ' km']].map(([l, v]) => (
          <div key={l} style={{ background: '#21262D', borderRadius: 9, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#8B949E' }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      <p className="section-label">Prakiraan 6 Jam</p>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 8, marginBottom: 14, scrollbarWidth: 'none' }}>
        {[['15:00','⛅','29','20%'],['18:00','🌧','27','90%'],['21:00','🌦','26','40%'],['00:00','🌙','24','10%']].map(([t,ic,tp,r]) => (
          <div key={t} style={{ background: '#21262D', borderRadius: 9, padding: 11, textAlign: 'center', flexShrink: 0, minWidth: 66 }}>
            <div style={{ fontSize: 10, color: '#8B949E' }}>{t}</div>
            <div style={{ fontSize: 22, margin: '5px 0' }}>{ic}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{tp}°C</div>
            <div style={{ fontSize: 10, color: r === '90%' ? '#D95050' : '#8B949E' }}>{r}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(196,127,32,0.1)', border: '0.5px solid rgba(196,127,32,0.3)', borderRadius: 11, padding: 12, marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#C47F20', marginBottom: 5 }}>Peringatan Cuaca</p>
        <p style={{ fontSize: 12, color: '#8B949E' }}>Hujan lebat & angin kencang pukul 17:00–19:00. Hindari Jl. Kol. H. Barlian dan area Bundaran Air Mancur yang rawan banjir.</p>
      </div>
      <div style={{ background: 'rgba(31,173,142,0.1)', border: '0.5px solid rgba(31,173,142,0.2)', borderRadius: 11, padding: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#1FAD8E', marginBottom: 5 }}>Rekomendasi AI</p>
        <p style={{ fontSize: 12, color: '#8B949E' }}>Berangkat sebelum 16:30 atau setelah 19:30. RouteAI otomatis menghindari rute banjir saat hujan terdeteksi.</p>
      </div>
    </PanelBase>
  );
}

// ===== SOS PANEL =====
export function SOSPanel({ isOpen, onClose, userLocation, onAlert }) {
  const [triggered, setTriggered] = useState(false);
  const handleSOS = async () => {
    setTriggered(true);
    onAlert('SOS dikirim! Kontak darurat diberitahu.', 'danger');
    setTimeout(() => setTriggered(false), 5000);
  };
  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="">
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D95050', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Butuh Bantuan Darurat?</h3>
        <p style={{ fontSize: 12, color: '#8B949E', marginBottom: 20 }}>Lokasi Anda akan dikirim ke kontak darurat dan pusat bantuan RouteAI secara otomatis.</p>
        <button className="btn-danger" onClick={handleSOS} style={{ marginBottom: 9 }}>
          {triggered ? '✓ SOS Terkirim!' : 'Kirim Lokasi & Minta Bantuan'}
        </button>
        <button className="btn-secondary" onClick={() => window.location.href = 'tel:112'}>
          Hubungi 112 (Darurat Nasional)
        </button>
        <div style={{ background: '#21262D', borderRadius: 11, padding: 13, marginTop: 14, textAlign: 'left' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8B949E', marginBottom: 9 }}>KONTAK DARURAT</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(107,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👨‍👩‍👧</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Keluarga</div>
              <div style={{ fontSize: 11, color: '#8B949E' }}>+62 812-XXXX-XXXX</div>
            </div>
          </div>
        </div>
      </div>
    </PanelBase>
  );
}

// ===== HISTORY PANEL =====
export function HistoryPanel({ isOpen, onClose }) {
  const hist = [
    { d: 'Palembang Trade Center', f: 'Rumah', dt: 'Hari ini 09:15', dur: '22 mnt', ds: '8.4 km' },
    { d: 'RS Charitas', f: 'Kantor', dt: 'Kemarin 14:30', dur: '18 mnt', ds: '5.2 km' },
    { d: 'Bandara SMB II', f: 'Rumah', dt: '18 Apr 06:00', dur: '45 mnt', ds: '21.3 km' },
    { d: 'Pasar 16 Ilir', f: 'PTC', dt: '17 Apr 11:20', dur: '28 mnt', ds: '7.8 km' },
    { d: 'Jembatan Ampera', f: 'Rumah', dt: '16 Apr 16:00', dur: '31 mnt', ds: '12.1 km' },
  ];
  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Riwayat Perjalanan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
        {hist.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 11, padding: 12, background: '#21262D', borderRadius: 11, cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(107,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#7B6FFF', flexShrink: 0 }}>{h.d[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.d}</div>
              <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>Dari {h.f} · {h.ds}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#8B949E' }}>{h.dt}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#7B6FFF', marginTop: 2 }}>{h.dur}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-secondary">Export PDF</button>
    </PanelBase>
  );
}

// ===== LAYERS PANEL =====
export function LayersPanel({ isOpen, onClose, onToggleHeatmap, onAlert }) {
  const layers = [
    { label: 'Lalu Lintas Real-time', sub: 'Kemacetan & kecepatan jalan', default: true },
    { label: 'Heatmap Driver', sub: 'Area potensi pendapatan tinggi', default: false, action: onToggleHeatmap },
    { label: 'Zona Rawan Banjir', sub: 'Area risiko banjir Palembang', default: false },
    { label: 'CCTV Jalan', sub: '32 titik kamera aktif', default: false },
  ];
  const [states, setStates] = React.useState(layers.map(l => l.default));
  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Layer Peta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {layers.map((l, i) => (
          <div key={l.label} style={{ background: '#21262D', borderRadius: 10, padding: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{l.label}</p>
              <p style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>{l.sub}</p>
            </div>
            <button className={`toggle ${states[i] ? 'on' : ''}`} onClick={() => {
              setStates(s => { const n = [...s]; n[i] = !n[i]; return n; });
              if (l.action) l.action();
              onAlert?.(`Layer "${l.label}" ${!states[i] ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
            }} />
          </div>
        ))}
      </div>
    </PanelBase>
  );
}
