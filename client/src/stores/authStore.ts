/**
 * Auth Store — Zustand state management for authentication
 */

import { create } from 'zustand';
import type { User } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  login: (phone: string, otp: string) => Promise<void>;
  quickLogin: (phone: string, name?: string) => Promise<void>;
  sendOTP: (phone: string, name?: string) => Promise<string | undefined>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('popo_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('popo_token'),
  loading: false,
  error: null,

  setUser: (user) => {
    localStorage.setItem('popo_user', JSON.stringify(user));
    set({ user });
  },

  sendOTP: async (phone, name) => {
    set({ loading: true, error: null });
    try {
      const res = await authAPI.sendOTP(phone, name);
      set({ loading: false });
      return res.data.otp; // Always available
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error || 'Failed to send OTP' });
    }
  },

  quickLogin: async (phone, name) => {
    set({ loading: true, error: null });
    try {
      const res = await authAPI.quickLogin(phone, name);
      const { token, user } = res.data;
      localStorage.setItem('popo_token', token);
      localStorage.setItem('popo_user', JSON.stringify(user));
      set({ user, token, loading: false, error: null });
    } catch (err: any) {
      // Fallback: try standard OTP verify with demo code
      try {
        const otpRes = await authAPI.sendOTP(phone, name);
        const code = otpRes.data?.otp || '123456';
        const res = await authAPI.verifyOTP(phone, code);
        const { token, user } = res.data;
        localStorage.setItem('popo_token', token);
        localStorage.setItem('popo_user', JSON.stringify(user));
        set({ user, token, loading: false, error: null });
      } catch (fallbackErr: any) {
        set({ loading: false, error: fallbackErr.response?.data?.error || 'Demo login failed' });
        throw fallbackErr;
      }
    }
  },

  login: async (phone, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await authAPI.verifyOTP(phone, otp);
      const { token, user } = res.data;

      localStorage.setItem('popo_token', token);
      localStorage.setItem('popo_user', JSON.stringify(user));

      set({ user, token, loading: false, error: null });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error || 'Login failed' });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('popo_token');
    localStorage.removeItem('popo_user');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('popo_token');
    if (!token) return;

    try {
      const res = await authAPI.getMe();
      const user = res.data.user;
      localStorage.setItem('popo_user', JSON.stringify(user));
      set({ user, token });
    } catch {
      localStorage.removeItem('popo_token');
      localStorage.removeItem('popo_user');
      set({ user: null, token: null });
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await authAPI.updateProfile(data);
      const user = res.data.user;
      localStorage.setItem('popo_user', JSON.stringify(user));
      set({ user });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Update failed' });
    }
  },
}));
