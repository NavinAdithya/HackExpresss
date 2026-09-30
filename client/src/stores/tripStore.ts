/**
 * Trip Store — Zustand state management for trips
 */

import { create } from 'zustand';
import type { Trip, MatchResult, FareBreakdown, DailyCommuteQuota } from '../types';
import { tripAPI, matchAPI } from '../services/api';

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  matches: MatchResult[];
  matchLoading: boolean;
  fareBreakdown: FareBreakdown | null;
  dailyQuota: DailyCommuteQuota | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTrips: (params?: Record<string, string>) => Promise<void>;
  fetchTrip: (id: string) => Promise<void>;
  fetchDailyQuota: () => Promise<void>;
  createTrip: (data: Record<string, unknown>) => Promise<Trip>;
  findMatches: (tripId: string, isBackground?: boolean) => Promise<void>;
  acceptMatch: (matchId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: string) => Promise<void>;
  verifyFace: (tripId: string, imageData?: string) => Promise<{ verified: boolean; confidence: number; bothVerified: boolean; status?: string }>;
  generateStartOtp: (tripId: string, coords?: { passengerLat?: number; passengerLng?: number; travellerLat?: number; travellerLng?: number }) => Promise<{ tripStartOtp: string; expiresAt: string }>;
  verifyStartOtp: (tripId: string, enteredOtp: string) => Promise<{ success: boolean; status: string; trip: Trip }>;
  setCurrentTrip: (trip: Trip | null) => void;
  clearMatches: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  currentTrip: null,
  matches: [],
  matchLoading: false,
  fareBreakdown: null,
  dailyQuota: null,
  loading: false,
  error: null,

  fetchDailyQuota: async () => {
    try {
      const res = await tripAPI.getDailyQuota();
      set({ dailyQuota: res.data });
    } catch {
      /* handled */
    }
  },

  fetchTrips: async (params) => {
    set({ loading: true });
    try {
      const res = await tripAPI.list(params);
      set({ trips: Array.isArray(res.data?.trips) ? res.data.trips : [], loading: false });
    } catch (err: any) {
      set({ trips: [], loading: false, error: err.response?.data?.error });
    }
  },

  fetchTrip: async (id) => {
    set({ loading: true });
    try {
      const res = await tripAPI.get(id);
      set({
        currentTrip: res.data.trip,
        fareBreakdown: res.data.fareBreakdown,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error });
    }
  },

  createTrip: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await tripAPI.create(data);
      const trip = res.data.trip;
      set((state) => ({
        trips: [trip, ...state.trips],
        currentTrip: trip,
        fareBreakdown: res.data.fareEstimate,
        dailyQuota: res.data.dailyQuota || state.dailyQuota,
        loading: false,
      }));
      return trip;
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error });
      throw err;
    }
  },

  findMatches: async (tripId, isBackground = false) => {
    if (!isBackground) {
      set({ matchLoading: true, matches: [], error: null });
    }
    try {
      const res = await matchAPI.find(tripId);
      set((state) => ({
        matches: res.data.matches,
        dailyQuota: res.data.dailyQuota || state.dailyQuota,
        matchLoading: false,
      }));
    } catch (err: any) {
      set({ matchLoading: false, error: err.response?.data?.error });
    }
  },

  acceptMatch: async (matchId) => {
    try {
      const res = await matchAPI.accept(matchId);
      const { tripA, tripB, dailyQuota } = res.data;
      set((state) => ({
        currentTrip: tripA || tripB,
        dailyQuota: dailyQuota || state.dailyQuota,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error });
      throw err;
    }
  },

  cancelTrip: async (tripId) => {
    try {
      const res = await tripAPI.cancel(tripId);
      set((state) => ({
        trips: state.trips.map((t) => (t._id === tripId ? { ...t, status: 'CANCELLED' as any } : t)),
        currentTrip: state.currentTrip?._id === tripId ? { ...state.currentTrip, status: 'CANCELLED' as any } : state.currentTrip,
        dailyQuota: res.data.dailyQuota || state.dailyQuota,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error });
      throw err;
    }
  },

  updateTripStatus: async (tripId, status) => {
    try {
      const res = await tripAPI.updateStatus(tripId, status);
      set({ currentTrip: res.data.trip });
    } catch (err: any) {
      set({ error: err.response?.data?.error });
      throw err;
    }
  },

  verifyFace: async (tripId, imageData) => {
    try {
      const res = await tripAPI.verifyFace(tripId, imageData);
      return res.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.response?.data?.error });
      throw err;
    }
  },

  generateStartOtp: async (tripId, coords) => {
    try {
      const res = await tripAPI.generateStartOtp(tripId, coords);
      return res.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.response?.data?.error });
      throw err;
    }
  },

  verifyStartOtp: async (tripId, enteredOtp) => {
    try {
      const res = await tripAPI.verifyStartOtp(tripId, enteredOtp);
      if (res.data.trip) set({ currentTrip: res.data.trip });
      return res.data;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.response?.data?.error });
      throw err;
    }
  },

  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  clearMatches: () => set({ matches: [] }),
}));
