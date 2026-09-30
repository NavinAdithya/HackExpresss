/**
 * PO → PO — Main Application Entry
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { useAuthStore } from './stores/authStore';
import { AppLayout } from './layouts/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { CreateTripPage } from './pages/CreateTripPage';
import { MatchesPage } from './pages/MatchesPage';
import { ActiveTripPage } from './pages/ActiveTripPage';
import { TripCompletePage } from './pages/TripCompletePage';
import { PlansPage } from './pages/PlansPage';
import { ProfilePage } from './pages/ProfilePage';
import { TripsPage } from './pages/TripsPage';
import { TrackingPage } from './pages/TrackingPage';
import { DailyCommutePage } from './pages/DailyCommutePage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { CommunityPage } from './pages/CommunityPage';
import { PublicProfilePage } from './pages/PublicProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/track/:token" element={<TrackingPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/trip/create" element={<CreateTripPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/matches/:tripId" element={<MatchesPage />} />
        <Route path="/trip/:tripId/active" element={<ActiveTripPage />} />
        <Route path="/trip/:tripId/complete" element={<TripCompletePage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/u/:userId" element={<PublicProfilePage />} />
        <Route path="/commute" element={<DailyCommutePage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/communities/:communityId" element={<CommunityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
