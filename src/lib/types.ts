export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientId: string;
};

export type Opportunity = {
  id: string;
  title: string;
  clientId: string;
  value: number;
  stage: 'Prospecting' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  probability: number;
  closeDate: Date;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
};
