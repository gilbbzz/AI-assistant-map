// src/components/panels/AIChatPanel.jsx
// FIX NAVIGASI AI:
//  1. Search dengan location bias (lat/lng + city + locationType dari AI)
//  2. Ambil hingga 5 kandidat, bukan 1
//  3. Tampilkan KONFIRMASI/PICKER sebelum membuat rute
//  4. User bisa pilih dari beberapa kandidat atau batalkan
//  5. Tidak ada lagi navigasi ke lokasi salah tanpa verifikasi

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { aiAPI, routeAPI } from '../../services/api';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  'Kemacetan di sekitar saya?',
  'Rumah sakit terdekat',
  'SPBU terdekat',
  'Rute tercepat ke pusat kota',
  'Mall terdekat dari sini',
  'Masjid terdekat',
];

const AI_AVATAR = (
  <div style={{ width: 26, height: 26, borderRadius: 7, background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/>
    </svg>
  </div>
);

// ── Ikon kategori tempat ───────────────────────────────────────────────
const categoryIcon = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('hospital') || t.includes('clinic'))    return '🏥';
  if (t.includes('school') || t.includes('university'))  return '🎓';
  if (t.includes('airport'))   return '✈️';
  if (t.includes('station'))   return '🚉';
  if (t.includes('mall') || t.includes('supermarket') || t.includes('shop')) return '🛒';
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe'))  return '🍽️';
  if (t.includes('mosque') || t.includes('church'))      return '🕌';
  if (t.includes('hotel'))     return '🏨';
  if (t.includes('park'))      return '🌳';
  if (t.includes('gas') || t.includes('fuel'))           return '⛽';
  if (t.includes('bank') || t.includes('atm'))           return '🏦';
  if (t.includes('pharmacy'))  return '💊';
  return '📍';
};

