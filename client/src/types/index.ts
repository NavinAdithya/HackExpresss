/**
 * TypeScript interfaces for PO → PO
 */

export interface User {
  _id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  verified: boolean;
  verifiedOnly: boolean;
  womenOnly: boolean;
  trustScore: number;
  plan: 'FREE' | 'VERIFIED' | 'PRO';
  subscriptionStatus: 'FREE' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  subscriptionStart?: string;
  subscriptionEnd?: string;
  profilePhoto: string;
  trustedContacts: TrustedContact[];
  recurringCommutes?: RecurringCommute[];
  createdAt: string;
}

export interface TrustedContact {
  name: string;
  phone: string;
  circle?: string;
}

export interface RecurringCommute {
  label: string;
  origin: GeoPoint;
  destination: GeoPoint;
  days: string[];
  departureTime: string;
}

export interface GeoPoint {
  address: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  coordinates?: [number, number];
}

export interface Trip {
  _id: string;
  userId: string;
  role: 'driver' | 'passenger';
  origin: GeoPoint;
  destination: GeoPoint;
  route: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  routeDistance: number;
  routeDuration: number;
  departureTime: string;
  timeWindow: number;
  seatCount: number;
  budgetMin: number;
  budgetMax: number;
  tolls: number;
  verifiedOnly: boolean;
  womenOnly: boolean;
  status: TripStatus;
  matchedTripId?: string;
  matchedUserId?: User;
  matchId?: string;
  fare?: number;
  commission?: number;
  faceVerificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  sharedTrackingToken?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export type TripStatus =
  | 'POSTED' | 'MATCHED' | 'ACCEPTED' | 'VERIFYING'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface MatchResult {
  matchId: string;
  tripId: string;
  userId: string;
  userName: string;
  userGender: string;
  userVerified: boolean;
  userTrustScore: number;
  userPlan: string;
  userPhoto: string;
  candidateTrip: Trip;
  routeScore: number;
  timeScore: number;
  budgetScore: number;
  capacityScore: number;
  finalScore: number;
  adjustedScore?: number;
  proBoost?: number;
  budgetCompatible: boolean;
  capacityCompatible: boolean;
  explanation: string;
  match?: Match;
}

export interface Match {
  _id: string;
  tripA: string;
  tripB: string;
  userA: User | string;
  userB: User | string;
  routeScore: number;
  timeScore: number;
  budgetScore: number;
  capacityScore: number;
  finalScore: number;
  explanation: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  createdAt: string;
}

export interface FareBreakdown {
  distanceKm: number;
  fuelCost: number;
  tolls: number;
  totalOccupants: number;
  poolFare: number;
  commission: number;
  finalAmount: number;
  formula: string;
}

export interface Plan {
  id: string;
  price: number;
  interval: string | null;
  label: string;
  tagline: string;
  description: string;
  icon: string | null;
  cta: string;
  features: string[];
  featureLabels: Record<string, string>;
}

export interface SOSAlert {
  _id: string;
  tripId: string;
  userId: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM';
  createdAt: string;
}

export interface Rating {
  _id: string;
  rater: string | User;
  ratedUser: string;
  trip: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface LocationUpdate {
  userId: string;
  lat: number;
  lng: number;
  timestamp: string;
}
