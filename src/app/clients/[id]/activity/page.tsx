'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
} from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Activity, ActivityType, UserProfile, Contact } from '@/lib/types';
import { addActivity } from '@/lib/firestore/activities';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  User,
  Mail,
  Calendar as CalendarIcon,
  MessageSquare,
  ListFilter,
  ArrowLeft,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { ActivityCard } from '@/components/activity/activity-card';
import { MentionTextarea } from '@/components/activity/mention-textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const newActivitySchema = z.object({
  description: z.string().min(1, 'Required'),
  type: z.enum(['call', 'meeting', 'email', 'message']),
  isPriority: z.boolean().default(false),
  dueDate: z.date().optional().nullable(),
});

export default function ClientActivityPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [activityFilter, setActivityFilter] = useState<ActivityType | 'all'>('all');
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);

  // Data fetching
  const clientDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId, user]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const activitiesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const ref = collection(firestore, 'activities');
    
    // Admin ve todo el historial del cliente
    if (user.role === 'admin') {
      return query(ref, where('clientId', '==', clientId));
    }
    
    // Ejecutivos solo ven sus propias actividades con este cliente
    if (user.role === 'ejecutivo') {
      return query(
        ref,
        where('clientId', '==', clientId),
        where('assignedTo', '==', user.uid)
      );
    }

    // Otros (Gerente) ven actividades de su gerencia para este cliente
    return query(
      ref,
      where('clientId', '==', clientId),
      where('management', '==', user.management)
    );
  }, [firestore, clientId, user]);
  
  const { data: activities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  
  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [activities]);

  const usersQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, user]);
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const contactsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'contacts'),
      where('clientId', '==', clientId)
    );
  }, [firestore, clientId, user]);
  const { data: contacts, loading: contactsLoading } = useCollection<Contact>(contactsQuery);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (users) {
      users.forEach(u => map.set(u.uid, u));
    }
    return map;
  }, [users]);
  
  const filteredActivities = useMemo(() => {
    if (!sortedActivities) return [];
    if (activityFilter === 'all') return sortedActivities;
    return sortedActivities.filter(a => a.type === activityFilter);
  }, [sortedActivities, activityFilter]);
  
  const allUsers = useMemo(() => users ? [...users] : [], [users]);
  const allContacts = useMemo(() => contacts ? [...contacts] : [], [contacts]);

  // Form for new activity
  const form = useForm<z.infer<typeof newActivitySchema>>({
    resolver: zodResolver(newActivitySchema),
    defaultValues: {
      description: '',
      type: 'message',
      isPriority: false,
      dueDate: null,
    },
  });

  const onSubmit = (values: z.infer<typeof newActivitySchema>) => {
    if (!user) return;
    addActivity(firestore, {
      clientId: clientId,
      createdBy: user.uid,
      ...values,
    });
    form.reset();
  };

  const isLoading = userLoading || clientLoading || activitiesLoading || usersLoading || contactsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t('Activity.pageTitle')} />
        <main className="flex-1 p-4 sm:p-6"><Skeleton className="h-96" /></main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p>Client not found.</p>
      </div>
    );
  }
  
  const activityTypes: ActivityType[] = ['call', 'meeting', 'email', 'message'];


  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/clients" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.clients')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link href={`/clients/${client.id}/summary`} className="text-muted-foreground hover:text-primary transition-colors">{client.name}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{t('Dashboard.recentActivities.title')}</span>
        </div>
      }>
          <Button variant="outline" onClick={() => router.push('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('Actions.backToClientList')}
          </Button>
          <Badge variant={client.status === 'active' ? 'default' : 'destructive'} className={client.status === 'active' ? 'bg-green-600' : ''}>
              {t(`Status.${client.status}`)}
          </Badge>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left Column */}
          <div className="col-span-12 md:col-span-3 space-y-6">
             <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-sm font-semibold">{t('Activity.clientDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0 text-xs">
                   <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{client.name}</span>
                   </div>
                   <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
                   </div>
                   <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                   </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-sm font-semibold">{t('Activity.filters')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <ul className="space-y-1">
                        <li><Button variant={activityFilter === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 h-8 text-xs font-normal" onClick={() => setActivityFilter('all')}><ListFilter className="h-4 w-4"/> {t('Activity.all')}</Button></li>
                        <li><Button variant={activityFilter === 'call' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 h-8 text-xs font-normal" onClick={() => setActivityFilter('call')}><Phone className="h-4 w-4"/> {t('Activity.calls')}</Button></li>
                        <li><Button variant={activityFilter === 'meeting' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 h-8 text-xs font-normal" onClick={() => setActivityFilter('meeting')}><CalendarIcon className="h-4 w-4"/> {t('Activity.meetings')}</Button></li>
                        <li><Button variant={activityFilter === 'email' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 h-8 text-xs font-normal" onClick={() => setActivityFilter('email')}><Mail className="h-4 w-4"/> {t('Activity.emails')}</Button></li>
                        <li><Button variant={activityFilter === 'message' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2 h-8 text-xs font-normal" onClick={() => setActivityFilter('message')}><MessageSquare className="h-4 w-4"/> {t('Activity.types.message')}</Button></li>
                    </ul>
                </CardContent>
             </Card>
          </div>

          {/* Center Column */}
          <div className="col-span-12 md:col-span-9 space-y-6">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-semibold">{t('Activity.logNew')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                             <MentionTextarea 
                                {...field}
                                users={allUsers}
                                contacts={allContacts}
                                placeholder={t('Activity.placeholder')}
                             />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="w-32">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {activityTypes.map(type => (
                                                <SelectItem key={type} value={type}>{t(`Activity.types.${type}`)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={cn(
                                        "h-9 pl-3 text-left font-normal border-primary/20",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP", { locale: dateLocale })
                                      ) : (
                                        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{t('Forms.dueDate')}</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value || undefined}
                                    onSelect={(date) => {
                                      field.onChange(date);
                                      setDatePickerOpen(false);
                                    }}
                                    initialFocus
                                    locale={dateLocale}
                                  />
                                </PopoverContent>
                              </Popover>
                            </FormItem>
                          )}
                        />

                         <FormField
                            control={form.control}
                            name="isPriority"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">{t('Activity.markAsPriority')}</FormLabel>
                                </FormItem>
                            )}
                        />
                      </div>
                      <Button type="submit">{t('Activity.save')}</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-4">
                {filteredActivities.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} users={usersMap} contacts={allContacts} />
                ))}
                {filteredActivities.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No activities found for this filter.</p>
                    </div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}