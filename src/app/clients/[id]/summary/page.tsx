'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Contact, Location, Opportunity } from '@/lib/types';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Building, Mail, Phone, Globe, Edit, PlusCircle } from 'lucide-react';

const stageVariant: { [key in Opportunity['stage']]: "default" | "secondary" | "destructive" } = {
  Prospecting: "secondary",
  Proposal: "secondary",
  Negotiation: "secondary",
  Won: "default",
  Lost: "destructive",
  Canceled: "destructive",
  Suspended: "secondary",
};


export default function ClientSummaryPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // Data fetching
  const clientDocRef = useMemo(() => {
    if (!firestore || !clientId) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const baseQuery = useMemo(() => {
    if (!clientId) return null;
    return where('clientId', '==', clientId);
  }, [clientId]);

  const contactsQuery = useMemo(() => (baseQuery ? query(collection(firestore, 'contacts'), baseQuery) : null), [firestore, baseQuery]);
  const { data: contacts, loading: contactsLoading } = useCollection<Contact>(contactsQuery);

  const locationsQuery = useMemo(() => (baseQuery ? query(collection(firestore, 'locations'), baseQuery) : null), [firestore, baseQuery]);
  const { data: locations, loading: locationsLoading } = useCollection<Location>(locationsQuery);

  const opportunitiesQuery = useMemo(() => (baseQuery ? query(collection(firestore, 'opportunities'), baseQuery) : null), [firestore, baseQuery]);
  const { data: opportunities, loading: opportunitiesLoading } = useCollection<Opportunity>(opportunitiesQuery);

  const isLoading = userLoading || clientLoading || contactsLoading || locationsLoading || opportunitiesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('App.loading')} />
        <main className="flex-1 p-4 sm:p-6 grid gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p>Client not found.</p>
        <Button variant="outline" onClick={() => router.push('/clients')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Actions.backToClientList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.clientSummary')}>
        <Button variant="outline" onClick={() => router.push('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Actions.backToClientList')}
        </Button>
        <Button onClick={() => router.push(`/clients/${clientId}`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('Actions.editClient')}
        </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6 grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-lg">
                <AvatarImage src={client.logoURL || undefined} alt={client.name} />
                <AvatarFallback className="rounded-lg bg-muted">
                    <Building className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl">{client.name}</CardTitle>
                <CardDescription>{t(`Industries.${client.industry}`)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
             <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
            </div>
            <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
            </div>
             {client.website && <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.website}</a>
            </div>}
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('Pages.contacts')}</CardTitle>
                <Button asChild size="sm">
                    <Link href={`/contacts/new?clientId=${clientId}`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('Pages.addContact')}
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Forms.contactName')}</TableHead>
                            <TableHead>{t('Forms.position')}</TableHead>
                            <TableHead>{t('Auth.emailLabel')}</TableHead>
                            <TableHead>{t('Auth.phoneLabel')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contacts && contacts.length > 0 ? contacts.map(contact => (
                            <TableRow key={contact.id}>
                                <TableCell><Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">{contact.name}</Link></TableCell>
                                <TableCell>{contact.position ? t(`ContactPositions.${contact.position}`) : '-'}</TableCell>
                                <TableCell>{contact.emails?.[0]?.address || '-'}</TableCell>
                                <TableCell>{contact.phones?.[0]?.number || '-'}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center">{t('Summary.noContacts')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('Locations.view')}</CardTitle>
                <Button asChild size="sm">
                    <Link href={`/locations/new?clientId=${clientId}`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('Locations.add')}
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Locations.name')}</TableHead>
                            <TableHead>{t('Locations.type')}</TableHead>
                            <TableHead>{t('Table.address')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {locations && locations.length > 0 ? locations.map(location => (
                            <TableRow key={location.id}>
                                <TableCell><Link href={`/locations/${location.id}`} className="font-medium hover:underline">{location.name}</Link></TableCell>
                                <TableCell>{t(`LocationTypes.${location.type}`)}</TableCell>
                                <TableCell>{`${location.streetName} ${location.streetNumber}, ${location.city}`}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} className="text-center">{t('Summary.noLocations')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('Pages.opportunities')}</CardTitle>
                <Button asChild size="sm">
                    <Link href={`/opportunities/new?clientId=${clientId}`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('Pages.addOpportunity')}
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Dashboard.recentOpportunities.opportunityHeader')}</TableHead>
                            <TableHead>{t('Dashboard.recentOpportunities.stageHeader')}</TableHead>
                            <TableHead>{t('Dashboard.recentOpportunities.valueHeader')}</TableHead>
                            <TableHead>{t('Forms.estCloseDate')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {opportunities && opportunities.length > 0 ? opportunities.map(opp => (
                            <TableRow key={opp.id}>
                                <TableCell><Link href={`/opportunities/${opp.id}`} className="font-medium hover:underline">{opp.title}</Link></TableCell>
                                <TableCell><Badge variant={stageVariant[opp.stage]}>{t(`Stages.${opp.stage}`)}</Badge></TableCell>
                                <TableCell>${opp.value.toLocaleString()}</TableCell>
                                <TableCell>{format(opp.closeDate, 'P', { locale: dateLocale })}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center">{t('Summary.noOpportunities')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </main>
    </div>
  );
}
