
import type { FieldValue } from "firebase/firestore";

export type Client = {
  id: string;
  publicId: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  cuit: string;
  holding?: string;
  linkedinPage?: string;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'suspended' | 'canceled';
  industry: string;
  notes?: string;
  logoURL?: string | null;
};

export type EmailEntry = {
  type: 'work' | 'personal' | 'other';
  address: string;
};

export type PhoneEntry = {
  type: 'mobile' | 'landline' | 'work' | 'home';
  number: string;
};

export type ContactPosition = 'Analyst' | 'CEO' | 'CFO' | 'CIO' | 'CISO' | 'Head' | 'Manager';
export type ContactArea = 'Administration' | 'IT' | 'Legal' | 'Marketing' | 'Procurement' | 'Sales' | 'Supplier Payments';

export type Contact = {
  id: string;
  publicId: string;
  name: string;
  position?: ContactPosition;
  area?: ContactArea;
  emails: EmailEntry[];
  phones: PhoneEntry[];
  notes?: string;
  clientId: string;
  createdAt: Date;
  createdBy: string;
};

export type OpportunityLineItem = {
  itemId: string;
  name: string;
  description?: string;
  quantity: number;
  oneTimeCharge: number;
  recurringCharge: number;
  discount: number;
};

export type OpportunityAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
};

export type Opportunity = {
  id: string;
  publicId: string;
  title: string;
  clientId: string;
  value: number;
  currency: 'USD' | 'EUR' | 'ARS';
  stage: 'Prospecting' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Canceled' | 'Suspended';
  probability: number;
  closeDate: Date;
  createdAt: Date;
  createdBy: string;
  contractMonths: 12 | 24 | 36;
  requestDate: Date;
  offerSentDate?: Date;
  description?: string;
  reason?: string;
  competition?: string[];
  isTender: boolean;
  contactId?: string;
  lineItems?: OpportunityLineItem[];
  attachments?: OpportunityAttachment[];
  generalDiscountPercentage?: number;
  applyDiscountToNrc?: boolean;
  applyDiscountToMrc?: boolean;
};

export type ProductOrService = {
  id: string;
  publicId: string;
  type: 'product' | 'service' | 'bundle';
  name: string;
  description?: string;
  photoURL?: string;
  status: 'active' | 'inactive';
  unitOfMeasure?: 'units' | 'meters' | 'kg' | 'liters' | 'GB';
  oneTimeCharge?: number;
  recurringCharge?: number;
  currency?: 'USD' | 'EUR' | 'ARS';
  isEditable: boolean;
  availableDiscounts?: number[];
  bundleItems?: Array<{ itemId: string; quantity: number }>;
  createdAt: Date;
  createdBy: string;
};

export type UserProfile = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL?: string;
  phone: string;
  mobile?: string;
  notes?: string;
  status: 'active' | 'suspended';
  position: 'Director' | 'Manager' | 'Executive' | 'Project Manager';
  tablePreferences?: Record<string, Record<string, boolean>>;
};

export type ContractType = 'Acuerdo Marco' | 'Locación de Servicios' | 'Compraventa' | 'Locación de Equipos' | 'Comodato de Equipos';
export type ContractStatus = 'activo' | 'vencido' | 'renovado' | 'renovado automatico';
export type ContractRenewalTerm = '1 month' | '2 months';

export type Contract = {
  id: string;
  publicId: string;
  clientId: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'ARS';
  type: ContractType;
  status: ContractStatus;
  startDate: Date;
  durationMonths: number;
  endDate: Date;
  signatureDate?: Date;
  autoRenews: boolean;
  renewalTerm?: ContractRenewalTerm;
  country: string;
  clientContactId?: string;
  authorizedBy?: string;
  hasSpecialClauses: boolean;
  specialClauses?: string;
  notes?: string;
  attachments?: OpportunityAttachment[];
  createdBy: string;
  createdAt: Date;
};

export type PurchaseOrderStatus = 'pending' | 'approved' | 'canceled' | 'received';

export type PurchaseOrder = {
  id: string; // Manual PO Number
  emissionDate: Date;
  buyerId: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'ARS';
  status: PurchaseOrderStatus;
  contractId: string;
  idContractStarfleet?: string;
  idClientStarfleet?: string;
  createdBy: string;
  createdAt: Date;
};

export type Service = {
  id: string;
  serviceNickname: string;
  serviceLineNumber: string;
  partnerName: string;
  customerName: string;
  customerAccountNumber: string;
  servicePlan: string;
  serviceAllocationGb: number;
  topUp: string;
  poId: string;
  equipmentId: string;
  currency?: 'USD' | 'EUR' | 'ARS';
  monthlyFee?: number;
  createdBy: string;
  createdAt: Date;
};

export type PhysicalStatus = 'Activa' | 'En reparación' | 'Retirada';

export type Equipment = {
  id: string; // user_terminal_id
  userTerminal: string; // Serial/Nickname
  type: string;
  physicalStatus: PhysicalStatus;
  installationDate?: Date;
  latitude?: number;
  longitude?: number;
  currentServiceId?: string;
  createdBy: string;
  createdAt: Date;
};

export type ActivityType = 'call' | 'meeting' | 'email' | 'message';

export type Activity = {
  id: string;
  publicId: string;
  clientId: string;
  type: ActivityType;
  description: string;
  isPriority: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  latestFollowUpContent?: string;
  latestFollowUpBy?: string;
};

export type LocationType = 'branch' | 'headquarters' | 'warehouse' | 'office' | 'property' | 'field';
export type LocationStatus = 'active' | 'suspended';

export type Location = {
  id: string;
  publicId: string;
  name: string;
  clientId: string;
  type: LocationType;
  status: LocationStatus;
  streetName: string;
  streetNumber: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  notes?: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  createdBy: string;
};

export type Report = {
  id: string;
  name: string;
  description?: string;
  primaryDataSource: 'clients' | 'contacts' | 'opportunities' | 'productsAndServices';
  selectedFields: string[];
  filters: any[];
  sorting: any[];
  createdAt: Date;
  createdBy: string;
};
