import React, { useState, useEffect } from 'react';
import { PanelBase } from './index';

export default function NavigationPanel({ isOpen, onClose, route, destination, onStop }) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = route?.legs?.[0]?.steps || [];

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      // Simulasi update berdasarkan posisi (bisa diganti dengan geolocation watch)
      if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
      else onStop();
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen, stepIndex, steps, onStop]);

  const currentStep = steps[stepIndex];
  const remaining = steps.slice(stepIndex + 1).reduce((acc, s) => acc + s.duration, 0);
  const remainingMin = Math.round(remaining / 60);

  return (
    <PanelBase isOpen={isOpen} onClose={onClose} title="Navigasi Aktif">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{Math.round(currentStep?.distance || 0)} m</div>
        <div style={{ fontSize: 12, color: '#8B949E' }}>Sisa {remainingMin} menit</div>
      </div>
      <div style={{ background: '#21262D', borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 600 }}>{currentStep?.maneuver?.instruction || 'Teruskan perjalanan'}</p>
        <p style={{ fontSize: 12, color: '#8B949E', marginTop: 6 }}>{destination.name} • {route?.distanceKm} km lagi</p>
      </div>
      <button className="btn-danger" onClick={onStop}>Hentikan Navigasi</button>
    </PanelBase>
  );
}