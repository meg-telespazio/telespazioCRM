'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Client, Activity, ActivityType, UserProfile } from '@/lib/types';
import { addActivity } from '@/lib/firestore/activities';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar,
  MessageSquare,
  ListFilter,
} from 'lucide-react';
import { ActivityCard } from '@/components/activity/activity-card';

const newActivitySchema = z.object({
  description: z.string().min(1, 'Required'),
  type: z.enum(['call', 'meeting', 'email', 'message']),
  isPriority: z.boolean().default(false),
});

export default function ClientActivityPage() {
  const { t } = useI18n();
  const params = useParams();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [activityFilter, setActivityFilter] = useState<ActivityType | 'all'>('all');

  // Data fetching
  const clientDocRef = useMemo(() => doc(firestore, 'clients', clientId), [firestore, clientId]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const activitiesQuery = useMemo(() => {
    const q = query(
      collection(firestore, 'activities'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    return q;
  }, [firestore, clientId]);
  
  const { data: activities, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);

  const usersQuery = useMemo(() => collection(firestore, 'users'), [firestore]);
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (users) {
      users.forEach(u => map.set(u.uid, u));
    }
    return map;
  }, [users]);
  
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (activityFilter === 'all') return activities;
    return activities.filter(a => a.type === activityFilter);
  }, [activities, activityFilter]);

  // Form for new activity
  const form = useForm<z.infer<typeof newActivitySchema>>({
    resolver: zodResolver(newActivitySchema),
    defaultValues: {
      description: '',
      type: 'message',
      isPriority: false,
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

  const isLoading = userLoading || clientLoading || activitiesLoading || usersLoading;

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
      <AppHeader title={client.name}>
          <Badge variant={client.status === 'active' ? 'default' : 'destructive'} className={client.status === 'active' ? 'bg-green-600' : ''}>
              {t(`Status.${client.status}`)}
          </Badge>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left Column */}
          <div className="col-span-12 md:col-span-3 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>{t('Activity.clientDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                   <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{client.name}</span>
                   </div>
                   <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
                   </div>
                   <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                   </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle>{t('Activity.filters')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        <li><Button variant={activityFilter === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setActivityFilter('all')}><ListFilter /> {t('Activity.all')}</Button></li>
                        <li><Button variant={activityFilter === 'call' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setActivityFilter('call')}><Phone /> {t('Activity.calls')}</Button></li>
                        <li><Button variant={activityFilter === 'meeting' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setActivityFilter('meeting')}><Calendar /> {t('Activity.meetings')}</Button></li>
                        <li><Button variant={activityFilter === 'email' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" onClick={() => setActivityFilter('email')}><Mail /> {t('Activity.emails')}</Button></li>
                    </ul>
                </CardContent>
             </Card>
          </div>

          {/* Center Column */}
          <div className="col-span-12 md:col-span-9 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('Activity.logNew')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder={t('Activity.placeholder')} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
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
                            name="isPriority"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <FormLabel>{t('Activity.markAsPriority')}</FormLabel>
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
                    <ActivityCard key={activity.id} activity={activity} users={usersMap} />
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
