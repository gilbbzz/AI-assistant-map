// src/store/useStore.js - Global state dengan Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // ============ AUTH ============
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      cityName: null,
      setCityName: (name) => set({ cityName: name }), 

      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('routeai_token', token);
        if (refreshToken) localStorage.setItem('routeai_refresh', refreshToken);
        set({ user, token, refreshToken, isAuthenticated: true });
      },
      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
      logout: () => {
        localStorage.removeItem('routeai_token');
        localStorage.removeItem('routeai_refresh');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      // ============ MAP & ROUTE ============
      userLocation: null,
      origin: null,
      destination: null,
      waypoints: [],
      activeRoute: null,
      activeTrip: null,
      isNavigating: false,

      setUserLocation: (loc) => set({ userLocation: loc }),
      setOrigin: (origin) => set({ origin }),
      setDestination: (dest) => set({ destination: dest }),
      addWaypoint: (wp) => set((s) => ({ waypoints: [...s.waypoints, wp] })),
      removeWaypoint: (idx) => set((s) => ({ waypoints: s.waypoints.filter((_, i) => i !== idx) })),
      clearWaypoints: () => set({ waypoints: [] }),
      setActiveRoute: (route) => set({ activeRoute: route }),
      setActiveTrip: (trip) => set({ activeTrip: trip }),
      startNavigation: () => set({ isNavigating: true }),
      stopNavigation: () => set({ isNavigating: false, activeRoute: null }),

      clearRoute: () => set({
        origin: null, destination: null,
        waypoints: [], activeRoute: null,
        activeTrip: null, isNavigating: false
      }),

      // ============ WEATHER ============
      weather: null,
      weatherLastFetch: null,
      setWeather: (w) => set({ weather: w, weatherLastFetch: Date.now() }),

      // ============ TRAFFIC ============
      trafficData: null,
      setTrafficData: (d) => set({ trafficData: d }),

      // ============ DRIVER ============
      isDriverMode: false,
      isDriverOnline: false,
      driverDemand: null,
      toggleDriverMode: () => set((s) => ({ isDriverMode: !s.isDriverMode })),
      setDriverOnline: (v) => set({ isDriverOnline: v }),
      setDriverDemand: (d) => set({ driverDemand: d }),

      // ============ AI CHAT ============
      aiMessages: [],
      addAIMessage: (msg) => set((s) => ({
        aiMessages: [...s.aiMessages.slice(-30), msg]
      })),
      clearAIMessages: () => set({ aiMessages: [] }),

      // ============ ALERTS ============
      alerts: [],
      addAlert: (alert) => set((s) => ({
        alerts: [...s.alerts.slice(-9), { id: Date.now(), ...alert }]
      })),
      removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter(a => a.id !== id) })),

      // ============ UI STATE ============
      activeTab: 'home',
      activePanel: null,
      mapType: 'standard',

      setActiveTab: (tab) => set({ activeTab: tab }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setMapType: (type) => set({ mapType: type }),
    }),
    {
      name: 'routeai-store',
      // Hanya persist data yang perlu
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isDriverMode: state.isDriverMode,
        mapType: state.mapType,
      })
    }
  )
);

export default useStore;
