// src/App.jsx – Root aplikasi RouteAI
// BARU: GoogleOAuthProvider membungkus seluruh app agar GoogleLogin bekerja.
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import useStore from './store/useStore';
import SplashScreen    from './screens/SplashScreen';
import AuthScreen      from './screens/AuthScreen';
import MainScreen      from './screens/MainScreen';
import LiveShareScreen from './screens/LiveShareScreen';
import './styles/global.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const Protected = ({ children }) => {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};
const Public = ({ children }) => {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/app" replace />;
};

function OfflineBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#D95050', color: '#fff', textAlign: 'center',
      fontSize: 12, padding: '6px 12px', animation: 'slideDown 0.3s ease',
    }}>
      ⚠ Tidak ada koneksi internet — Beberapa fitur tidak tersedia
    </div>
  );
}

function App() {
  const setOnline  = useStore(s => s.setOnline);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Viewport height fix untuk mobile browser (100dvh workaround)
  useEffect(() => {
    const setVH = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    setVH();
    window.addEventListener('resize', setVH);
    return () => window.removeEventListener('resize', setVH);
  }, []);

  // Network status detection
  useEffect(() => {
    const onOnline  = () => { setIsOffline(false); setOnline(true); };
    const onOffline = () => { setIsOffline(true);  setOnline(false); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [setOnline]);

  return (
    // GoogleOAuthProvider harus membungkus seluruh app agar GoogleLogin bekerja
    // Jika REACT_APP_GOOGLE_CLIENT_ID kosong, Google Login akan dinonaktifkan di AuthScreen
    <GoogleOAuthProvider
      clientId={GOOGLE_CLIENT_ID}
      onScriptLoadError={() => console.warn('[Google OAuth] Gagal memuat script. Cek REACT_APP_GOOGLE_CLIENT_ID.')}
    >
      <BrowserRouter>
        <div className="app-root">
          {isOffline && <OfflineBanner />}

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#161B22', color: '#F0F6FC',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', fontSize: '13px', maxWidth: '340px',
              },
              success: { iconTheme: { primary: '#1FAD8E', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#D95050', secondary: '#fff' } },
            }}
          />

          <Routes>
            <Route path="/"            element={<SplashScreen />} />
            <Route path="/auth"        element={<Public><AuthScreen /></Public>} />
            <Route path="/app"         element={<Protected><MainScreen /></Protected>} />
            <Route path="/live/:token" element={<LiveShareScreen />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
