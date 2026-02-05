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
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';

type DataSource = 'clients' | 'contacts' | 'opportunities';

const reportableFields: Record<
  DataSource,
  { header: string; fields: Record<string, string> }
> = {
  clients: {
    header: 'Reports.dataSources.clients',
    fields: {
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
  },
  contacts: {
    header: 'Reports.dataSources.contacts',
    fields: {
      publicId: 'Table.contactId',
      name: 'Forms.contactName',
      emails: 'Forms.emails',
      phones: 'Forms.phones',
      createdAt: 'Table.createdDate',
    },
  },
  opportunities: {
    header: 'Reports.dataSources.opportunities',
    fields: {
      publicId: 'Table.opportunityId',
      title: 'Dashboard.recentOpportunities.opportunityHeader',
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
  },
};

const formatCellForExport = (value: any): string => {
    if (value instanceof Date) {
        return format(value, 'P');
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return '';
        if(typeof value[0] === 'object' && value[0] !== null) {
             return value.map(item => item.address || item.number || JSON.stringify(item)).join('; ');
        }
        return value.join('; ');
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    if(typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    return String(value ?? '');
}

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

  // Fetch all data upfront to allow for joins
  const { data: clientsData, loading: clientsLoading } = useCollection<Client>(
    baseQuery ? query(collection(firestore, 'clients'), baseQuery) : null
  );
  const { data: contactsData, loading: contactsLoading } = useCollection<Contact>(
    baseQuery ? query(collection(firestore, 'contacts'), baseQuery) : null
  );
  const { data: opportunitiesData, loading: opportunitiesLoading } = useCollection<Opportunity>(
    baseQuery ? query(collection(firestore, 'opportunities'), baseQuery) : null
  );

  const handleDataSourceChange = (value: DataSource | '') => {
    setDataSource(value);
    setSelectedFields({});
    setReportData(null);
    setReportColumns(null);
  };

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };
  
  const generateReport = () => {
    if (!dataSource) return;
  
    const clientMap = new Map(clientsData?.map(c => [c.id, c]));
    const contactMap = new Map(contactsData?.map(c => [c.id, c]));
  
    let baseData: any[] = [];
    if (dataSource === 'clients') baseData = clientsData || [];
    if (dataSource === 'contacts') baseData = contactsData || [];
    if (dataSource === 'opportunities') baseData = opportunitiesData || [];
  
    const activeFields = Object.entries(selectedFields)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key);
  
    const newColumns = activeFields.map(fieldKey => {
      const [source, field] = fieldKey.split('.');
      const sourceName = source as keyof typeof reportableFields;
      const fieldName = field as keyof typeof reportableFields[typeof sourceName]['fields'];
      const header = t(reportableFields[sourceName].fields[fieldName]);
      return {
        accessorKey: fieldKey,
        header,
      };
    });

    const newData = baseData.map(primaryRecord => {
        const row: Record<string, any> = {};

        let client: Client | undefined;
        let contact: Contact | undefined;
        let opportunity: Opportunity | undefined;

        if (dataSource === 'clients') client = primaryRecord;
        if (dataSource === 'contacts') contact = primaryRecord;
        if (dataSource === 'opportunities') opportunity = primaryRecord;

        if (dataSource === 'contacts') {
            client = clientMap.get(primaryRecord.clientId);
        }
        if (dataSource === 'opportunities') {
            client = clientMap.get(primaryRecord.clientId);
            if (primaryRecord.contactId) {
              contact = contactMap.get(primaryRecord.contactId);
            }
        }

        for (const fieldKey of activeFields) {
            const [source, field] = fieldKey.split('.');
            let value;
            if (source === 'clients' && client) {
                value = client[field as keyof Client];
            } else if (source === 'contacts' && contact) {
                value = contact[field as keyof Contact];
            } else if (source === 'opportunities' && opportunity) {
                value = opportunity[field as keyof Opportunity];
            }
            row[fieldKey] = value;
        }
        return row;
    });
  
    setReportColumns(newColumns);
    setReportData(newData);
  };
  
  const handleDownload = () => {
    if (!reportData || !reportColumns) return;

    const headers = reportColumns.map(col => col.header);
    
    const dataForCsv = reportData.map(row => {
        return reportColumns.map(col => {
            const value = row[col.accessorKey];
            return formatCellForExport(value);
        });
    });

    const csv = Papa.unparse([headers, ...dataForCsv]);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const pageIsLoading = clientsLoading || contactsLoading || opportunitiesLoading;

  const renderFieldGroup = (source: DataSource) => (
    <div key={source}>
        <h4 className='text-md font-semibold mb-2 mt-4'>{t(reportableFields[source].header)}</h4>
        <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4 lg:grid-cols-5">
        {Object.keys(reportableFields[source].fields).map((field) => {
            const fieldKey = `${source}.${field}`;
            return (
            <div key={fieldKey} className="flex items-center space-x-2">
                <Checkbox
                id={`field-${fieldKey}`}
                checked={!!selectedFields[fieldKey]}
                onCheckedChange={() => handleFieldToggle(fieldKey)}
                />
                <Label htmlFor={`field-${fieldKey}`} className="font-normal">
                {t(reportableFields[source].fields[field])}
                </Label>
            </div>
            );
        })}
        </div>
    </div>
  );


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
                <div>
                    {renderFieldGroup('clients')}
                    {(dataSource === 'contacts' || dataSource === 'opportunities') && renderFieldGroup('contacts')}
                    {dataSource === 'opportunities' && renderFieldGroup('opportunities')}
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
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Reports.results')}</CardTitle>
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t('Reports.downloadCsv')}
                  </Button>
              </CardHeader>
              <CardContent>
                  <ReportTable columns={reportColumns} data={reportData} />
              </CardContent>
          </Card>
      )}
    </div>
  );
}