// ── Komponen: Pesan bubble ─────────────────────────────────────────────
const Bubble = ({ msg, onNavigate }) => {
  const isUser = msg.role === 'user';

  // Tipe khusus: picker lokasi (konfirmasi/pilih tujuan)
  if (msg.type === 'locationPicker') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {AI_AVATAR}
        <LocationPicker
          query={msg.query}
          candidates={msg.candidates}
          onConfirm={onNavigate}
          onCancel={msg.onCancel}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-start' }}>
      {!isUser && AI_AVATAR}
      <div style={{
        maxWidth: '80%', padding: '9px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        background: isUser
          ? 'linear-gradient(135deg,#6B5CE7,#8B5CF6)'
          : msg.isError ? 'rgba(217,80,80,0.1)' : '#21262D',
        border: msg.isError ? '0.5px solid rgba(217,80,80,0.2)' : 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}>
        {!isUser && (
          <div style={{ fontSize: 10, fontWeight: 600, color: msg.isError ? '#D95050' : '#7B6FFF', marginBottom: 4 }}>
            {msg.isError ? '⚠ Kesalahan' : 'RouteAI'}
          </div>
        )}
        <div
          style={{ fontSize: 13, color: '#F0F6FC', lineHeight: 1.6, whiteSpace: 'pre-line' }}
          dangerouslySetInnerHTML={{ __html: (msg.content || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
          {new Date(msg.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// ── Komponen: Location Picker / Konfirmasi ─────────────────────────────
// Tampil sebelum navigasi dibuat — user WAJIB konfirmasi tujuan
const LocationPicker = ({ query, candidates, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <div style={{ background: 'rgba(31,173,142,0.1)', border: '0.5px solid rgba(31,173,142,0.3)', borderRadius: 14, padding: '10px 14px', maxWidth: '80%' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#1FAD8E', marginBottom: 4 }}>RouteAI ✓</div>
        <div style={{ fontSize: 13, color: '#F0F6FC' }}>
          🗺 Membuat rute ke <strong>{selected?.name}</strong>...
        </div>
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div style={{ background: 'rgba(217,80,80,0.08)', border: '0.5px solid rgba(217,80,80,0.2)', borderRadius: 14, padding: '10px 14px', maxWidth: '80%' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#D95050', marginBottom: 4 }}>RouteAI</div>
        <div style={{ fontSize: 13, color: '#F0F6FC', marginBottom: 8 }}>
          Maaf, saya tidak dapat menemukan <strong>"{query}"</strong> di sekitar lokasi Anda.
        </div>
        <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 8 }}>Coba sebutkan nama yang lebih spesifik atau tambahkan nama kotanya.</p>
        <button onClick={onCancel} style={{ fontSize: 11, color: '#7B6FFF', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Coba lagi
        </button>
      </div>
    );
  }

  // Satu kandidat → konfirmasi sederhana
  if (candidates.length === 1) {
    const c = candidates[0];
    return (
      <div style={{ background: '#21262D', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', maxWidth: '85%' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#7B6FFF', marginBottom: 8 }}>RouteAI — Konfirmasi Tujuan</div>
        <div style={{ fontSize: 12, color: '#8B949E', marginBottom: 10 }}>
          Apakah ini tujuan yang Anda maksud?
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(107,92,231,0.08)', border: '0.5px solid rgba(107,92,231,0.2)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{categoryIcon(c.type)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
            <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || c.fullAddress}</div>
            {c.distanceKm != null && (
              <div style={{ fontSize: 10, color: '#1FAD8E', marginTop: 3 }}>📍 {c.distanceKm} km dari Anda</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setSelected(c); setConfirmed(true); onConfirm(c); }}
            style={{ flex: 1, padding: '8px 12px', background: '#6B5CE7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ✓ Ya, Buat Rute
          </button>
          <button
            onClick={onCancel}
            style={{ padding: '8px 12px', background: '#21262D', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#8B949E', fontSize: 12, cursor: 'pointer' }}
          >
            Bukan ini
          </button>
        </div>
      </div>
    );
  }

  // Beberapa kandidat → tampilkan daftar pilihan
  return (
    <div style={{ background: '#21262D', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', maxWidth: '90%', width: '100%' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#7B6FFF', marginBottom: 4 }}>RouteAI — Pilih Lokasi</div>
      <div style={{ fontSize: 12, color: '#8B949E', marginBottom: 10 }}>
        Ditemukan {candidates.length} lokasi untuk <strong style={{ color: '#F0F6FC' }}>"{query}"</strong>. Pilih yang dimaksud:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
        {candidates.map((c, i) => (
          <button
            key={c.id || i}
            onClick={() => { setSelected(c); setConfirmed(true); onConfirm(c); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: selected?.id === c.id ? 'rgba(107,92,231,0.15)' : '#161B22',
              border: `0.5px solid ${selected?.id === c.id ? 'rgba(107,92,231,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 20, flexShrink: 0 }}>{categoryIcon(c.type)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#F0F6FC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: 10, color: '#8B949E', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(c.address || c.fullAddress || '').split(',').slice(0, 2).join(',')}
              </div>
            </div>
            {c.distanceKm != null && (
              <div style={{ fontSize: 10, color: '#1FAD8E', flexShrink: 0, fontWeight: 600 }}>{c.distanceKm} km</div>
            )}
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        style={{ width: '100%', padding: '7px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 9, color: '#8B949E', fontSize: 11, cursor: 'pointer' }}
      >
        Tidak ada yang cocok — Coba kata kunci lain
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA: AIChatPanel
// ─────────────────────────────────────────────────────────────────────
export default function AIChatPanel({ isOpen, onClose, onNavigateTo }) {
  const {
    aiMessages, addAIMessage, clearAIMessages,
    user, cityName, weather, userLocation, destination,
  } = useStore();

  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const scrollRef  = useRef(null);
  const inputRef   = useRef(null);
  const greetedRef = useRef(false);

  // ── Greeting sekali ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (aiMessages.length === 0 && !greetedRef.current) {
      greetedRef.current = true;
      const h  = new Date().getHours();
      const gr = h < 12 ? 'Selamat pagi' : h < 17 ? 'Selamat siang' : 'Selamat malam';
      const nm = user?.name?.split(' ')[0] || '';
      addAIMessage({
        role: 'assistant', ts: new Date(),
        content: `${gr}${nm ? ', ' + nm : ''}! Saya **RouteAI**, asisten navigasi cerdas Anda. 🗺️\n\nCukup sebutkan tempat tujuan dan saya akan membantu membuatkan rutenya — dengan konfirmasi lokasi sebelum navigasi dimulai.\n\nContoh: *"Antar aku ke RS terdekat"* atau *"Ke stasiun"*`,
      });
    }
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]); // eslint-disable-line

  // ── Auto-scroll ────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [aiMessages, loading]);

  // ══════════════════════════════════════════════════════════════════
  // FUNGSI UTAMA: Cari lokasi dengan konfirmasi
  // ══════════════════════════════════════════════════════════════════
  const searchAndConfirm = useCallback(async (aiData) => {
    const { navigateTo, locationType, locationCity, locationHint } = aiData;
    if (!navigateTo) return;

    // Bangun query yang diperkaya
    let searchQuery = navigateTo.trim();
    // Tambahkan hint lokasi jika ada (misal "dekat alun-alun")
    if (locationHint) searchQuery += ` ${locationHint}`;

    const lat  = userLocation?.lat;
    const lng  = userLocation?.lng;
    // Prioritas kota: dari AI > dari GPS reverse geocode > fallback
    const city = locationCity || cityName || undefined;

    addAIMessage({
      role: 'assistant', ts: new Date(),
      content: `🔍 Mencari **"${navigateTo}"**${city ? ` di ${city}` : ' di sekitar Anda'}...`,
    });

    try {
      // Cari 5 kandidat terbaik dengan location bias
      const res = await routeAPI.search(
        searchQuery,
        5,      // max 5 kandidat
        lat,    // location bias
        lng,
        city,
        locationType || undefined
      );

      const candidates = res.data?.data || [];

      // Filter hanya Indonesia
      const filtered = candidates.filter(
        c => c.lat >= -11 && c.lat <= 6 && c.lng >= 95 && c.lng <= 141
      );

      // Tambahkan pesan picker ke chat
      addAIMessage({
        role:       'assistant',
        type:       'locationPicker',
        query:      navigateTo,
        candidates: filtered,
        ts:         new Date(),
        onCancel:   () => {
          addAIMessage({
            role: 'assistant', ts: new Date(),
            content: `Oke, navigasi dibatalkan. Coba sebutkan nama atau alamat yang lebih spesifik, misalnya: *"RS Umum di [nama kota]"* atau *"McDonald's dekat [landmark]"*`,
          });
        },
      });
    } catch {
      addAIMessage({
        role: 'assistant', ts: new Date(), isError: true,
        content: `Tidak dapat mencari **"${navigateTo}"** saat ini. Periksa koneksi internet dan coba lagi.`,
      });
    }
  }, [userLocation, cityName, addAIMessage]);

  // ── Konfirmasi → buat rute ─────────────────────────────────────────
  const handleNavigateConfirmed = useCallback((place) => {
    if (onNavigateTo) {
      setTimeout(() => onNavigateTo(place), 300);
    }
  }, [onNavigateTo]);

  // ══════════════════════════════════════════════════════════════════
  // KIRIM PESAN ke Groq AI
  // ══════════════════════════════════════════════════════════════════
  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    addAIMessage({ role: 'user', content: msg, ts: new Date() });
    setLoading(true);

    try {
      const history = aiMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.type !== 'locationPicker'))
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content || '' }));

      const context = {
        city:         cityName  || 'tidak diketahui',
        weather:      weather?.temperature ? `${weather.temperature}°C, ${weather.description}` : 'tidak tersedia',
        userLocation: userLocation ? `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}` : 'tidak tersedia',
        activeRoute:  destination ? { to: destination.name } : null,
        vehicle:      user?.preferences?.vehicle || 'Mobil',
      };

      const res    = await aiAPI.chat(msg, history, context);
      const aiData = res.data?.data || {};
      const reply  = aiData.reply || 'Maaf, tidak dapat merespons saat ini.';

      // Tampilkan reply teks dulu
      addAIMessage({ role: 'assistant', content: reply, ts: new Date() });

      // Jika AI ingin navigasi → jalankan flow konfirmasi
      if (aiData.navigateTo) {
        await searchAndConfirm(aiData);
      }
    } catch (err) {
      addAIMessage({
        role: 'assistant', ts: new Date(), isError: true,
        content: !navigator.onLine
          ? 'Tidak ada koneksi internet.'
          : 'Layanan AI sedang sibuk. Coba lagi dalam beberapa detik.',
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, aiMessages, cityName, weather, userLocation, destination, user, addAIMessage, searchAndConfirm]);

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 70,
      background: '#0D1117', zIndex: 200, display: 'flex', flexDirection: 'column',
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      boxShadow: '0 -4px 30px rgba(0,0,0,0.6)',
    }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#161B22', borderTopLeftRadius: 20, borderTopRightRadius: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#6B5CE7', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <div style={{ position: 'absolute', width: 9, height: 9, background: '#1FAD8E', borderRadius: '50%', border: '1.5px solid #161B22', bottom: -2, right: -2 }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>RouteAI Assistant</div>
            <div style={{ fontSize: 10, color: '#1FAD8E', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1FAD8E' }} />
              Konfirmasi tujuan sebelum navigasi
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={() => { clearAIMessages(); greetedRef.current = false; }} style={{ background: '#21262D', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#8B949E', fontSize: 11 }} title="Hapus percakapan">🗑</button>
          <button onClick={onClose} style={{ background: '#21262D', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#F0F6FC', fontSize: 12, fontWeight: 500 }}>Tutup</button>
        </div>
      </div>

      {/* ── Quick prompts ────────────────────────────────────────── */}
      <div style={{ padding: '8px 16px 6px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
          {QUICK_PROMPTS.map((q, i) => (
            <button key={i} onClick={() => send(q)} disabled={loading}
              style={{ whiteSpace: 'nowrap', padding: '6px 14px', background: '#21262D', borderRadius: 20, fontSize: 11, border: '0.5px solid rgba(255,255,255,0.07)', color: loading ? '#3D444D' : '#F0F6FC', cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pesan ────────────────────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {aiMessages.map((m, i) => (
          <Bubble key={m.id || i} msg={m} onNavigate={handleNavigateConfirmed} />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {AI_AVATAR}
            <div style={{ padding: '10px 14px', background: '#21262D', borderRadius: '4px 14px 14px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#7B6FFF', animation: `loadingDot 1.4s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input ────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)', background: '#161B22', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            style={{ flex: 1, padding: '10px 14px', background: '#21262D', border: `0.5px solid ${input.length > 0 ? 'rgba(107,92,231,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, color: '#F0F6FC', outline: 'none', fontSize: 13, resize: 'none', maxHeight: 100, minHeight: 40, lineHeight: 1.5, fontFamily: 'inherit', overflowY: 'auto' }}
            rows={1}
            placeholder="Tanya atau minta navigasi ke suatu tempat..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ width: 42, height: 42, background: (loading || !input.trim()) ? '#21262D' : '#6B5CE7', border: 'none', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer' }}
          >
            {loading
              ? <div style={{ width: 16, height: 16, border: '2px solid #3D444D', borderTopColor: '#7B6FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : '#3D444D'} strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#3D444D', textAlign: 'center', marginTop: 6 }}>
          Tujuan akan dikonfirmasi sebelum rute dibuat · Groq AI
        </p>
      </div>
    </div>
  );
}
