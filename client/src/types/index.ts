/**
 * TypeScript interfaces for PO → PO Master Specification
 */

export interface User {
  _id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  verified: boolean;
  accountVerified?: boolean;
  isPoPoMember?: boolean;
  driverStatus?: 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  rolePreference?: 'PASSENGER' | 'TRAVELLER' | 'BOTH';
  faceReferencePhoto?: string;
  vehicleDetails?: {
    transportMode: 'BIKE' | 'CAR';
    vehicleModel: string;
    vehicleRegistration: string;
    capacity: number;
  };
  verifiedOnly?: boolean;
  womenOnly: boolean;
  trustScore: number;
  trustScoreBreakdown?: TrustScoreBreakdown;
  trustScoreFactors?: TrustScoreFactor[];
  trustTier?: string;
  trustTierLabel?: string;
  dailyQuota?: DailyCommuteQuota;
  plan: 'FREE' | 'VERIFIED' | 'PRO';
  subscriptionStatus: 'FREE' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  subscriptionStart?: string;
  subscriptionEnd?: string;
  profilePhoto: string;
  trustedContacts: TrustedContact[];
  recurringCommutes?: RecurringCommute[];
  createdAt: string;
}

export interface DailyCommuteQuota {
  maxRidesPerDay: number;
  usedRideCount: number;
  remainingRideCount: number;
  canConfirmRide: boolean;
  quotaResetAt: string;
  metrics: {
    searchAttempts: number;
    commutePublications: number;
    passengerMatches: number;
    confirmedRides: number;
    completedRides: number;
    cancelledBeforeStart: number;
  };
  statusRules?: Record<string, number>;
}

export interface TrustScoreFactor {
  id: string;
  name: string;
  points: number;
  maxPoints: number;
  status: string;
  statusType: 'positive' | 'neutral' | 'warning' | 'danger';
  description: string;
}

export interface TrustScoreBreakdown {
  score: number;
  tier: string;
  tierLabel: string;
  breakdown: {
    identityVerification: TrustScoreFactor;
    travellerStatus: TrustScoreFactor;
    completedTrips: TrustScoreFactor;
    ratings: TrustScoreFactor;
    cancellationReliability: TrustScoreFactor;
    conductPenalties: TrustScoreFactor;
  };
  factors: TrustScoreFactor[];
  calculatedAt: string;
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
  | 'SEARCHING'
  | 'MATCH_FOUND'
  | 'BOOKING_REQUESTED'
  | 'CONFIRMED'
  | 'IDENTITY_VERIFICATION'
  | 'PICKUP_VERIFICATION'
  | 'READY_TO_START'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'IDENTITY_MISMATCH'
  | 'VERIFICATION_FAILED'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'PICKUP_TOO_FAR'
  | 'LOCATION_PERMISSION_DENIED'
  | 'CAMERA_PERMISSION_DENIED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'POSTED'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'VERIFYING';

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
  pickupScore?: number;
  destinationScore?: number;
  timeScore: number;
  budgetScore: number;
  capacityScore: number;
  finalScore: number;
  adjustedScore?: number;
  proBoost?: number;
  matchType?: 'EXACT_DESTINATION' | 'NEARBY_DESTINATION' | 'ROUTE_CORRIDOR' | 'ACCEPTABLE_DETOUR';
  qualityTier?: 'EXCELLENT' | 'STRONG' | 'COMPATIBLE' | 'WEAK' | 'NOT_SUITABLE';
  qualityLabel?: string;
  qualityColor?: string;
  isFallbackMatch?: boolean;
  detourKm?: number;
  pickupDistanceKm?: number;
  destinationDistanceKm?: number;
  estimatedContribution?: number;
  platformFee?: number;
  passengerTotal?: number;
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
  fuelRate?: number;
  fuelCost: number;
  tolls: number;
  totalOccupants?: number;
  actualOccupants?: number;
  totalTravelExpense?: number;
  poolFare: number;
  sharedCostPerPerson?: number;
  commission: number;
  platformFee?: number;
  finalAmount: number;
  passengerTotal?: number;
  travellerEffectiveExpense?: number;
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
