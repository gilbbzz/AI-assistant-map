// frontend/src/screens/MainScreen.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { routeAPI, weatherAPI, aiAPI, trafficAPI } from '../services/api';
import NavigationPanel from '../components/NavigationPanel';

// Panel impor
import {
  SearchPanel,
  RoutePanel,
  AIChatPanel,
  DriverPanel,
  ProfilePanel,
  WeatherPanel,
  HistoryPanel,
  SOSPanel,
  LayersPanel,
} from '../components/panels';

// Components
import MapControls, { AlertOverlay, RouteBar } from '../components';
import NavBar from '../components/NavBar';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createIcon = (color, size = 12) => L.divIcon({
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 0 0 2px ${color}40"></div>`,
  className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2]
});

const createPinIcon = (color) => L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7]
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, map, zoom]);
  return null;
}

export default function MainScreen() {
  const {
    user, userLocation, setUserLocation,
    origin, setOrigin, destination, setDestination,
    activeRoute, setActiveRoute, clearRoute,
    activePanel, setActivePanel,
    activeTab, setActiveTab,
    weather, setWeather,
    cityName, setCityName,   // dari store
  } = useStore();

  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState(null); // null = belum siap
  const [mapZoom, setMapZoom] = useState(13);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routesAll, setRoutesAll] = useState([]);
  const [alerts, setAlerts] = useState([]); 
  const [mapRef, setMapRef] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ========== Ambil lokasi awal (GPS / Rumah) ==========
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setOrigin({ ...loc, name: 'Lokasi Anda' });
        setMapCenter([loc.lat, loc.lng]);
        setMapZoom(15);
        fetchCityName(loc.lat, loc.lng);
      },
      () => {
        // GPS gagal → cari "Rumah" di savedLocations
        const home = user?.savedLocations?.find(loc => loc.type === 'home');
        if (home) {
          setUserLocation({ lat: home.lat, lng: home.lng });
          setOrigin({ lat: home.lat, lng: home.lng, name: home.name || 'Rumah' });
          setMapCenter([home.lat, home.lng]);
          setMapZoom(13);
          fetchCityName(home.lat, home.lng);
        } else {
          // Tidak ada GPS & tidak ada Rumah → arahkan ke profil
          toast('Silakan atur lokasi Rumah Anda terlebih dahulu', { icon: '🏠' });
          setActivePanel('profile');
          // Fallback koordinat netral agar peta tetap bisa muncul
          const fallback = { lat: -2.5489, lng: 118.0149 };
          setUserLocation(fallback);
          setOrigin({ ...fallback, name: 'Indonesia' });
          setMapCenter([fallback.lat, fallback.lng]);
          setMapZoom(5);
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [user?.savedLocations]);

  // ========== Ambil nama kota dengan reverse geocoding ==========
  const fetchCityName = async (lat, lng) => {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { format: 'json', lat, lon: lng, 'accept-language': 'id' },
        headers: { 'User-Agent': 'RouteAI-App/1.0' }
      });
      const address = res.data?.address;
      const city = address?.city || address?.town || address?.state_district || address?.state || 'Indonesia';
      setCityName(city);
    } catch {
      setCityName('Indonesia');
    }
  };

  // ========== Cuaca berkala ==========
  useEffect(() => {
    const fetchData = async () => {
      try {
        const wRes = await weatherAPI.get(mapCenter[0], mapCenter[1]);
        if (wRes.data.success) setWeather(wRes.data.data);
      } catch { /* simulasi */ }
    };
    if (mapCenter) fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mapCenter, setWeather]);

  // ========== Alert simulasi ==========
  useEffect(() => {
    const alertsData = [
      { msg: 'Kemacetan terdeteksi di jalan utama', type: 'warning', delay: 4000 },
      { msg: 'Peringatan: Potensi hujan lebat sore hari', type: 'warning', delay: 10000 },
      { msg: 'Area pusat kota: permintaan driver tinggi!', type: 'success', delay: 18000 },
      { msg: 'Kecelakaan dilaporkan di jalan arteri', type: 'danger', delay: 30000 },
    ];
    const timers = alertsData.map(a => setTimeout(() => addAlert(a.msg, a.type), a.delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const addAlert = (msg, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  };

  // ========== Pilih tujuan dan hitung rute ==========
  const handleDestinationSelect = useCallback(async (place) => {
  setDestination(place);
  setMapCenter([place.lat, place.lng]);
  setActivePanel(null);

  // Pastikan origin ada, kalau tidak fallback ke userLocation atau beri tahu
  let currentOrigin = origin;
  if (!currentOrigin) {
    if (userLocation) {
      // Buat origin dari lokasi user saat ini
      currentOrigin = { ...userLocation, name: 'Lokasi Anda' };
      setOrigin(currentOrigin);
    } else {
      toast.error('Lokasi Anda belum terdeteksi. Izinkan GPS atau atur Rumah di Profil.');
      return;
    }
  }

  toast.loading('Menghitung rute...', { id: 'route' });
  try {
    const res = await routeAPI.calculate(currentOrigin, place, { vehicle: 'car', routeType: 'alternatives' });
    const { routes } = res.data.data;
    setRoutesAll(routes);
    setActiveRoute(routes[0]);
    if (!routes || !routes.length) {
      toast.error('Rute tidak ditemukan untuk lokasi ini.', { id: 'route' });
      return;
    }

    let selectedRoute = routes[0];

    // AI best route (opsional, tidak wajib)
    try {
      const trafficRes = await trafficAPI.get(
  mapCenter[0], 
  mapCenter[1]
);
      const trafficData = trafficRes.data.data;
      const bestRouteRes = await aiAPI.bestRoute({
        origin: { name: currentOrigin.name || 'Asal' },
        destination: { name: place.name },
        vehicle: 'car',
        weather: {
          temp: weather?.temperature || 31,
          desc: weather?.description || 'cerah',
          rain: (weather?.rainChance || 0) > 50
        },
        traffic: {
          level: trafficData?.overall || 'sedang',
          area: 'sekitar'
        },
        timeOfDay: new Date().getHours()
      });
      const recommendedType = bestRouteRes.data.data.recommended;
      const found = routes.find(r => r.type === recommendedType);
      if (found) selectedRoute = found;
    } catch (err) {
      console.warn('AI best route gagal, menggunakan rute pertama', err);
    }

    setActiveRoute(selectedRoute);
    const coords = selectedRoute.geometry.coordinates.map(c => [c[1], c[0]]);
    setRouteCoords(coords);
    const eta = new Date(Date.now() + selectedRoute.duration * 1000);
    toast.success(
      `Rute ${selectedRoute.type || 'default'}: ${selectedRoute.distanceKm} km · ${selectedRoute.durationMin} mnt · Tiba ${eta.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      { id: 'route', duration: 4000 }
    );
    setActivePanel('route');
  } catch (err) {
    console.error('Gagal menghitung rute', err);
    toast.error('Gagal menghitung rute. Pastikan Anda terhubung ke internet.', { id: 'route' });
  }
}, [origin, userLocation, weather]);

  const handleClearRoute = () => {
    clearRoute();
    setRouteCoords(null);
    setActivePanel(null);
    toast('Rute dihapus', { icon: '🗑️' });
  };
  const handleChangeRouteType = useCallback((type) => {
  const found = routesAll.find(r => r.type === type);
  if (found) {
    setActiveRoute(found);
    const coords = found.geometry.coordinates.map(c => [c[1], c[0]]);
    setRouteCoords(coords);
    toast.success(`Rute ${type} dipilih`);
  }
}, [routesAll]);

  const handleLocateMe = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(15);
    } else {
      navigator.geolocation?.getCurrentPosition(pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
        setMapZoom(15);
      });
    }
  };
const handleAINavigate = useCallback((place) => {
  // Tutup panel AI dan langsung gunakan fungsi yang sudah ada
  setActivePanel(null);
  handleDestinationSelect(place);
}, [handleDestinationSelect]);

  const handleStartNav = () => {
    setActivePanel(null);
    setIsNavigating(true);
    setNavigationRoute(activeRoute);
    toast.success('Navigasi dimulai, ikuti petunjuk arah.');
  };

  const handleStopNav = () => {
    setIsNavigating(false);
    setNavigationRoute(null);
    toast('Navigasi dihentikan.');
  };

  const panelProps = {
    onClose: () => setActivePanel(null),
    onDestinationSelect: handleDestinationSelect,
    onClearRoute: handleClearRoute,
    onStartNav: handleStartNav,
    onAlert: addAlert,
    onNavigateTo: handleAINavigate,
    onChangeRouteType: handleChangeRouteType,
  };

  const panels = { search: SearchPanel, route: RoutePanel, ai: AIChatPanel, driver: DriverPanel, profile: ProfilePanel, weather: WeatherPanel, history: HistoryPanel, sos: SOSPanel, layers: LayersPanel };
  const ActivePanel = activePanel ? panels[activePanel] : null;

  // ========== RENDER ==========
  return (
    <div className="screen" style={{ background: '#0D1117' }}>
      {!mapCenter ? (
        // Loading selama lokasi belum didapat
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span style={{ color: '#8B949E', fontSize: 13 }}>Mendeteksi lokasi Anda...</span>
        </div>
      ) : (
        <>
          {/* MAP */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={true}
              ref={setMapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                maxZoom={19}
              />
              <MapUpdater center={mapCenter} zoom={mapZoom} />
              {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={createIcon('#6B5CE7', 14)} />}
              {origin && origin.lat !== userLocation?.lat && <Marker position={[origin.lat, origin.lng]} icon={createPinIcon('#1FAD8E')} />}
              {destination && <Marker position={[destination.lat, destination.lng]} icon={createPinIcon('#D95050')} />}
              {routeCoords && <Polyline positions={routeCoords} color="#6B5CE7" weight={5} opacity={0.9} lineCap="round" lineJoin="round" />}
            </MapContainer>
          </div>

          {/* TOP BAR */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, padding: '10px 12px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{ flex: 1, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 13, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => { setActivePanel('search'); setActiveTab('search'); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span style={{ fontSize: 14, color: destination ? '#F0F6FC' : '#3D444D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {destination?.name || 'Mau ke mana?'}
                </span>
                {destination && (
                  <button onClick={e => { e.stopPropagation(); handleClearRoute(); }} style={{ background: 'none', border: 'none', color: '#8B949E', fontSize: 16, padding: 0 }}>×</button>
                )}
              </div>
              <button
                style={{ width: 42, height: 42, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onClick={() => setActivePanel('layers')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0F6FC" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              </button>
            </div>
          </div>

          {/* WEATHER WIDGET */}
          <div
            style={{ position: 'absolute', top: 68, right: 12, zIndex: 100, background: 'rgba(22,27,34,0.97)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 11, padding: '8px 12px', cursor: 'pointer' }}
            onClick={() => setActivePanel('weather')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>⛅</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{weather?.temperature || 31}°C</div>
                <div style={{ fontSize: 10, color: '#8B949E' }}>{weather?.description || 'Berawan'}</div>
              </div>
            </div>
          </div>

          <AlertOverlay alerts={alerts} />
          <MapControls onLocateMe={handleLocateMe} onSOS={() => setActivePanel('sos')} />

          {activeRoute && !activePanel && (
            <RouteBar
              route={activeRoute}
              destination={destination}
              onViewRoute={() => setActivePanel('route')}
              onCancel={handleClearRoute}
              onStart={handleStartNav}
            />
          )}

          {activePanel && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 140 }} onClick={() => setActivePanel(null)} />}
          {ActivePanel && (
            <ActivePanel
              {...panelProps}
              isOpen={true}
              route={activeRoute}
              origin={origin}
              destination={destination}
              weather={weather}
              userLocation={userLocation}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap(h => !h)}
            />
          )}
          {isNavigating && navigationRoute && (
            <NavigationPanel
              isOpen={isNavigating}
              onClose={handleStopNav}
              route={navigationRoute}
              destination={destination}
              onStop={handleStopNav}
            />
          )}
          <NavBar
            active={activeTab}
            onTab={(tab) => {
              setActiveTab(tab);
              const panelMap = { home: null, search: 'search', driver: 'driver', ai: 'ai', profile: 'profile' };
              setActivePanel(panelMap[tab]);
            }}
          />
        </>
      )}
    </div>
  );
}