'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Contact, Location, Opportunity, Activity } from '@/lib/types';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ArrowLeft, Building, Mail, Phone, Globe, Edit, PlusCircle, MapPin, Activity as ActivityIcon } from 'lucide-react';
import { RenderWithMentions } from '@/components/activity/render-with-mentions';


const stageVariant: { [key in Opportunity['stage']]: "default" | "secondary" | "destructive" } = {
  Prospecting: "secondary",
  Proposal: "secondary",
  Negotiation: "secondary",
  Won: "default",
  Lost: "destructive",
  Canceled: "destructive",
  Suspended: "secondary",
};

const LocationsMap = dynamic(() => import('@/components/locations/locations-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-[250px] w-full rounded-lg" />,
});


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
  
  const locationsWithCoords = useMemo(() => {
    if (!locations) return [];
    return locations.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number');
  }, [locations]);

  const opportunitiesQuery = useMemo(() => (baseQuery ? query(collection(firestore, 'opportunities'), baseQuery) : null), [firestore, baseQuery]);
  const { data: opportunities, loading: opportunitiesLoading } = useCollection<Opportunity>(opportunitiesQuery);
  
  const activitiesQuery = useMemo(() => (baseQuery ? query(collection(firestore, 'activities'), baseQuery) : null), [firestore, baseQuery]);
  const { data: activities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  
  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [activities]);

  const isLoading = userLoading || clientLoading || contactsLoading || locationsLoading || opportunitiesLoading || activitiesLoading;

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
                <CardTitle>{t('Dashboard.recentActivities.title')}</CardTitle>
                <Button asChild size="sm">
                    <Link href={`/clients/${clientId}/activity`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('Activity.logNew')}
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Dashboard.recentActivities.activityHeader')}</TableHead>
                            <TableHead className="text-right">{t('Dashboard.recentActivities.dateHeader')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedActivities && sortedActivities.length > 0 ? sortedActivities.slice(0, 5).map(activity => (
                             <TableRow key={activity.id} onClick={() => router.push(`/clients/${activity.clientId}/activity`)} className="cursor-pointer">
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                    <ActivityIcon className="mt-1 h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="font-medium">{t(`Activity.types.${activity.type}`)}</p>
                                        <div className="text-sm text-muted-foreground line-clamp-2">
                                            <RenderWithMentions text={activity.description} />
                                        </div>
                                    </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{formatDistanceToNow(activity.createdAt, { locale: dateLocale, addSuffix: true })}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={2} className="text-center">{t('Summary.noActivities')}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts && contacts.length > 0 ? contacts.map(contact => (
                        <Card key={contact.id}>
                            <CardHeader>
                                <CardTitle className="text-lg">{contact.name}</CardTitle>
                                {contact.position && <CardDescription>{t(`ContactPositions.${contact.position}`)}</CardDescription>}
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                {contact.emails?.[0]?.address && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <a href={`mailto:${contact.emails[0].address}`} className="truncate hover:underline">{contact.emails[0].address}</a>
                                    </div>
                                )}
                                {contact.phones?.[0]?.number && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{contact.phones[0].number}</span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" size="sm" asChild className="w-full">
                                    <Link href={`/contacts/${contact.id}`}>
                                        <Edit className="mr-2 h-3 w-3" />
                                        {t('Actions.editContact')}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )) : (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            {t('Summary.noContacts')}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('Locations.view')}</CardTitle>
                <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                        <Link href={`/clients/${clientId}/locations`}>
                            {t('Actions.viewAll')}
                        </Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href={`/locations/new?clientId=${clientId}`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('Locations.add')}
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {locationsWithCoords.length > 0 ? (
                    <div className="h-[250px] rounded-lg overflow-hidden">
                        <LocationsMap client={client} locations={locationsWithCoords} />
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <MapPin className="mx-auto h-8 w-8" />
                        <p className="mt-2">{t('Summary.noLocations')}</p>
                    </div>
                )}
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
