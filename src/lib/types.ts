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

export type OpportunityAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
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

export type Opportunity = {
  id: string;
  publicId: string;
  title: string;
  clientId: string;
  value: number;
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
  generalDiscountPercentage?: number;
  applyDiscountToNrc?: boolean;
  applyDiscountToMrc?: boolean;
  attachments?: OpportunityAttachment[];
};

export type BundleItem = {
  itemId: string;
  quantity: number;
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
  bundleItems?: BundleItem[];
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

export type ReportFilter = {
  id: string;
  field: string;
  operator: string;
  value: any;
};

export type ReportSort = {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
};

export type Report = {
  id: string;
  name: string;
  description?: string;
  primaryDataSource: 'clients' | 'contacts' | 'opportunities' | 'productsAndServices';
  selectedFields: string[];
  filters: ReportFilter[];
  sorting: ReportSort[];
  createdAt: Date;
  createdBy: string;
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
};

export type ActivityFollowUp = {
  id: string;
  activityId: string;
  content: string;
  createdAt: Date;
  createdBy: string;
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


// Types for writing data to Firestore
export type ClientWrite = Omit<Client, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type ContactWrite = Omit<Contact, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type OpportunityWrite = Omit<Opportunity, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type ProductOrServiceWrite = Omit<ProductOrService, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type ReportWrite = Omit<Report, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type ActivityWrite = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: FieldValue; updatedAt: FieldValue };
export type ActivityFollowUpWrite = Omit<ActivityFollowUp, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type LocationWrite = Omit<Location, 'id' | 'createdAt'> & { createdAt: FieldValue };
