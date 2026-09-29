/**
 * Trip Store — Zustand state management for trips
 */

import { create } from 'zustand';
import type { Trip, MatchResult, FareBreakdown } from '../types';
import { tripAPI, matchAPI } from '../services/api';

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  matches: MatchResult[];
  matchLoading: boolean;
  fareBreakdown: FareBreakdown | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTrips: (params?: Record<string, string>) => Promise<void>;
  fetchTrip: (id: string) => Promise<void>;
  createTrip: (data: Record<string, unknown>) => Promise<Trip>;
  findMatches: (tripId: string) => Promise<void>;
  acceptMatch: (matchId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: string) => Promise<void>;
  verifyFace: (tripId: string) => Promise<{ verified: boolean; bothVerified: boolean }>;
  setCurrentTrip: (trip: Trip | null) => void;
  clearMatches: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  currentTrip: null,
  matches: [],
  matchLoading: false,
  fareBreakdown: null,
  loading: false,
  error: null,

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
        loading: false,
      }));
      return trip;
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error });
      throw err;
    }
  },

  findMatches: async (tripId) => {
    set({ matchLoading: true, matches: [], error: null });
    try {
      const res = await matchAPI.find(tripId);
      set({ matches: res.data.matches, matchLoading: false });
    } catch (err: any) {
      set({ matchLoading: false, error: err.response?.data?.error });
    }
  },

  acceptMatch: async (matchId) => {
    try {
      const res = await matchAPI.accept(matchId);
      const { tripA, tripB } = res.data;
      set({ currentTrip: tripA || tripB });
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

  verifyFace: async (tripId) => {
    try {
      const res = await tripAPI.verifyFace(tripId);
      return res.data;
    } catch (err: any) {
      set({ error: err.response?.data?.error });
      throw err;
    }
  },

  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  clearMatches: () => set({ matches: [] }),
}));
