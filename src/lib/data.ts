import type { Client, Contact, Opportunity } from './types';

export const clients: Client[] = [
  { id: 'cli-1', name: 'Innovate Corp', email: 'contact@innovate.com', phone: '123-456-7890' },
  { id: 'cli-2', name: 'Solutions LLC', email: 'info@solutions.llc', phone: '234-567-8901' },
  { id: 'cli-3', name: 'Synergy Group', email: 'hello@synergy.com', phone: '345-678-9012' },
  { id: 'cli-4', name: 'Quantum Inc', email: 'support@quantum.inc', phone: '456-789-0123' },
];

export const contacts: Contact[] = [
  { id: 'con-1', name: 'Alice Johnson', email: 'alice@innovate.com', phone: '123-456-7891', clientId: 'cli-1' },
  { id: 'con-2', name: 'Bob Williams', email: 'bob@solutions.llc', phone: '234-567-8902', clientId: 'cli-2' },
  { id: 'con-3', name: 'Charlie Brown', email: 'charlie@synergy.com', phone: '345-678-9013', clientId: 'cli-3' },
  { id: 'con-4', name: 'Diana Prince', email: 'diana@quantum.inc', phone: '456-789-0124', clientId: 'cli-4' },
  { id: 'con-5', name: 'Eve Adams', email: 'eve@innovate.com', phone: '123-456-7895', clientId: 'cli-1' },
];

export const opportunities: Opportunity[] = [
  { id: 'opp-1', title: 'Website Redesign', clientId: 'cli-1', value: 50000, stage: 'Proposal', probability: 50, closeDate: new Date('2024-08-30') },
  { id: 'opp-2', title: 'Cloud Migration', clientId: 'cli-2', value: 75000, stage: 'Negotiation', probability: 75, closeDate: new Date('2024-07-25') },
  { id: 'opp-3', title: 'Marketing Campaign', clientId: 'cli-3', value: 25000, stage: 'Won', probability: 100, closeDate: new Date('2024-06-15') },
  { id: 'opp-4', title: 'Security Audit', clientId: 'cli-4', value: 30000, stage: 'Prospecting', probability: 20, closeDate: new Date('2024-09-10') },
  { id: 'opp-5', title: 'Mobile App Development', clientId: 'cli-1', value: 120000, stage: 'Lost', probability: 0, closeDate: new Date('2024-05-20') },
];
