'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/firebase/client-provider';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Client, Contact, Opportunity } from '@/lib/types';
import { ReportTable } from './report-table';
import { Skeleton } from '../ui/skeleton';

type DataSource = 'clients' | 'contacts' | 'opportunities';

const fieldLabels: Record<DataSource, Record<string, string>> = {
  clients: {
    publicId: 'Table.clientId',
    name: 'Forms.clientName',
    cuit: 'Forms.cuit',
    email: 'Forms.clientEmail',
    phone: 'Forms.clientPhone',
    website: 'Forms.website',
    status: 'Table.status',
    industry: 'Table.industry',
    createdAt: 'Table.createdDate',
  },
  contacts: {
    publicId: 'Table.contactId',
    name: 'Forms.contactName',
    clientId: 'Pages.clients', // Special handling to show client name
    emails: 'Forms.emails',
    phones: 'Forms.phones',
    createdAt: 'Table.createdDate',
  },
  opportunities: {
    publicId: 'Table.opportunityId',
    title: 'Dashboard.recentOpportunities.opportunityHeader',
    clientId: 'Dashboard.recentOpportunities.clientHeader', // Special handling
    value: 'Dashboard.recentOpportunities.valueHeader',
    stage: 'Dashboard.recentOpportunities.stageHeader',
    probability: 'Forms.probability',
    closeDate: 'Forms.estCloseDate',
    contractMonths: 'Forms.contractMonths',
    requestDate: 'Forms.requestDate',
    offerSentDate: 'Forms.offerSentDate',
    isTender: 'Forms.isTender',
    createdAt: 'Table.createdDate',
  },
};


export function ReportBuilder() {
  const { t } = useI18n();
  const { user } = useUser();
  const firestore = useFirestore();
  const [dataSource, setDataSource] = useState<DataSource | ''>('');
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [reportColumns, setReportColumns] = useState<any[] | null>(null);

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const clientsQuery = useMemo(() => {
    if (!baseQuery || (dataSource !== 'clients' && dataSource !== 'contacts' && dataSource !== 'opportunities')) return null;
    return query(collection(firestore, 'clients'), baseQuery);
  }, [firestore, baseQuery, dataSource]);

  const contactsQuery = useMemo(() => {
    if (!baseQuery || dataSource !== 'contacts') return null;
    return query(collection(firestore, 'contacts'), baseQuery);
  }, [firestore, baseQuery, dataSource]);

  const opportunitiesQuery = useMemo(() => {
    if (!baseQuery || dataSource !== 'opportunities') return null;
    return query(collection(firestore, 'opportunities'), baseQuery);
  }, [firestore, baseQuery, dataSource]);

  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(clientsQuery);
  const { data: contactsData, loading: contactsLoading } = useCollection<Contact>(contactsQuery);
  const { data: opportunitiesData, loading: opportunitiesLoading } = useCollection<Opportunity>(opportunitiesQuery);

  const availableFields = dataSource ? Object.keys(fieldLabels[dataSource]) : [];

  const handleDataSourceChange = (value: DataSource | '') => {
    setDataSource(value);
    setSelectedFields({});
    setReportData(null);
    setReportColumns(null);
  };

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };
  
  const generateReport = () => {
    if (!dataSource) return;
  
    let data: any[] = [];
    switch (dataSource) {
      case 'clients':
        data = clientsData || [];
        break;
      case 'contacts':
        data = contactsData || [];
        break;
      case 'opportunities':
        data = opportunitiesData || [];
        break;
    }
  
    const finalColumns = availableFields
      .filter((field) => selectedFields[field])
      .map((field) => ({
        accessorKey: field,
        header: t(fieldLabels[dataSource][field]),
      }));
  
    let finalData = data;
    // Handle special cases for displaying related data
    if (dataSource === 'contacts' && selectedFields.clientId) {
      const clientMap = new Map(clientsData?.map(c => [c.id, c.name]));
      finalData = finalData.map(contact => ({
          ...contact,
          clientId: clientMap.get(contact.clientId) || contact.clientId,
      }));
    }
     if (dataSource === 'opportunities' && selectedFields.clientId) {
      const clientMap = new Map(clientsData?.map(c => [c.id, c.name]));
      finalData = finalData.map(opp => ({
          ...opp,
          clientId: clientMap.get(opp.clientId) || opp.clientId,
      }));
    }
  
    setReportColumns(finalColumns);
    setReportData(finalData);
  };
  
  const pageIsLoading = clientsLoading || contactsLoading || opportunitiesLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Reports.title')}</CardTitle>
          <CardDescription>{t('Reports.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('Reports.dataSource')}</Label>
            <Select onValueChange={(value) => handleDataSourceChange(value as DataSource)} value={dataSource}>
              <SelectTrigger className="w-full md:w-1/3">
                <SelectValue placeholder={t('Reports.selectDataSource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">{t('Reports.dataSources.clients')}</SelectItem>
                <SelectItem value="contacts">{t('Reports.dataSources.contacts')}</SelectItem>
                <SelectItem value="opportunities">{t('Reports.dataSources.opportunities')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('Reports.fields')}</Label>
            {dataSource ? (
              <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4 lg:grid-cols-5">
                {availableFields.map((field) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field}`}
                      checked={!!selectedFields[field]}
                      onCheckedChange={() => handleFieldToggle(field)}
                    />
                    <Label htmlFor={`field-${field}`} className="font-normal">
                      {t(fieldLabels[dataSource][field])}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">{t('Reports.noFields')}</p>
                </div>
            )}
          </div>
           <Button onClick={generateReport} disabled={!dataSource || Object.values(selectedFields).every(v => !v) || pageIsLoading}>
            {pageIsLoading ? t('App.loading') : t('Reports.generateReport')}
           </Button>
        </CardContent>
      </Card>
      
      {pageIsLoading && reportData === null && (
          <Card>
            <CardHeader><Skeleton className='h-8 w-48' /></CardHeader>
            <CardContent><Skeleton className='h-64 w-full' /></CardContent>
          </Card>
      )}

      {reportData && reportColumns && (
          <Card>
              <CardHeader>
                  <CardTitle>{t('Reports.results')}</CardTitle>
              </CardHeader>
              <CardContent>
                  <ReportTable columns={reportColumns} data={reportData} />
              </CardContent>
          </Card>
      )}
    </div>
  );
}
