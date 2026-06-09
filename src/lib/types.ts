import type { FieldValue } from "firebase/firestore";

export type UserRole = 'admin' | 'gerente' | 'ejecutivo' | 'ingeniero';
export type ManagementArea = 'Satellite Communications' | 'GeoInformacion';

export type CostCenter = {
  id: string; // format xx-yy
  name: string;
};

export type ModulePermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type RolePermissions = {
  modules: Record<string, ModulePermission>;
  menu: {
    showCatalog: boolean;
    showReports: boolean;
    showSettings: boolean;
    showOpportunities: boolean;
    showActivities: boolean;
    showLocations: boolean;
    showContracts: boolean;
    showPos: boolean;
    showServices: boolean;
    showEquipment: boolean;
    showServiceOrders: boolean;
  };
};

export type PermissionsMatrix = Record<UserRole, RolePermissions>;

export type TaxIdType = 'CUIT' | 'RUT_CL' | 'RUC_PE' | 'CNPJ' | 'RUT_CO' | 'NIT_CR' | 'EIN_US' | 'OTHER';

export type Client = {
  id: string;
  publicId: string;
  name: string;
  legalName?: string;
  email: string;
  phone: string;
  website?: string;
  cuit: string; // We keep this as the main tax ID value
  taxIdType: TaxIdType;
  clientePresea?: string; // Internal billing ID (3 digits)
  holding?: string;
  linkedinPage?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  status: 'active' | 'suspended' | 'canceled';
  type: 'client' | 'prospect';
  sector: string;
  subsector?: string;
  notes?: string;
  aiDescription?: string;
  logoURL?: string | null;
  management: ManagementArea;
  assignedTo: string; // UID of Ejecutivo
  countryHQ?: string;
  costCenterId?: string;
  // Portal Proveedores
  supplierPortalUrl?: string;
  supplierPortalUser?: string;
  supplierPortalPassword?: string;
};

export type Holding = {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
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
  updatedAt?: Date;
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
export type OpportunityType = 'New Logo' | 'New Business' | 'Ampliacion' | 'Renegociacion' | 'Renovaciones';

export type Opportunity = {
  id: string;
  publicId: string;
  title: string;
  clientId: string;
  salesforceId?: string;
  value: number;
  currency: string;
  stage: 'Prospecting' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Canceled' | 'Suspended';
  probability: number;
  closeDate: Date;
  createdAt: Date;
  updatedAt?: Date;
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
  // Process Checks
  valcomAuthorized: boolean;
  clientVerified: boolean;
  contractSigned: boolean;
  complianceChecked: boolean;
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
  currency?: string;
  isEditable: boolean;
  availableDiscounts?: number[];
  bundleItems?: Array<{ itemId: string; quantity: number }>;
  createdAt: Date;
  updatedAt?: Date;
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
export type ContractRenewalTerm = '1 month' | '2 months' | '3 months' | '12 months';

export type PriceListItem = {
  planName: string;
  price: number;
};

export type Contract = {
  id: string;
  publicId: string;
  clientId: string;
  opportunityId?: string;
  amount: number;
  currency: string;
  type: ContractType;
  status: ContractStatus;
  startDate: Date;
  durationMonths: number;
  endDate: Date;
  signatureDate?: Date;
  autoRenews: boolean;
  renewalTerm?: ContractRenewalTerm;
  noticePeriod?: 0 | 30 | 60 | 90;
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
  updatedAt?: Date;
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
  updatedAt?: Date;
};

export type PurchaseOrderStatus = 'pending' | 'approved' | 'canceled' | 'received';

export type PurchaseOrder = {
  id: string; // Firestore Doc ID
  poNumber: string; // Manual Reference Number
  emissionDate: Date;
  buyerId: string;
  amount: number;
  currency: string;
  status: PurchaseOrderStatus;
  contractId: string;
  idContractStarfleet?: string;
  idClientStarfleet?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
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
  currency?: string;
  monthlyFee?: number;
  isTelespazioOwned: boolean;
  status: ServiceStatus;
  statusUpdateDate?: Date;
  activationDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
  updatedAt?: Date;
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

export type ActivityFollowUp = {
  id: string;
  activityId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
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
  updatedAt?: Date;
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
  updatedAt?: Date;
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
  permissionsMatrix?: PermissionsMatrix;
  lastRatesUpdate?: Date;
  updatedAt?: Date;
  updatedBy?: string;
};

// --- SERVICE ORDERS (SO) ---

export type ServiceOrderStatus = 'Abierta' | 'Asignada' | 'Devuelta' | 'Cancelada' | 'Cerrada';
export type ServiceOrderType = 'Alta' | 'Modificación' | 'Baja';

export type ServiceOrder = {
  id: string;
  publicId: string;
  contractId: string;
  clientId: string;
  clientName: string;
  cuit: string;
  eeccId: string; // Account Executive UID
  pmAssignedId?: string; // Engineer/PM UID
  status: ServiceOrderStatus;
  type: ServiceOrderType;
  starfleetAccount?: string;
  itemsCount: number;
  management: ManagementArea;
  specialEntryConditions: boolean;
  attachments?: OpportunityAttachment[];
  dates: {
    createdAt: Date;
    contractStart?: Date;
    contractDuration?: number;
    leadTimeTarget?: number;
    sentAt?: Date;
    serviceActivationComplete?: Date;
  };
  createdBy: string;
  updatedAt?: Date;
};

export type ServiceOrderItem = {
  id: string;
  serviceOrderId: string;
  locationId: string;
  serviceIdCatalog: string; // reference to ProductOrService
  equipmentIdCatalog?: string; // reference to ProductOrService (product type)
  modality: 'Venta' | 'Comodato';
  contactId: string;
  serviceIdFinal?: string; // Completed by PM
  activationDate?: Date; // Completed by PM
  isClosed: boolean;
};

export type ServiceOrderComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  statusChange?: ServiceOrderStatus;
};

export type QuoteRequest = {
  id: string;
  companyName: string;
  legalName: string;
  taxIdType: TaxIdType;
  taxId: string;
  country: 'Argentina' | 'Brazil' | 'Chile' | 'Colombia' | 'CostaRica' | 'Peru';
  address: {
    streetName: string;
    streetNumber: string;
    city: string;
    province: string;
    country: string;
    postalCode: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  description: string;
  quantity: number;
  usage: 'movil' | 'fijo';
  usageLocation: string;
  dataCapacityGb: number;
  approxImplementationDate?: Date;
  discoverySource: 'web' | 'linkedin' | 'referencia' | 'otro';
  status: 'pending' | 'reviewed' | 'converted';
  assignedTo?: string; // Executive UID
  isRead?: boolean;
  convertedClientId?: string;
  convertedOpportunityId?: string;
  createdAt: Date;
};

export type NewsItem = {
  id: string;
  category: string;
  title: string;
  summary: string;
  imageUrl: string;
  url: string;
  timestamp: Date;
};