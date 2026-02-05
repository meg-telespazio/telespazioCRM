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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Client, Contact, Opportunity } from '@/lib/types';
import { ReportTable } from './report-table';
import { Skeleton } from '../ui/skeleton';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import Papa from 'papaparse';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { es, enUS } from 'date-fns/locale';

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
    if (typeof value[0] === 'object' && value[0] !== null) {
      return value
        .map((item) => item.address || item.number || JSON.stringify(item))
        .join('; ');
    }
    return value.join('; ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return String(value ?? '');
};

export function ReportBuilder() {
  const { t, locale } = useI18n();
  const datePickerLocale = locale === 'es' ? es : enUS;
  const { user } = useUser();
  const firestore = useFirestore();
  const [dataSource, setDataSource] = useState<DataSource | ''>('');
  const [selectedFields, setSelectedFields] = useState<
    Record<string, boolean>
  >({});
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [reportColumns, setReportColumns] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: {
      field: '',
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
    text: {
      field: '',
      value: '',
    },
  });

  const baseQuery = useMemo(() => {
    if (!user) return null;
    return where('createdBy', '==', user.uid);
  }, [user]);

  const clientsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'clients'), baseQuery);
  }, [firestore, baseQuery]);

  const contactsQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'contacts'), baseQuery);
  }, [firestore, baseQuery]);

  const opportunitiesQuery = useMemo(() => {
    if (!baseQuery) return null;
    return query(collection(firestore, 'opportunities'), baseQuery);
  }, [firestore, baseQuery]);

  const { data: clientsData, loading: clientsLoading } =
    useCollection<Client>(clientsQuery);
  const { data: contactsData, loading: contactsLoading } =
    useCollection<Contact>(contactsQuery);
  const { data: opportunitiesData, loading: opportunitiesLoading } =
    useCollection<Opportunity>(opportunitiesQuery);

  const dateFilterableFields = useMemo(
    () => [
      {
        value: 'opportunities.createdAt',
        label: `${t('Reports.dataSources.opportunities')} - ${t(
          'Table.createdDate'
        )}`,
      },
      {
        value: 'opportunities.closeDate',
        label: `${t('Reports.dataSources.opportunities')} - ${t(
          'Forms.estCloseDate'
        )}`,
      },
      {
        value: 'opportunities.requestDate',
        label: `${t('Reports.dataSources.opportunities')} - ${t(
          'Forms.requestDate'
        )}`,
      },
      {
        value: 'opportunities.offerSentDate',
        label: `${t('Reports.dataSources.opportunities')} - ${t(
          'Forms.offerSentDate'
        )}`,
      },
      {
        value: 'clients.createdAt',
        label: `${t('Reports.dataSources.clients')} - ${t(
          'Table.createdDate'
        )}`,
      },
      {
        value: 'contacts.createdAt',
        label: `${t('Reports.dataSources.contacts')} - ${t(
          'Table.createdDate'
        )}`,
      },
    ],
    [t]
  );

  const textFilterableFields = useMemo(
    () => [
      { value: 'clients.name', label: t('Forms.clientName') },
      { value: 'clients.cuit', label: t('Forms.cuit') },
      {
        value: 'opportunities.title',
        label: t('Dashboard.recentOpportunities.opportunityHeader'),
      },
    ],
    [t]
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

  const handleFilterChange = (
    type: 'text' | 'dateRange',
    field: string,
    value: any
  ) => {
    setFilters((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const generateReport = () => {
    if (!dataSource) return;
    setIsGenerating(true);

    setTimeout(() => {
      const clientMap = new Map(clientsData?.map((c) => [c.id, c]));
      const contactMap = new Map(contactsData?.map((c) => [c.id, c]));

      let baseData: any[] = [];
      if (dataSource === 'clients') baseData = clientsData || [];
      if (dataSource === 'contacts') baseData = contactsData || [];
      if (dataSource === 'opportunities') baseData = opportunitiesData || [];

      const activeFields = Object.entries(selectedFields)
        .filter(([, isSelected]) => isSelected)
        .map(([key]) => key);

      const newColumns = activeFields.map((fieldKey) => {
        const [source, field] = fieldKey.split('.');
        const sourceName = source as keyof typeof reportableFields;
        const fieldName =
          field as keyof (typeof reportableFields)[typeof sourceName]['fields'];
        const header = t(reportableFields[sourceName].fields[fieldName]);
        return {
          accessorKey: fieldKey,
          header,
        };
      });

      const newData = baseData.map((primaryRecord) => {
        const row: Record<string, any> = {};

        let client: Client | undefined;
        let contact: Contact | undefined;
        let opportunity: Opportunity | undefined;

        if (dataSource === 'opportunities') {
          opportunity = primaryRecord;
          if (opportunity) {
            client = clientMap.get(opportunity.clientId);
            if (opportunity.contactId) {
              contact = contactMap.get(opportunity.contactId);
            }
          }
        } else if (dataSource === 'contacts') {
          contact = primaryRecord;
          if (contact) {
            client = clientMap.get(contact.clientId);
          }
        } else if (dataSource === 'clients') {
          client = primaryRecord;
        }

        const allPossibleFields = Object.keys(reportableFields).flatMap(
          (source) =>
            Object.keys(
              reportableFields[source as DataSource].fields
            ).map((field) => `${source}.${field}`)
        );

        for (const fieldKey of allPossibleFields) {
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

      let finalData = newData;

      // Apply text filter
      if (filters.text.field && filters.text.value) {
        const filterValueLower = filters.text.value.toLowerCase();
        finalData = finalData.filter((row) => {
          const rowValue = row[filters.text.field];
          return rowValue?.toString().toLowerCase().includes(filterValueLower);
        });
      }

      // Apply date range filter
      if (
        filters.dateRange.field &&
        filters.dateRange.from &&
        filters.dateRange.to
      ) {
        const from = startOfDay(filters.dateRange.from);
        const to = endOfDay(filters.dateRange.to);
        finalData = finalData.filter((row) => {
          const rowValue = row[filters.dateRange.field];
          if (rowValue instanceof Date) {
            return rowValue >= from && rowValue <= to;
          }
          return false;
        });
      }

      setReportColumns(newColumns);
      setReportData(finalData);
      setIsGenerating(false);
    }, 50);
  };

  const handleDownload = () => {
    if (!reportData || !reportColumns) return;

    const headers = reportColumns.map((col) => col.header);

    const dataForCsv = reportData.map((row) => {
      return reportColumns.map((col) => {
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
  };

  const pageIsLoading =
    clientsLoading || contactsLoading || opportunitiesLoading;

  const renderFieldGroup = (source: DataSource) => (
    <div key={source}>
      <h4 className="mb-2 text-md font-semibold">
        {t(reportableFields[source].header)}
      </h4>
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
            <Select
              onValueChange={(value) =>
                handleDataSourceChange(value as DataSource)
              }
              value={dataSource}
            >
              <SelectTrigger className="w-full md:w-1/3">
                <SelectValue placeholder={t('Reports.selectDataSource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">
                  {t('Reports.dataSources.clients')}
                </SelectItem>
                <SelectItem value="contacts">
                  {t('Reports.dataSources.contacts')}
                </SelectItem>
                <SelectItem value="opportunities">
                  {t('Reports.dataSources.opportunities')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('Reports.filters')}</Label>
            <div className="grid grid-cols-1 gap-6 rounded-md border p-4 md:grid-cols-2">
              {/* Text Filter */}
              <div className="space-y-2">
                <Label>{t('Reports.textFilter')}</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.text.field}
                    onValueChange={(val) =>
                      handleFilterChange('text', 'field', val)
                    }
                  >
                    <SelectTrigger className="w-2/3">
                      <SelectValue placeholder={t('Reports.selectField')} />
                    </SelectTrigger>
                    <SelectContent>
                      {textFilterableFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={t('Reports.filterValue')}
                    value={filters.text.value}
                    onChange={(e) =>
                      handleFilterChange('text', 'value', e.target.value)
                    }
                    disabled={!filters.text.field}
                  />
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label>{t('Reports.dateFilter')}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    value={filters.dateRange.field}
                    onValueChange={(val) =>
                      handleFilterChange('dateRange', 'field', val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Reports.selectField')} />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFilterableFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-1 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !filters.dateRange.from && 'text-muted-foreground'
                          )}
                          disabled={!filters.dateRange.field}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.from ? (
                            format(filters.dateRange.from, 'PPP', {
                              locale: datePickerLocale,
                            })
                          ) : (
                            <span>{t('Reports.from')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.from}
                          onSelect={(date) =>
                            handleFilterChange('dateRange', 'from', date)
                          }
                          initialFocus
                          locale={datePickerLocale}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !filters.dateRange.to && 'text-muted-foreground'
                          )}
                          disabled={!filters.dateRange.field}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.to ? (
                            format(filters.dateRange.to, 'PPP', {
                              locale: datePickerLocale,
                            })
                          ) : (
                            <span>{t('Reports.to')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.to}
                          onSelect={(date) =>
                            handleFilterChange('dateRange', 'to', date)
                          }
                          initialFocus
                          locale={datePickerLocale}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Reports.fields')}</Label>
            {dataSource ? (
              <div className="space-y-4">
                {renderFieldGroup('clients')}
                {renderFieldGroup('contacts')}
                {renderFieldGroup('opportunities')}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  {t('Reports.noFields')}
                </p>
              </div>
            )}
          </div>
          <Button
            onClick={generateReport}
            disabled={
              !dataSource ||
              Object.values(selectedFields).every((v) => !v) ||
              pageIsLoading ||
              isGenerating
            }
          >
            {isGenerating ? t('App.loading') : t('Reports.generateReport')}
          </Button>
        </CardContent>
      </Card>

      {pageIsLoading && !dataSource && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
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
