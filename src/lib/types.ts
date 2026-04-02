
import type { FieldValue } from "firebase/firestore";

export type UserRole = 'admin' | 'gerente' | 'ejecutivo' | 'ingeniero';
export type ManagementArea = 'Satellite Communications' | 'GeoInformacion';

export type CostCenter = {
  id: string; // format xx-yy
  name: string;
};

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
  type: 'client' | 'prospect';
  sector: string;
  subsector?: string;
  notes?: string;
  logoURL?: string | null;
  management: ManagementArea;
  assignedTo: string; // UID of Ejecutivo
  countryHQ?: string;
  costCenterId?: string;
};

export type Holding = {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
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
  management: ManagementArea;
  assignedTo: string;
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

export type OpportunityRisk = 'C-Low' | 'B-Medium' | 'A-High';
export type OpportunityType = 'New Logo' | 'New Business' | 'Ampliacion' | 'Renegociacion';

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
  management: ManagementArea;
  assignedTo: string;
  // New Fields
  risk: OpportunityRisk;
  isPlanned: boolean;
  opportunityType: OpportunityType;
  projectManagerEmail?: string;
  contractReferenceId?: string;
  grossMarginPercentage: number;
  grossMarginAmount: number;
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
  role: UserRole;
  position: 'Director' | 'Manager' | 'Executive' | 'Project Manager';
  country?: string;
  management: ManagementArea;
  tablePreferences?: Record<string, Record<string, boolean>>;
  mfaEnforced?: boolean;
};

export type ContractType = 'Acuerdo Marco' | 'Locación de Servicios' | 'Compraventa' | 'Locación de Equipos' | 'Comodato de Equipos';
export type ContractStatus = 'activo' | 'vencido' | 'renovado' | 'renovado automatico';
export type ContractRenewalTerm = '1 month' | '2 months';

export type PriceListItem = {
  planName: string;
  price: number;
};

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
  priceList?: PriceListItem[];
  topUp50GbPrice?: number;
  topUp500GbPrice?: number;
  createdBy: string;
  createdAt: Date;
  management: ManagementArea;
  assignedTo: string;
  costCenterId: string;
};

export type AddendumType = 'Extension' | 'Price Change' | 'Clause Modification' | 'Service Change' | 'Other';

export type Addendum = {
  id: string;
  contractId: string;
  date: Date;
  type: AddendumType;
  description: string;
  createdBy: string;
  createdAt: Date;
};

export type PurchaseOrderStatus = 'pending' | 'approved' | 'canceled' | 'received';

export type PurchaseOrder = {
  id: string; // Firestore Doc ID
  poNumber: string; // Manual Reference Number
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
  management: ManagementArea;
  assignedTo: string;
};

export type ServiceStatus = 'active' | 'paused' | 'canceled';

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
  isTelespazioOwned: boolean;
  status: ServiceStatus;
  statusUpdateDate?: Date;
  createdBy: string;
  createdAt: Date;
  management: ManagementArea;
  assignedTo: string;
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
  isClientOwned: boolean;
  comodatoFee?: number;
};

export type ActivityType = 'call' | 'meeting' | 'email' | 'message';

export type Activity = {
  id: string;
  publicId: string;
  clientId: string;
  type: ActivityType;
  description: string;
  isPriority: boolean;
  dueDate?: Date | null;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  latestFollowUpContent?: string;
  latestFollowUpBy?: string;
  management: ManagementArea;
  assignedTo: string;
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
  management: ManagementArea;
  assignedTo: string;
};

export type ReportFilter = {
  field: string;
  operator: string;
  value: any;
};

export type ReportSort = {
  field: string;
  direction: 'asc' | 'desc';
};

export type ReportAggregation = {
  field: string;
  type: 'sum' | 'avg' | 'count';
};

export type ReportConfig = {
  primaryDataSource: string;
  fields: string[];
  filters: ReportFilter[];
  sorting: ReportSort[];
  aggregations?: ReportAggregation[];
};

export type Report = {
  id: string;
  name: string;
  description?: string;
  config: ReportConfig;
  createdAt: Date;
  createdBy: string;
};

export type ExchangeRate = {
  from: string;
  to: string;
  rate: number;
};

export type ExchangeRateSnapshot = {
  id: string;
  date: Date;
  rates: ExchangeRate[];
  createdBy: string;
};

export type SubsectorConfig = {
  name: string;
  sector: string;
};

export type SystemConfig = {
  managementAreas: string[];
  sectors: string[];
  subsectors: SubsectorConfig[];
  currencies: string[];
  unitsOfMeasure: string[];
  exchangeRates: ExchangeRate[];
  costCenters: CostCenter[];
  lastRatesUpdate?: Date;
  updatedAt?: Date;
  updatedBy?: string;
};
