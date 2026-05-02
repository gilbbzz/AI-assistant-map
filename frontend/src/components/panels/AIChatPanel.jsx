// src/components/panels/AIChatPanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import { aiAPI, routeAPI } from '../../services/api';
import useStore from '../../store/useStore';

const QUICK = [
  'Ada kemacetan di sekitar saya?',
  'SPBU terdekat dari lokasi saya',
  'Kondisi cuaca hari ini',
  'Rute tercepat ke pusat kota',
  'Tips berkendara saat hujan',
  'Area mana yang paling ramai saat ini?',
];

export default function AIChatPanel({ isOpen, onClose, onNavigateTo }) {
  const {
    aiMessages,
    addAIMessage,
    user,
    cityName,
    weather,
    userLocation,
    destination,
  } = useStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Greeting
  useEffect(() => {
    if (aiMessages.length === 0) {
      const h = new Date().getHours();
      const gr = h < 12 ? 'Selamat pagi' : h < 17 ? 'Selamat siang' : 'Selamat sore';
      addAIMessage({
        role: 'assistant',
        content: `${gr}! Saya RouteAI, asisten navigasi cerdas Anda.\n\nKetik pertanyaan Anda!`,
        ts: new Date()
      });
    }
  }, []);

  // Auto scroll ke bawah
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [aiMessages, loading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    addAIMessage({ role: 'user', content: msg, ts: new Date() });
    setLoading(true);
    try {
      const history = aiMessages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const context = {
        city: cityName || 'Indonesia',
        weather: weather?.temperature
          ? `${weather.temperature}°C, ${weather.description}`
          : 'Berawan',
        userLocation: userLocation
          ? `${userLocation.lat},${userLocation.lng}`
          : 'Indonesia',
        activeRoute: destination ? { to: destination.name } : null,
        vehicle: user?.preferences?.vehicle || 'Mobil'
      };
      const res = await aiAPI.chat(msg, history, context);
      const aiData = res.data.data || {};
      const reply = aiData.reply || 'AI tidak memberikan jawaban.';

      addAIMessage({ role: 'assistant', content: reply, ts: new Date() });

      // Cek apakah AI menyarankan navigasi ke suatu tempat
      if (aiData.navigateTo && onNavigateTo) {
        // Cari tempat yang dimaksud
        try {
          const searchRes = await routeAPI.search(aiData.navigateTo);
          if (searchRes.data.success && searchRes.data.data.length > 0) {
            const place = searchRes.data.data[0];
            onNavigateTo(place);   // Peta akan langsung membuat rute
          } else {
            addAIMessage({
              role: 'assistant',
              content: `Maaf, saya tidak dapat menemukan lokasi "${aiData.navigateTo}".`,
              ts: new Date()
            });
          }
        } catch (searchErr) {
          addAIMessage({
            role: 'assistant',
            content: `Gagal mencari rute ke ${aiData.navigateTo}.`,
            ts: new Date()
          });
        }
      }
    } catch (err) {
      addAIMessage({ role: 'assistant', content: 'Maaf, AI sedang sibuk. Coba lagi nanti.', ts: new Date() });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 70,
      backgroundColor: '#0D1117',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)',
        background: '#161B22',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0110 4a2 2 0 012-2z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>RouteAI Assistant</div>
            <div style={{ fontSize: 11, color: '#1FAD8E' }}>Online — Groq AI</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: '#21262D',
          border: 'none',
          borderRadius: 20,
          padding: '6px 12px',
          color: '#F0F6FC',
          fontSize: 12,
          cursor: 'pointer'
        }}>Tutup</button>
      </div>

      {/* Quick prompts */}
      <div style={{ padding: '12px 16px', background: '#0D1117' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {QUICK.map((q, i) => (
            <button key={i} onClick={() => send(q)}
              style={{ whiteSpace: 'nowrap', padding: '6px 14px', background: '#21262D', borderRadius: 20, fontSize: 12, border: 'none', color: '#F0F6FC' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        {aiMessages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div style={{
              display: 'inline-block',
              maxWidth: '80%',
              padding: '8px 14px',
              borderRadius: 16,
              background: m.role === 'user' ? '#6B5CE7' : '#21262D',
              color: '#F0F6FC',
              fontSize: 13,
              textAlign: 'left'
            }}>
              {m.role === 'assistant' && <strong style={{ color: '#7B6FFF' }}>RouteAI</strong>}
              <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 16, background: '#21262D' }}>
              <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.1)', background: '#0D1117' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1, padding: '10px 14px', backgroundColor: '#21262D', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 24, color: '#F0F6FC', outline: 'none' }}
            placeholder="Tanya RouteAI..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && send()}
            autoFocus
          />
          <button onClick={() => send()} style={{ padding: '8px 18px', background: '#6B5CE7', border: 'none', borderRadius: 24, color: '#fff', fontWeight: 600 }}>Kirim</button>
        </div>
      </div>
    </div>
  );
}