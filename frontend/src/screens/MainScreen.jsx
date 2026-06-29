// src/screens/MainScreen.jsx
// FIXED: Tidak ada lagi hardcoded kota/koordinat.
// Semua state awal menggunakan GPS pengguna. 
// Jika GPS gagal, tampilkan prompt untuk izinkan lokasi (bukan fallback ke kota tertentu).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { routeAPI, weatherAPI, aiAPI, trafficAPI } from '../services/api';
import NavigationPanel from '../components/NavigationPanel';
import HeatmapLayer from '../components/HeatmapLayer';
import MapLegend from '../components/MapLegend';

import {
  SearchPanel, RoutePanel, AIChatPanel,
  DriverPanel, ProfilePanel, WeatherPanel,
  HistoryPanel, SOSPanel, LayersPanel,
} from '../components/panels';
import MapControls, { AlertOverlay, RouteBar } from '../components';
import NavBar from '../components/NavBar';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createDotIcon = (color, size = 16) => L.divIcon({
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2.5px solid #fff;
    box-shadow:0 0 0 4px ${color}35,0 2px 8px rgba(0,0,0,0.45)"></div>`,
  className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
});

const createPinIcon = (color) => L.divIcon({
  html: `<div style="position:relative;width:30px;height:38px">
    <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2.5px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.45)"></div>
    <div style="position:absolute;top:6px;left:6px;width:18px;height:18px;
      border-radius:50%;background:#fff;opacity:0.8"></div>
  </div>`,
  className: '', iconSize: [30, 38], iconAnchor: [15, 38],
});

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords?.length > 1) {
      try { map.fitBounds(coords, { padding: [70, 70], maxZoom: 16, animate: true }); } catch {}
    }
  }, [coords, map]);
  return null;
}

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center?.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

const DEFAULT_LAYERS = {
  traffic: true, heatmap: false, flood: false, cctv: false, incidents: true,
};

