// src/App.jsx - Root aplikasi dengan routing
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import MainScreen from './screens/MainScreen';
import LiveShareScreen from './screens/LiveShareScreen';
import './styles/global.css';

// Protected route - redirect ke login kalau belum auth
const Protected = ({ children }) => {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

// Public route - redirect ke app kalau sudah auth
const Public = ({ children }) => {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/app" replace />;
};

function App() {
  // Set viewport height untuk mobile (fix masalah 100vh di browser mobile)
  useEffect(() => {
    const setVH = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    return () => window.removeEventListener('resize', setVH);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-root">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#161B22',
              color: '#F0F6FC',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '13px',
              maxWidth: '340px'
            }
          }}
        />
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/auth" element={<Public><AuthScreen /></Public>} />
          <Route path="/app" element={<Protected><MainScreen /></Protected>} />
          <Route path="/live/:token" element={<LiveShareScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
