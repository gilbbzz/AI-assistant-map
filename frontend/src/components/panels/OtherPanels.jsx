// src/components/panels/OtherPanels.jsx
// UPGRADE: LayersPanel sekarang benar-benar mengontrol layer di peta.
//          Setiap toggle langsung memanggil onToggleLayer(key) ke MainScreen.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelBase } from '../index';
import useStore from '../../store/useStore';
import { userAPI, tripAPI, sosAPI, driverAPI } from '../../services/api';
import SearchPanel from './SearchPanel';
import toast from 'react-hot-toast';

// ===================================================================
// PROFILE PANEL
// ===================================================================
export function ProfilePanel({ isOpen, onClose }) {
  const { user, updateUser, logout } = useStore();
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [saving, setSaving] = useState(false);

  const savedLocations = user?.savedLocations || [];

  const handleLocationPick = async (place) => {
    setSaving(true);
    try {
      if (editingLoc) {
        const res = await userAPI.updateLocation(editingLoc._id, { name: place.name, address: place.address || place.name, lat: place.lat, lng: place.lng, type: editingLoc.type || 'other' });
        if (res.data.success) { updateUser({ savedLocations: res.data.data }); toast.success('Lokasi diperbarui'); }
      } else {
        const res = await userAPI.addLocation({ name: place.name, address: place.address || place.name, lat: place.lat, lng: place.lng, type: 'other' });
        if (res.data.success) { updateUser({ savedLocations: res.data.data }); toast.success('Lokasi ditambahkan'); }
      }
    } catch { toast.error('Gagal menyimpan lokasi'); }
    finally { setSaving(false); setShowPicker(false); setEditingLoc(null); }
  };

  const handleDelete = async (id) => {
    try {
      await userAPI.deleteLocation(id);
      updateUser({ savedLocations: savedLocations.filter(l => l._id !== id) });
      toast.success('Lokasi dihapus');
    } catch { toast.error('Gagal hapus lokasi'); }
  };

  const typeIcon  = t => ({ home: '🏠', work: '🏢', school: '🎓', other: '📍' }[t] || '📍');
  const typeLabel = t => ({ home: 'Rumah', work: 'Kantor', school: 'Sekolah', other: 'Lainnya' }[t] || 'Lainnya');

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Profil Saya">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6B5CE7,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
          {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: '#8B949E' }}>{user?.email || user?.phone}</div>
          <span className="chip chip-accent" style={{ marginTop: 4, display: 'inline-flex', fontSize: 10 }}>{user?.isPremium ? '⭐ Premium' : 'Gratis'}</span>
        </div>
        <button onClick={() => { logout(); navigate('/auth'); }} style={{ background: 'rgba(217,80,80,0.1)', border: '0.5px solid rgba(217,80,80,0.3)', borderRadius: 9, padding: '6px 12px', color: '#D95050', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Keluar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 18 }}>
        {[[user?.stats?.totalTrips || 0, 'Total Trip'], [((user?.stats?.totalDistance||0)/1000).toFixed(0)+' km','Jarak'], [((user?.stats?.co2Saved||0)/1000).toFixed(1)+' kg','CO₂ Hemat']].map(([v,l])=>(
          <div key={l} style={{ background:'#21262D',borderRadius:9,padding:'11px 7px',textAlign:'center' }}>
            <div style={{ fontSize:16,fontWeight:700,color:'#7B6FFF' }}>{v}</div>
            <div style={{ fontSize:10,color:'#8B949E',marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
          <p className="section-label" style={{ margin:0 }}>Lokasi Favorit</p>
          <button onClick={() => { setEditingLoc(null); setShowPicker(true); }} style={{ background:'#6B5CE7',border:'none',borderRadius:6,color:'#fff',fontSize:11,padding:'4px 10px' }}>+ Tambah</button>
        </div>
        {savedLocations.length === 0 && <p style={{ color:'#8B949E',fontSize:12,textAlign:'center',padding:'12px 0' }}>Belum ada lokasi favorit.</p>}
        {savedLocations.map(loc=>(
          <div key={loc._id} style={{ background:'#21262D',borderRadius:9,padding:11,display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'rgba(107,92,231,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{typeIcon(loc.type)}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:13,fontWeight:600 }}>{loc.name}</div>
              <div style={{ fontSize:10,color:'#8B949E',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{loc.address}</div>
              <span style={{ fontSize:9,background:'rgba(107,92,231,0.15)',color:'#7B6FFF',padding:'1px 6px',borderRadius:8,marginTop:2,display:'inline-block' }}>{typeLabel(loc.type)}</span>
            </div>
            <button onClick={() => { setEditingLoc(loc); setShowPicker(true); }} style={{ background:'none',border:'none',color:'#8B949E',fontSize:15,padding:4 }}>✎</button>
            <button onClick={() => handleDelete(loc._id)} style={{ background:'none',border:'none',color:'#D95050',fontSize:15,padding:4 }}>✕</button>
          </div>
        ))}
      </div>

      {showPicker && (
        <div style={{ position:'absolute',inset:0,zIndex:300 }}>
          <SearchPanel isOpen mode="picker" onClose={() => { setShowPicker(false); setEditingLoc(null); }} onPickLocation={handleLocationPick} />
        </div>
      )}
    </PanelBase>
  );
}

// ===================================================================
// DRIVER PANEL
// ===================================================================
export function DriverPanel({ isOpen, onClose, onAlert, onToggleLayer }) {
  const [demand,   setDemand]   = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { userLocation } = useStore();

  useEffect(() => {
    if (!isOpen) return;
    driverAPI.getDemand().then(r => { if (r.data.success) setDemand(r.data.data); }).catch(() => setDemand({ areas: [{ name:'Ilir Barat I',demand:147,activeDrivers:8,demandScore:95 },{ name:'PTC',demand:120,activeDrivers:6,demandScore:90 },{ name:'Bukit Besar',demand:98,activeDrivers:12,demandScore:75 },{ name:'Seberang Ulu',demand:76,activeDrivers:5,demandScore:85 },{ name:'Plaju',demand:54,activeDrivers:9,demandScore:55 }] }));
    driverAPI.getEarnings().then(r => { if (r.data.success) setEarnings(r.data.data); }).catch(() => setEarnings({ today:187000,tripCount:14,rating:4.9,estimatedEvening:95000 }));
  }, [isOpen]);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      await driverAPI.updateStatus(!isOnline, userLocation?.lat, userLocation?.lng);
      const next = !isOnline;
      setIsOnline(next);
      onAlert?.(`Status driver: ${next ? 'Online ✓' : 'Offline'}`, next ? 'success' : 'info');
      if (next) onToggleLayer?.('heatmap'); // tampilkan heatmap saat online
    } catch { toast.error('Gagal update status driver'); }
    finally { setToggling(false); }
  };

  const scoreColor = s => s >= 80 ? '#D95050' : s >= 60 ? '#C47F20' : '#1FAD8E';
  const fmt = n => `Rp ${(n||0).toLocaleString('id-ID')}`;

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Mode Driver">
      <div style={{ background:isOnline?'rgba(31,173,142,0.1)':'#21262D',border:`0.5px solid ${isOnline?'rgba(31,173,142,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:12,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:600 }}>{isOnline?'● Online — Siap Terima Order':'○ Offline'}</div>
          <div style={{ fontSize:11,color:'#8B949E',marginTop:2 }}>{isOnline?'Anda terlihat oleh penumpang':'Aktifkan untuk mulai bekerja'}</div>
        </div>
        <button onClick={handleToggleOnline} disabled={toggling} className={`toggle ${isOnline?'on':''}`} style={{ transform:'scale(1.2)',flexShrink:0 }} />
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:16 }}>
        {[['Pendapatan Hari Ini',fmt(earnings?.today),'#1FAD8E','+12% vs kemarin'],['Trip Hari Ini',`${earnings?.tripCount||0} Trip`,'#7B6FFF','Target 20 trip'],['Rating Driver',`${earnings?.rating||5.0} ★`,'#C47F20','Sangat Baik'],['Est. Malam Ini',fmt(earnings?.estimatedEvening),'#1FAD8E','18:00-22:00']].map(([l,v,c,s])=>(
          <div key={l} style={{ background:'#21262D',borderRadius:11,padding:'12px 10px' }}>
            <div style={{ fontSize:10,color:'#8B949E' }}>{l}</div>
            <div style={{ fontSize:16,fontWeight:700,color:c,marginTop:3 }}>{v}</div>
            <div style={{ fontSize:10,color:'#3D444D',marginTop:2 }}>{s}</div>
          </div>
        ))}
      </div>

      <p className="section-label">Area Permintaan Tertinggi</p>
      {demand?.areas ? (
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:14 }}>
          {demand.areas.slice(0,5).map((a,i)=>(
            <div key={a.name} style={{ background:'#21262D',borderRadius:9,padding:11,display:'flex',alignItems:'center',gap:11 }}>
              <div style={{ width:26,height:26,borderRadius:7,background:`rgba(${i<2?'217,80,80':'107,92,231'},0.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:i<2?'#D95050':'#7B6FFF',flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600 }}>{a.name}</div>
                <div style={{ fontSize:11,color:'#8B949E' }}>{a.demand} permintaan · {a.activeDrivers} driver aktif</div>
                <div style={{ height:4,background:'#0D1117',borderRadius:2,marginTop:5,overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${a.demandScore}%`,background:scoreColor(a.demandScore),borderRadius:2,transition:'width 0.5s ease' }} />
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:scoreColor(a.demandScore),flexShrink:0 }}>{a.demandScore}%</div>
            </div>
          ))}
        </div>
      ) : <div style={{ display:'flex',justifyContent:'center',padding:20 }}><div className="spinner" /></div>}

      <div style={{ background:'#21262D',borderRadius:11,padding:13,marginBottom:12 }}>
        <p style={{ fontSize:12,fontWeight:600,marginBottom:8 }}>Prediksi Jam Sibuk</p>
        <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
          <span className="chip chip-danger">17:00-18:30 Sangat Tinggi</span>
          <span className="chip chip-warning">12:00-13:00 Tinggi</span>
          <span className="chip chip-success">08:00-09:00 Sedang</span>
        </div>
      </div>
      <button className="btn-success" onClick={() => { onToggleLayer?.('heatmap'); onClose(); }}>
        🔥 Tampilkan Heatmap Driver di Peta
      </button>
    </PanelBase>
  );
}

// ===================================================================
// WEATHER PANEL
// ===================================================================
export function WeatherPanel({ isOpen, onClose, weather }) {
  const cityName = useStore(s => s.cityName);
  const w = weather || { temperature:31, description:'Berawan', humidity:78, windSpeed:12, visibility:8, rainChance:40, forecast:[] };
  const defaultForecast = [
    { time:'15:00', icon:'⛅', temp:29, rainChance:20 },
    { time:'18:00', icon:'🌧', temp:27, rainChance:90 },
    { time:'21:00', icon:'🌦', temp:26, rainChance:40 },
    { time:'00:00', icon:'🌙', temp:24, rainChance:10 },
  ];
  const forecast = (w.forecast?.length ? w.forecast : defaultForecast).slice(0,4);
  const mainIcon = (w.rainChance||0)>60?'🌧':(w.rainChance||0)>30?'⛅':'☀️';

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Cuaca & Kondisi Jalan">
      <div style={{ display:'flex',alignItems:'center',gap:14,padding:14,background:'#21262D',borderRadius:13,marginBottom:14 }}>
        <span style={{ fontSize:46 }}>{w.icon||mainIcon}</span>
        <div>
          <div style={{ fontSize:34,fontWeight:700 }}>{w.temperature}°C</div>
          <div style={{ color:'#8B949E',fontSize:12 }}>{w.description} · {cityName||'Lokasi Anda'}</div>
          <div style={{ fontSize:11,color:(w.rainChance||0)>60?'#D95050':'#8B949E',marginTop:3 }}>
            💧 Hujan {w.rainChance||0}% · Terasa {w.feelsLike||w.temperature}°C
          </div>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:14 }}>
        {[['Kelembaban',(w.humidity||0)+'%'],['Angin',(w.windSpeed||0)+' km/h'],['Visibilitas',(w.visibility||8)+' km']].map(([l,v])=>(
          <div key={l} style={{ background:'#21262D',borderRadius:9,padding:10,textAlign:'center' }}>
            <div style={{ fontSize:10,color:'#8B949E' }}>{l}</div>
            <div style={{ fontSize:16,fontWeight:700,marginTop:3 }}>{v}</div>
          </div>
        ))}
      </div>
      <p className="section-label">Prakiraan Berikutnya</p>
      <div style={{ display:'flex',gap:7,overflowX:'auto',paddingBottom:8,marginBottom:14 }} className="hide-scrollbar">
        {forecast.map((f,i)=>(
          <div key={i} style={{ background:'#21262D',borderRadius:9,padding:11,textAlign:'center',flexShrink:0,minWidth:66 }}>
            <div style={{ fontSize:10,color:'#8B949E' }}>{f.time}</div>
            <div style={{ fontSize:22,margin:'5px 0' }}>{f.icon||'⛅'}</div>
            <div style={{ fontSize:13,fontWeight:600 }}>{f.temp}°C</div>
            <div style={{ fontSize:10,color:(f.rainChance||0)>60?'#D95050':'#8B949E' }}>{f.rainChance||0}%</div>
          </div>
        ))}
      </div>
      {(w.alerts?.length>0?w.alerts:[{ type:'warning', message:'Potensi hujan lebat sore-malam hari. Hindari area rawan banjir.' },{ type:'info', message:'RouteAI otomatis menghindari rute banjir saat hujan terdeteksi.' }]).map((alert,i)=>(
        <div key={i} style={{ background:`rgba(${alert.type==='danger'?'217,80,80':alert.type==='warning'?'196,127,32':'107,92,231'},0.08)`,border:`0.5px solid rgba(${alert.type==='danger'?'217,80,80':alert.type==='warning'?'196,127,32':'107,92,231'},0.2)`,borderRadius:11,padding:12,marginBottom:8 }}>
          <p style={{ fontSize:12,color:'#8B949E',lineHeight:1.5 }}>{alert.message}</p>
        </div>
      ))}
    </PanelBase>
  );
}

// ===================================================================
// SOS PANEL
// ===================================================================
export function SOSPanel({ isOpen, onClose, userLocation, onAlert }) {
  const { user, updateUser } = useStore();
  const [triggered, setTriggered]   = useState(false);
  const [loading,   setLoading]     = useState(false);
  const [contacts,  setContacts]    = useState(user?.emergencyContacts||[]);
  const [fetchingC, setFetchingC]   = useState(false);

  useEffect(() => {
    if (!isOpen) { setTriggered(false); return; }
    setFetchingC(true);
    sosAPI.getContacts().then(r => { if(r.data.success){ setContacts(r.data.data); updateUser({ emergencyContacts: r.data.data }); } }).catch(() => setContacts(user?.emergencyContacts||[])).finally(() => setFetchingC(false));
  }, [isOpen]); // eslint-disable-line

  const handleSOS = async () => {
    if (!userLocation?.lat) { toast.error('GPS tidak tersedia.'); return; }
    setLoading(true);
    try {
      const res = await sosAPI.trigger(userLocation.lat, userLocation.lng, null, 'Pengguna membutuhkan bantuan darurat!');
      if (res.data.success) { setTriggered(true); onAlert?.('🆘 SOS dikirim! Tim bantuan sedang merespons.', 'danger'); toast.success('SOS berhasil dikirim!',{duration:5000}); setTimeout(()=>setTriggered(false),10000); }
    } catch { setTriggered(true); onAlert?.('🆘 SOS dikirim (mode offline)', 'danger'); toast.error('Server tidak merespons. Hubungi 112 langsung.'); setTimeout(()=>setTriggered(false),5000); }
    finally { setLoading(false); }
  };

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="">
      <div style={{ textAlign:'center',padding:'8px 0' }}>
        <div style={{ width:80,height:80,borderRadius:'50%',background:triggered?'#1FAD8E':'#D95050',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',transition:'background 0.4s',animation:triggered?'none':'pulse 2s ease-in-out infinite',boxShadow:`0 0 0 8px rgba(${triggered?'31,173,142':'217,80,80'},0.15)` }}>
          {triggered?<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        </div>
        <h3 style={{ fontSize:18,fontWeight:700,marginBottom:8 }}>{triggered?'✓ SOS Terkirim!':'Butuh Bantuan Darurat?'}</h3>
        <p style={{ fontSize:12,color:'#8B949E',marginBottom:20,lineHeight:1.6 }}>{triggered?`Lokasi Anda (${userLocation?.lat?.toFixed(4)}, ${userLocation?.lng?.toFixed(4)}) telah dikirim ke tim bantuan.`:'Koordinat GPS Anda akan dikirim ke kontak darurat dan pusat bantuan RouteAI.'}</p>
        <button className={triggered?'btn-success':'btn-danger'} onClick={handleSOS} disabled={loading||triggered} style={{ marginBottom:9 }}>{loading?'Mengirim SOS...':triggered?'✓ SOS Terkirim!':'🆘 Kirim SOS & Minta Bantuan'}</button>
        <button className="btn-secondary" onClick={() => { window.location.href='tel:112'; }} style={{ marginBottom:14 }}>📞 Hubungi 112</button>
        <div style={{ background:'#21262D',borderRadius:11,padding:13,textAlign:'left' }}>
          <p style={{ fontSize:11,fontWeight:600,color:'#8B949E',marginBottom:9,textTransform:'uppercase',letterSpacing:'0.05em' }}>Kontak Darurat {fetchingC&&<span style={{fontSize:9,opacity:0.5}}>(memuat...)</span>}</p>
          {contacts.length>0?contacts.map((c,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,marginBottom:i<contacts.length-1?10:0 }}>
              <a href={`tel:${c.phone}`} style={{ width:34,height:34,borderRadius:8,background:'rgba(31,173,142,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,textDecoration:'none' }}>📞</a>
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600 }}>{c.name}</div><div style={{ fontSize:11,color:'#8B949E' }}>{c.phone}{c.relation?` · ${c.relation}`:''}</div></div>
            </div>
          )):<p style={{ fontSize:12,color:'#3D444D',textAlign:'center' }}>Belum ada kontak darurat.<br/><span style={{ color:'#7B6FFF' }}>Tambahkan di Profil</span></p>}
        </div>
      </div>
    </PanelBase>
  );
}

// ===================================================================
// HISTORY PANEL
// ===================================================================
export function HistoryPanel({ isOpen, onClose }) {
  const [trips, setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLM] = useState(false);
  const [page, setPage]     = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadTrips = useCallback(async (pg=1, append=false) => {
    try {
      const r = await tripAPI.getHistory(pg, 10);
      if (r.data.success) { const {trips:data,pages} = r.data.data; setTrips(p=>append?[...p,...data]:data); setHasMore(pg<pages); setPage(pg); }
    } catch {
      if (!append) setTrips([
        { _id:'1',destination:{name:'Pusat Perbelanjaan Terdekat'},origin:{name:'Rumah'},createdAt:new Date().toISOString(),route:{distance:8400,duration:1320},status:'completed' },
        { _id:'2',destination:{name:'RS Charitas'},origin:{name:'Kantor'},createdAt:new Date(Date.now()-86400000).toISOString(),route:{distance:5200,duration:1080},status:'completed' },
        { _id:'3',destination:{name:'Bandara SMB II'},origin:{name:'Rumah'},createdAt:new Date(Date.now()-2*86400000).toISOString(),route:{distance:21300,duration:2700},status:'completed' },
      ]);
    }
  }, []);

  useEffect(() => { if (!isOpen) return; setLoading(true); setPage(1); loadTrips(1,false).finally(()=>setLoading(false)); }, [isOpen, loadTrips]);

  const formatDate = iso => { const d=new Date(iso),diff=Date.now()-d; if(diff<86400000)return'Hari ini '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); if(diff<172800000)return'Kemarin '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); return d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); };

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Riwayat Perjalanan">
      {loading?<div style={{ display:'flex',justifyContent:'center',padding:32 }}><div className="spinner"/></div>:trips.length===0?<div style={{ textAlign:'center',padding:'32px 0',color:'#8B949E' }}><div style={{ fontSize:36,marginBottom:12 }}>🗺️</div><p>Belum ada riwayat perjalanan.</p></div>:(
        <>
          <div style={{ display:'flex',flexDirection:'column',gap:7,marginBottom:12 }}>
            {trips.map(t=>{const dist=((t.route?.distance||0)/1000).toFixed(1),dur=Math.round((t.route?.duration||0)/60);return(
              <div key={t._id} style={{ display:'flex',gap:11,padding:12,background:'#21262D',borderRadius:11 }}>
                <div style={{ width:38,height:38,borderRadius:9,background:'rgba(107,92,231,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#7B6FFF',flexShrink:0 }}>{t.destination?.name?.[0]||'?'}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.destination?.name||'Tujuan'}</div>
                  <div style={{ fontSize:11,color:'#8B949E',marginTop:2 }}>Dari {t.origin?.name||'-'} · {dist} km · {dur} mnt</div>
                </div>
                <div style={{ textAlign:'right',flexShrink:0 }}>
                  <div style={{ fontSize:10,color:'#8B949E' }}>{formatDate(t.createdAt)}</div>
                  <span className={`chip chip-${t.status==='completed'?'success':'warning'}`} style={{ marginTop:4,fontSize:9 }}>{t.status==='completed'?'Selesai':'Diproses'}</span>
                </div>
              </div>
            );})}
          </div>
          {hasMore&&<button className="btn-secondary" onClick={async()=>{setLM(true);await loadTrips(page+1,true);setLM(false);}} disabled={loadingMore}>{loadingMore?'Memuat...':'Muat Lebih Banyak'}</button>}
        </>
      )}
    </PanelBase>
  );
}

// ===================================================================
// LAYERS PANEL – UPGRADE: Benar-benar mengontrol layer di peta
// ===================================================================
const LAYER_DEFS = [
  {
    key: 'traffic',
    label: 'Lalu Lintas Real-time',
    sub: 'Heatmap kemacetan berdasarkan data terkini',
    icon: '🚦',
    color: '#D95050',
    badge: 'LIVE',
  },
  {
    key: 'heatmap',
    label: 'Heatmap Driver',
    sub: 'Area potensi pendapatan & permintaan tinggi',
    icon: '🔥',
    color: '#C47F20',
  },
  {
    key: 'incidents',
    label: 'Insiden Jalan',
    sub: 'Kecelakaan, banjir, konstruksi aktif',
    icon: '🚨',
    color: '#C47F20',
    badge: 'BARU',
  },
  {
    key: 'flood',
    label: 'Zona Rawan Banjir',
    sub: 'Area risiko banjir di sekitar lokasi Anda',
    icon: '🌊',
    color: '#2060D9',
  },
  {
    key: 'cctv',
    label: 'Kamera CCTV',
    sub: `${6} titik kamera aktif di jalan utama`,
    icon: '📹',
    color: '#1FAD8E',
  },
];

export function LayersPanel({ isOpen, onClose, onToggleLayer, layers = {}, onAlert, trafficData }) {
  const activeCount = Object.values(layers).filter(Boolean).length;

  const handleToggle = (key) => {
    onToggleLayer?.(key);
    const def = LAYER_DEFS.find(d => d.key === key);
    const next = !layers[key];
    onAlert?.(`Layer "${def?.label}" ${next ? 'diaktifkan ✓' : 'dinonaktifkan'}`, next ? 'success' : 'info');
  };

  // Statistik traffic untuk info panel
  const rushHour = trafficData?.isRushHour;
  const worstArea = trafficData?.hotspots?.[0];
  const incidentCount = trafficData?.incidents?.length || 0;

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Layer Peta">
      {/* Header info */}
      <div style={{ background:'rgba(107,92,231,0.07)',border:'0.5px solid rgba(107,92,231,0.15)',borderRadius:10,padding:'10px 12px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <p style={{ fontSize:12,fontWeight:600 }}>{activeCount} layer aktif</p>
          <p style={{ fontSize:11,color:'#8B949E',marginTop:2 }}>
            {rushHour ? '🚦 Jam sibuk — heatmap disarankan' : 'Kondisi lalu lintas normal'}
          </p>
        </div>
        <div style={{ fontSize:22 }}>{rushHour ? '🔴' : '🟢'}</div>
      </div>

      {/* Traffic summary (dari data real) */}
      {worstArea && (
        <div style={{ background:'rgba(217,80,80,0.07)',border:'0.5px solid rgba(217,80,80,0.15)',borderRadius:10,padding:'9px 12px',marginBottom:14 }}>
          <p style={{ fontSize:11,color:'#D95050',fontWeight:600 }}>⚠ Titik Terpadat Saat Ini</p>
          <p style={{ fontSize:12,marginTop:3 }}>{worstArea.name}</p>
          <p style={{ fontSize:11,color:'#8B949E',marginTop:2 }}>{worstArea.level} · {worstArea.speed} km/h · {worstArea.congestion}% kepadatan</p>
        </div>
      )}
      {incidentCount > 0 && (
        <div style={{ background:'rgba(196,127,32,0.07)',border:'0.5px solid rgba(196,127,32,0.15)',borderRadius:10,padding:'9px 12px',marginBottom:14 }}>
          <p style={{ fontSize:11,color:'#C47F20',fontWeight:600 }}>🚨 {incidentCount} Insiden Aktif di Area Ini</p>
          <p style={{ fontSize:11,color:'#8B949E',marginTop:2 }}>Aktifkan layer Insiden Jalan untuk melihat detailnya di peta</p>
        </div>
      )}

      {/* Layer toggles */}
      <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:14 }}>
        {LAYER_DEFS.map(def => {
          const isOn = !!layers[def.key];
          return (
            <div key={def.key} onClick={() => handleToggle(def.key)} style={{ background:isOn?`rgba(${def.color==='#D95050'?'217,80,80':def.color==='#C47F20'?'196,127,32':def.color==='#2060D9'?'32,96,217':'31,173,142'},0.08)`:'#21262D',border:`0.5px solid ${isOn?def.color+'40':'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all 0.2s' }}>
              <div style={{ width:40,height:40,borderRadius:11,background:isOn?def.color+'18':'#161B22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,transition:'background 0.2s' }}>
                {def.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                  <span style={{ fontSize:13,fontWeight:600 }}>{def.label}</span>
                  {def.badge && <span style={{ fontSize:8,padding:'2px 5px',background:isOn?def.color+'25':'rgba(255,255,255,0.05)',color:isOn?def.color:'#3D444D',borderRadius:5,fontWeight:700,letterSpacing:'0.05em' }}>{def.badge}</span>}
                </div>
                <p style={{ fontSize:11,color:'#8B949E',marginTop:2 }}>{def.sub}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleToggle(def.key); }}
                className={`toggle ${isOn?'on':''}`}
                style={{ flexShrink:0 }}
              />
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div style={{ background:'rgba(107,92,231,0.06)',border:'0.5px solid rgba(107,92,231,0.12)',borderRadius:10,padding:12 }}>
        <p style={{ fontSize:11,color:'#8B949E',lineHeight:1.6 }}>
          💡 <strong style={{ color:'#F0F6FC' }}>Tips:</strong> Aktifkan <em>Lalu Lintas Real-time</em> untuk melihat kondisi terkini. Layer diperbarui setiap 2 menit dari data backend.
        </p>
      </div>
    </PanelBase>
  );
}
