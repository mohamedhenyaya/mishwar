// Miroir des entités/DTOs de ServerApp — les décimaux Postgres arrivent en chaînes

export type Decimal = number | string;

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Party {
  id: string;
  type: 'user' | 'driver';
  name: string | null;
  phone: string;
  photoUrl: string | null;
  role?: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  totalRides: number;
  role: UserRole;
  isActive: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  blockedUntil: string | null; // null = blocage définitif
  deletedAt: string | null;
  balance: Decimal;
  rating: Decimal;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DriverStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';
export type VehicleType = 'sedan' | 'suv' | 'van' | 'moto';

export interface Driver {
  id: string;
  phone: string;
  name: string | null;
  firstName: string | null; // identité du dossier
  lastName: string | null;
  nni: string | null;
  photoUrl: string | null;
  status: DriverStatus;
  vehicleType: VehicleType;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  rating: Decimal;
  ratingCount: number;
  totalRides: number;
  latitude: Decimal | null;
  longitude: Decimal | null;
  lastLocationUpdate: string | null;
  isActive: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  blockedUntil: string | null; // null = blocage définitif
  deletedAt: string | null;
  balance: Decimal;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle | null; // liste admin : un capitaine = un véhicule
  dossier?: { pendingDocuments: number; missing: number; insuranceValidUntil: string | null }; // liste admin
}

export interface UserStats {
  user: User;
  totalRides: number;
  ridesByStatus: Record<string, number>;
  totalSpent: number;
  balance: number;
}

export interface DriverStats {
  driver: Driver;
  totalRides: number;
  ridesByStatus: Record<string, number>;
  totalEarned: number;
  totalCommissionPaid: number;
  balance: number;
}

export type RideStatus = 'SCHEDULED' | 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Ride {
  id: string;
  userId: string;
  driverId: string | null;
  startLatitude: Decimal;
  startLongitude: Decimal;
  destinationName: string | null;
  endLatitude: Decimal | null;
  endLongitude: Decimal | null;
  vehicleType: 'economy' | 'comfort' | 'premium';
  status: RideStatus;
  price: Decimal | null;
  estimatedPrice: Decimal | null;
  livePrice: Decimal | null;
  isOpenTrip: boolean;
  traveledDistanceKm: Decimal;
  stoppedSeconds: number;
  startedAt: string | null;
  scheduledAt: string | null;
  couponCode: string | null;
  discountAmount: Decimal | null;
  ratingForDriver: Decimal | null;
  ratingForRider: Decimal | null;
  cancelledBy: 'user' | 'driver' | 'system' | 'admin' | null;
  cancelReason: string | null;
  notifiedDriverIds: string[];
  rejectedDriverIds: string[];
  createdAt: string;
  updatedAt: string;
  user?: Party | null;
  driver?: Party | null;
}

export type OwnerType = 'user' | 'driver';
export type WalletTxType = 'admin_credit' | 'admin_debit' | 'commission_deduction';

export interface WalletTransaction {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  type: WalletTxType;
  amount: Decimal;
  balanceAfter: Decimal;
  relatedRideId: string | null;
  createdByAdminId: string | null;
  note: string | null;
  createdAt: string;
  owner?: Party | null;
  admin?: Party | null;
}

export type WalletRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type WalletRequestType = 'TOPUP' | 'WITHDRAWAL';

export interface WalletRequest {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  type: WalletRequestType;
  amount: Decimal;
  method: string;
  reference: string | null;
  status: WalletRequestStatus;
  reviewedByAdminId: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  owner?: Party | null;
}

export interface Overview {
  totalUsers: number;
  totalDrivers: number;
  onlineDrivers: number;
  busyDrivers: number;
  blockedDrivers: number;
  blockedUsers: number;
  ridesByStatus: Record<string, number>;
  ridesToday: number;
  revenueTotal: number;
  commissionTotal: number;
  pending: { walletRequests: number; vehicles: number; tickets: number };
}

export interface TimeseriesPoint {
  day: string;
  rides: number;
  completed: number;
  cancelled: number;
  revenue: number;
  commission: number;
  signups: number;
}

export type VehicleApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DocumentType =
  | 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'TRANSPORT_PERMIT'
  | 'REGISTRATION_FRONT' | 'REGISTRATION_BACK' | 'INSURANCE'
  | 'REGISTRATION' | 'INSPECTION'; // anciens types

// Pièces exigées pour approuver le compte d'un capitaine (en plus de sa photo de profil)
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  'ID_CARD_FRONT', 'ID_CARD_BACK', 'TRANSPORT_PERMIT', 'REGISTRATION_FRONT', 'REGISTRATION_BACK', 'INSURANCE',
];

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  type: DocumentType;
  fileUrl: string;
  expiresAt: string | null;
  status: VehicleApprovalStatus;
  reviewNote: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  type: VehicleType;
  make: string | null;
  model: string;
  year: number | null;
  fuelType: 'essence' | 'diesel' | 'hybrid' | 'electric' | null;
  plateNumber: string;
  color: string | null;
  capacity: number | null;
  status: VehicleApprovalStatus;
  rejectedReason: string | null;
  createdAt: string;
  driver?: Party | null;
  documents?: VehicleDocument[];          // du plus récent au plus ancien
  missing?: (DocumentType | 'PROFILE_PHOTO' | 'IDENTITY')[];
  identity?: { firstName: string | null; lastName: string | null; nni: string | null };
  insuranceValidUntil?: string | null;    // assurance validée la plus lointaine
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketCategory = 'RIDE_ISSUE' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';

export interface Ticket {
  id: string;
  requesterType: OwnerType;
  requesterId: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  relatedRideId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  requester?: Party | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'user' | 'driver' | 'admin';
  senderId: string;
  message: string;
  createdAt: string;
}

export interface Review {
  id: string;
  rideId: string;
  raterType: OwnerType;
  raterId: string;
  targetType: OwnerType;
  targetId: string;
  stars: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: string;
  rater?: Party | null;
  target?: Party | null;
}

export type CouponType = 'PERCENT' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: Decimal;
  maxDiscount: Decimal | null;
  minRideAmount: Decimal | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  recipientType: OwnerType;
  recipientId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdByAdminId: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin?: Party | null;
  target?: Party | null;
}

export interface PlatformSettings {
  id: string;
  pricePerKm: Decimal;
  minimumFare: Decimal;
  commissionPercent: Decimal;
  perStopMinuteRate: Decimal;
  updatedAt: string;
}
