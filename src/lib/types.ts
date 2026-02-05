import type { FieldValue } from "firebase/firestore";

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'suspended' | 'canceled';
  industry: string;
  notes?: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientId: string;
  createdAt: Date;
  createdBy: string;
};

export type Opportunity = {
  id: string;
  title: string;
  clientId: string;
  value: number;
  stage: 'Prospecting' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  probability: number;
  closeDate: Date;
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
};

// Types for writing data to Firestore
export type ClientWrite = Omit<Client, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type ContactWrite = Omit<Contact, 'id' | 'createdAt'> & { createdAt: FieldValue };
export type OpportunityWrite = Omit<Opportunity, 'id' | 'createdAt'> & { createdAt: FieldValue };