export default function MainScreen() {
  const {
    user, userLocation, setUserLocation,
    origin, setOrigin, destination, setDestination,
    activeRoute, setActiveRoute, clearRoute,
    activePanel, setActivePanel,
    activeTab, setActiveTab,
    weather, setWeather, cityName, setCityName,
  } = useStore();

  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [fitCoords, setFitCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routesAll, setRoutesAll] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [searchMode, setSearchMode] = useState('destination');
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);

  const weatherRef = useRef(null);
  const trafficRef = useRef(null);

  // ── Fungsi reverse geocode (kota dari koordinat) ────────────────────
  const fetchCityName = useCallback(async (lat, lng) => {
    try {
      const r = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { format: 'json', lat, lon: lng, 'accept-language': 'id' },
        headers: { 'User-Agent': 'RouteAI-App/1.0' }, timeout: 6000,
      });
      const a = r.data?.address;
      setCityName(a?.city || a?.town || a?.municipality || a?.county || a?.state_district || a?.state || null);
    } catch { /* biarkan cityName null */ }
  }, [setCityName]);

  // ── GPS: ambil posisi nyata pengguna ────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsBlocked(true);
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setOrigin({ ...loc, name: 'Lokasi Anda' });
        setMapCenter([loc.lat, loc.lng]);
        setMapZoom(15);
        setGpsLoading(false);
        fetchCityName(loc.lat, loc.lng);
      },
      (err) => {
        console.warn('[GPS] Error:', err.message);
        setGpsBlocked(true);
        setGpsLoading(false);
        // Cek apakah ada lokasi tersimpan sebelumnya dari session
        const saved = user?.savedLocations?.find(l => l.type === 'home');
        if (saved) {
          const loc = { lat: saved.lat, lng: saved.lng };
          setUserLocation(loc);
          setOrigin({ ...loc, name: saved.name || 'Rumah' });
          setMapCenter([loc.lat, loc.lng]);
          setMapZoom(14);
          fetchCityName(loc.lat, loc.lng);
          toast('Menggunakan lokasi rumah yang tersimpan', { icon: '🏠', duration: 3000 });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []); // eslint-disable-line

  // ── Watch position — update GPS secara berkala ──────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // eslint-disable-line

  // ── Fetch cuaca dari GPS pengguna ────────────────────────────────────
  useEffect(() => {
    if (!mapCenter?.[0] || !mapCenter?.[1]) return;
    const fetch = async () => {
      try {
        const r = await weatherAPI.get(mapCenter[0], mapCenter[1], cityName || undefined);
        if (r.data.success) setWeather(r.data.data);
      } catch {}
    };
    fetch();
    weatherRef.current = setInterval(fetch, 5 * 60 * 1000);
    return () => clearInterval(weatherRef.current);
  }, [mapCenter?.[0], mapCenter?.[1]]); // eslint-disable-line

  // ── Fetch traffic dari GPS pengguna ──────────────────────────────────
  useEffect(() => {
    if (!mapCenter?.[0] || !mapCenter?.[1]) return;
    const fetch = async () => {
      try {
        const r = await trafficAPI.get(mapCenter[0], mapCenter[1]);
        if (r.data.success) {
          setTrafficData(r.data.data);
          if (r.data.data.isRushHour) addAlert('🚦 Jam sibuk — pertimbangkan rute alternatif', 'warning');
        }
      } catch {}
    };
    fetch();
    trafficRef.current = setInterval(fetch, 2 * 60 * 1000);
    return () => clearInterval(trafficRef.current);
  }, [mapCenter?.[0], mapCenter?.[1]]); // eslint-disable-line

  // ── Alert terjadwal (generic, bukan kota tertentu) ───────────────────
  useEffect(() => {
    const timers = [
      setTimeout(() => addAlert('⚠ Kemacetan terdeteksi di sekitar area Anda', 'warning'), 6000),
      setTimeout(() => addAlert('🌧 Potensi hujan sore hari — aktifkan layer cuaca', 'warning'), 18000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const addAlert = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setAlerts(p => [...p.slice(-3), { id, msg, type }]);
    setTimeout(() => setAlerts(p => p.filter(a => a.id !== id)), 5500);
  }, []);

  const handleToggleLayer = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectDestination = useCallback((place) => {
  setDestination(place);
  setActivePanel(null);
}, [setDestination, setActivePanel]);

  // const handleDestinationSelect = useCallback(async (place) => {
  //   setDestination(place);
  //   setActivePanel(null);
  //   const cur = origin || (userLocation ? { ...userLocation, name: 'Lokasi Anda' } : null);
  //   if (!cur) { toast.error('Lokasi Anda belum terdeteksi. Izinkan akses GPS.'); return; }
  //   if (!origin) setOrigin(cur);

  //   toast.loading('Menghitung rute...', { id: 'route' });
  //   try {
  //     const res = await routeAPI.calculate(cur, place, { vehicle: user?.preferences?.vehicle || 'car' });
  //     const { routes, tripId } = res.data.data;
  //     if (!routes?.length) { toast.error('Rute tidak ditemukan.', { id: 'route' }); return; }
  //     setRoutesAll(routes);

  //     let selected = routes[0];
  //     try {
  //       const trafficRes = await trafficAPI.get(cur.lat, cur.lng).catch(() => ({ data: { data: {} } }));
  //       const aiRes = await aiAPI.bestRoute({
  //         origin:      { name: cur.name || 'Asal' },
  //         destination: { name: place.name },
  //         vehicle:     user?.preferences?.vehicle || 'car',
  //         weather:     { temp: weather?.temperature || 28, desc: weather?.description || 'cerah', rain: (weather?.rainChance || 0) > 50 },
  //         traffic:     { level: trafficRes.data?.data?.overall || 'sedang', area: cityName || 'Sekitar Anda' },
  //         timeOfDay:   new Date().getHours(),
  //       });
  //       const rec = aiRes.data?.data?.recommended;
  //       const found = routes.find(r => r.type === rec);
  //       if (found) selected = found;
  //     } catch {}

  //     if (tripId) selected._tripId = tripId;
  //     setActiveRoute(selected);
  //     const coords = selected.geometry.coordinates.map(c => [c[1], c[0]]);
  //     setRouteCoords(coords);
  //     setFitCoords(coords);

  //     const eta = new Date(Date.now() + selected.duration * 1000)
  //       .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  //     toast.success(`${selected.distanceKm} km · ${selected.durationMin} mnt · Tiba ${eta}`, { id: 'route', duration: 4000 });
  //     setActivePanel('route');
  //   } catch { toast.error('Gagal menghitung rute. Periksa koneksi internet.', { id: 'route' }); }
  // }, [origin, userLocation, weather, cityName, user?.preferences?.vehicle, setOrigin, setDestination, setActivePanel, setActiveRoute]);

  const handleSelectOrigin = useCallback((place) => {
  setOrigin(place);
  setActivePanel(null);
}, [setOrigin, setActivePanel]);

  const setOriginToGPS = useCallback((e) => {
  e.stopPropagation();
  if (userLocation) {
    setOrigin({ ...userLocation, name: 'Lokasi Anda' });
  } else {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setOrigin({ ...loc, name: 'Lokasi Anda' });
      },
      () => toast.error('GPS tidak tersedia.')
    );
  }
}, [userLocation, setOrigin, setUserLocation]);

  const handleClearRoute = useCallback(() => {
    clearRoute(); setRouteCoords(null); setFitCoords(null); setRoutesAll([]); setActivePanel(null);
    toast('Rute dihapus', { icon: '🗑️' });
  }, [clearRoute, setActivePanel]);

  const handleChangeRouteType = useCallback((type) => {
    const found = routesAll.find(r => r.type === type);
    if (found) {
      setActiveRoute(found);
      const coords = found.geometry.coordinates.map(c => [c[1], c[0]]);
      setRouteCoords(coords); setFitCoords(coords);
      const labels = { fastest: 'Tercepat', eco: 'Hemat BBM', no_toll: 'Tanpa Tol' };
      toast.success(`Rute ${labels[type] || type} dipilih`);
    }
  }, [routesAll, setActiveRoute]);

  const handleLocateMe = useCallback(() => {
    if (userLocation) { setMapCenter([userLocation.lat, userLocation.lng]); setMapZoom(16); setFitCoords(null); }
    else {
      navigator.geolocation?.getCurrentPosition(
        pos => { const l = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setUserLocation(l); setMapCenter([l.lat, l.lng]); setMapZoom(16); setFitCoords(null); setGpsBlocked(false); },
        () => toast.error('GPS tidak tersedia. Periksa pengaturan lokasi.')
      );
    }
  }, [userLocation, setUserLocation]);

const handleAINavigate = useCallback((place) => {
  setActivePanel(null);
  handleSelectDestination(place); // ← ganti dari handleDestinationSelect
}, [handleSelectDestination, setActivePanel]);  const handleStartNav    = useCallback(() => { if (!activeRoute) return; setActivePanel(null); setIsNavigating(true); setNavigationRoute(activeRoute); toast.success('Navigasi dimulai!', { icon: '🧭' }); }, [activeRoute, setActivePanel]);
  const handleStopNav     = useCallback(() => { setIsNavigating(false); setNavigationRoute(null); toast('Navigasi dihentikan', { icon: '🛑' }); }, []);

  const activeLayerCount = Object.values(layers).filter(Boolean).length;
  const showLegend = layers.traffic || layers.heatmap || layers.flood || layers.incidents;

  const panelProps = {
    onClose: () => setActivePanel(null),
    // onDestinationSelect: handleDestinationSelect,
    onClearRoute: handleClearRoute,
    onStartNav: handleStartNav,
    onAlert: addAlert,
    onNavigateTo: handleAINavigate,
    onChangeRouteType: handleChangeRouteType,
    onToggleLayer: handleToggleLayer,
    layers,
  };
  const PANELS = { search: SearchPanel, route: RoutePanel, ai: AIChatPanel, driver: DriverPanel, profile: ProfilePanel, weather: WeatherPanel, history: HistoryPanel, sos: SOSPanel, layers: LayersPanel };
  const ActivePanel = activePanel ? PANELS[activePanel] : null;
  const weatherIcon = (weather?.rainChance || 0) > 60 ? '🌧' : (weather?.rainChance || 0) > 30 ? '⛅' : '☀️';

  useEffect(() => {
  if (!origin || !destination) return;
  if (typeof origin.lat !== 'number' || typeof destination.lat !== 'number') return;

  const fetchRoute = async () => {
    toast.loading('Menghitung rute...', { id: 'route' });
    try {
      const res = await routeAPI.calculate(origin, destination, {
        vehicle: user?.preferences?.vehicle || 'car'
      });
      const { routes, tripId } = res.data.data;
      if (!routes?.length) {
        toast.error('Rute tidak ditemukan.', { id: 'route' });
        return;
      }
      setRoutesAll(routes);
      let selected = routes[0];
      // (opsional) pilih rute terbaik dengan AI
      setActiveRoute(selected);
      const coords = selected.geometry.coordinates.map(c => [c[1], c[0]]);
      setRouteCoords(coords);
      setFitCoords(coords);
      const eta = new Date(Date.now() + selected.duration * 1000)
        .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      toast.success(`${selected.distanceKm} km · ${selected.durationMin} mnt · Tiba ${eta}`, { id: 'route', duration: 4000 });
      setActivePanel('route');
    } catch {
      toast.error('Gagal menghitung rute.', { id: 'route' });
    }
  };
  fetchRoute();
}, [origin, destination, user?.preferences?.vehicle]);

  // ── Loading: menunggu GPS ─────────────────────────────────────────────
  if (gpsLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0D1117', padding: 24 }}>
        <div style={{ width: 60, height: 60, background: '#6B5CE7', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#F0F6FC', fontSize: 15, fontWeight: 700 }}>Mendeteksi lokasi GPS...</div>
          <div style={{ color: '#8B949E', fontSize: 13, marginTop: 6 }}>Mohon izinkan akses lokasi saat diminta</div>
        </div>
        <div className="spinner" style={{ width: 22, height: 22 }} />
      </div>
    );
  }

  // ── GPS Diblokir: tampilkan pesan tanpa fallback kota tertentu ───────
  if (gpsBlocked && !mapCenter) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0D1117', padding: 28 }}>
        <div style={{ width: 60, height: 60, background: 'rgba(217,80,80,0.15)', border: '1.5px solid rgba(217,80,80,0.3)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D95050" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#F0F6FC', fontSize: 16, fontWeight: 700 }}>Akses Lokasi Diperlukan</div>
          <div style={{ color: '#8B949E', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            RouteAI membutuhkan akses GPS untuk menampilkan peta, lalu lintas, dan navigasi sesuai lokasi Anda.
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={handleLocateMe}
          style={{ marginTop: 4 }}
        >
          📍 Izinkan Akses Lokasi
        </button>
        <p style={{ fontSize: 11, color: '#3D444D', textAlign: 'center' }}>
          Atau aktifkan izin lokasi di pengaturan browser/perangkat Anda, lalu muat ulang halaman.
        </p>
      </div>
    );
  }

  return (
  <div className="screen" style={{ background: '#0D1117' }}>
    {/* ══ PETA ════════════════════════════════════════════════════ */}
    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO &copy; OSM' maxZoom={20} />
        {fitCoords ? <FitBounds coords={fitCoords} /> : <MapCenterUpdater center={mapCenter} zoom={mapZoom} />}

        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={createDotIcon('#7B6FFF', 18)} />}
        {origin && userLocation && Math.abs(origin.lat - userLocation.lat) > 0.0001 && (
          <Marker position={[origin.lat, origin.lng]} icon={createDotIcon('#1FAD8E', 13)} />
        )}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={createPinIcon('#D95050')} />}
        {isNavigating && navigationRoute && userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={createDotIcon('#7B6FFF', 22)}
        />
      )}


        {routeCoords && (
          <>
            <Polyline positions={routeCoords} color="#000" weight={10} opacity={0.25} lineCap="round" lineJoin="round" />
            <Polyline positions={routeCoords} color="#6B5CE7" weight={5.5} opacity={0.96} lineCap="round" lineJoin="round" />
            <Polyline positions={routeCoords} color="#fff" weight={1.5} opacity={0.28} dashArray="8,16" lineCap="round" lineJoin="round" />
          </>
        )}

        <HeatmapLayer
          trafficData={trafficData}
          showHeatmap={layers.traffic || layers.heatmap}
          showTraffic={layers.traffic}
          showFlood={layers.flood}
          showCCTV={layers.cctv}
          showIncidents={layers.incidents}
        />
      </MapContainer>
    </div>

    {/* ══ TOP BAR – DUA BAR INPUT (DARI & KE) ════════════════════ */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, padding: '10px 12px' }}>
      {/* Bar "Dari" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#8B949E', fontWeight: 500, width: 30 }}>Dari</span>
        <div
          style={{ flex: 1, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => { setSearchMode('origin'); setActivePanel('search'); }}
        >
          <span style={{ fontSize: 13, color: origin?.name ? '#F0F6FC' : '#3D444D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {origin?.name || 'Lokasi Anda'}
          </span>
          <button onClick={setOriginToGPS} style={{ background: 'none', border: 'none', color: '#7B6FFF', fontSize: 14, padding: 0 }}>
            📍
          </button>
        </div>
      </div>

      {/* Bar "Ke" */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span style={{ fontSize: 11, color: '#8B949E', fontWeight: 500, width: 30 }}>Ke</span>
  <div
    style={{ flex: 1, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
    onClick={() => { setSearchMode('destination'); setActivePanel('search'); }}
  >
    <span style={{ fontSize: 13, color: destination?.name ? '#F0F6FC' : '#3D444D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {destination?.name || 'Mau ke mana?'}
    </span>
    {destination && (
      <button onClick={(e) => { e.stopPropagation(); handleClearRoute(); }} style={{ background: 'none', border: 'none', color: '#8B949E', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
    )}
  </div>
  
  {/* Tombol Layer */}
  <button
    style={{ width: 38, height: 38, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', position: 'relative' }}
    onClick={() => setActivePanel('layers')}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0F6FC" strokeWidth="2" strokeLinecap="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
    {activeLayerCount > 0 && (
      <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, background: '#6B5CE7', borderRadius: '50%', fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0D1117' }}>
        {activeLayerCount}
      </div>
    )}
  </button>
</div>
    </div>

    {/* ══ WEATHER WIDGET ══════════════════════════════════════════ */}
    {weather?.temperature && (
      <div
        style={{ position: 'absolute', top: 110, right: 12, zIndex: 100, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        onClick={() => setActivePanel('weather')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{weatherIcon}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{weather.temperature}°C</div>
            <div style={{ fontSize: 10, color: '#8B949E', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weather.description}</div>
          </div>
        </div>
      </div>
    )}

    <MapLegend show={showLegend} activeLayers={layers} />
    <AlertOverlay alerts={alerts} />
    <MapControls onLocateMe={handleLocateMe} onSOS={() => setActivePanel('sos')} />

    {activeRoute && !activePanel && !isNavigating && (
      <RouteBar route={activeRoute} destination={destination} onViewRoute={() => setActivePanel('route')} onCancel={handleClearRoute} onStart={handleStartNav} />
    )}

    {activePanel && (
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 140, backdropFilter: 'blur(2px)' }} onClick={() => setActivePanel(null)} />
    )}

    {/* ══ PANEL – SEARCH KHUSUS ════════════════════════════════════ */}
    {activePanel === 'search' ? (
      <SearchPanel
        isOpen={true}
        onClose={() => setActivePanel(null)}
        onSelect={searchMode === 'origin' ? handleSelectOrigin : handleSelectDestination}
        mode={searchMode}
      />
    ) : (
      ActivePanel && (
        <ActivePanel {...panelProps} isOpen route={activeRoute} origin={origin} destination={destination} weather={weather} userLocation={userLocation} trafficData={trafficData} />
      )
    )}

    {isNavigating && navigationRoute && (
      <NavigationPanel isOpen={isNavigating} onClose={handleStopNav} route={navigationRoute} destination={destination} onStop={handleStopNav} />
    )}

    <NavBar
      active={activeTab}
      onTab={tab => {
        setActiveTab(tab);
        setActivePanel({ home: null, search: 'search', driver: 'driver', ai: 'ai', profile: 'profile' }[tab] ?? null);
      }}
    />
  </div>
);}