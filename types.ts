
export interface SenderReceiverDetails {
  name: string;
  mobile: string;
  address: string;
}

export interface ShipmentDetails {
  fromLocation: string;
  toLocation: string;
  description: string;
  weight: string;
  packages: string;
}

export interface Transporter {
  id: string;
  name: string;
  commissionPercent: number;
  status: 'Active' | 'Inactive';
}

export interface LR {
  id: string;
  lrNumber: string;
  branch: string; // Changed from fixed union to string to support dynamic branches
  date: string;
  sender: SenderReceiverDetails;
  receiver: SenderReceiverDetails;
  shipment: ShipmentDetails;
  charges: string;
  paymentStatus: 'Paid' | 'To Pay';
  createdBy: string;
  transporterId: string | null;
  transporterName: string | null;
  transporterCommissionPercent: number | null;
  transporterCommissionAmount: number | null;
  netPayableToTransporter: number | null;
  assignedAt: string | null;
}

export interface LRErrorState {
  [key: string]: string | undefined;
}

export type UserRole = 'developer' | 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  branch: string; // Changed from fixed union to string
  status: 'Active' | 'Inactive';
  avatar?: string;
  lastLogin?: string;
  phone?: string;
  user_metadata?: {
    must_reset_password?: boolean;
  };
}

export interface BusinessSettings {
  businessName: string;
  logoUrl?: string;
  tagline: string;
  gstin: string;
  primaryName: string;
  primaryEmail: string;
  primaryPhone: string;
  secondaryName?: string;
  secondaryPhone?: string;
  headOfficeAddress: string;
}

export interface BranchDetail {
  id: string;
  name: string;
  code: string; // e.g. 'KPM', 'MND'
  address: string;
  contactPerson: string;
  phone: string;
  status: 'Active' | 'Inactive';
}
