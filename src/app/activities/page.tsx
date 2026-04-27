'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter, redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Activity, Client, UserProfile, ActivityType, Contact, SystemConfig } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { differenceInDays, format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Calendar as CalendarIcon, Mail, MessageSquare, Clock, Activity as ActivityIcon, LayoutGrid, List, PlusCircle, User, Loader2 } from 'lucide-react';
import { RenderWithMentions } from '@/components/activity/render-with-mentions';
import { Button } from '@/components/ui/button';
import { ActivityTable } from '@/components/activities/activity-table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { addActivity } from '@/lib/firestore/activities';
import { useToast } from '@/hooks/use-toast';
import { MentionTextarea } from '@/components/activity/mention-textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  meeting: CalendarIcon,
  email: Mail,
  message: MessageSquare,
};

const newActivitySchema = z.object({
  clientId: z.string().min(1, 'Seleccione un cliente'),
  description: z.string().min(1, 'Ingrese una descripción'),
  type: z.enum(['call', 'meeting', 'email', 'message']),
  isPriority: z.boolean().default(false),
  dueDate: z.date().optional().nullable(),
});

export default function AllActivitiesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const dateLocale = locale === 'es' ? es : enUS;
  
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);

  // Guard: Only load if user and their management area is ready
  const canLoadData = !userLoading && !!user && (user.role === 'admin' || !!user.management);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
  }, [user, userLoading]);

  // Config for dates
  const configDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const activitiesQuery = useMemoFirebase(() => {
    if (!canLoadData || user?.role === 'ingeniero') return null;
    const ref = collection(firestore, 'activities');
    
    // Admin ve todo
    if (user?.role === 'admin') return query(ref);
    
    // Ejecutivo solo ve sus propios clientes (Filtrando por management + assignedTo)
    if (user?.role === 'ejecutivo') {
      return query(ref, where('management', '==', user.management), where('assignedTo', '==', user.uid));
    }
    
    // Otros (Gerente) ven lo de su gerencia
    return query(ref, where('management', '==', user?.management));
  }, [canLoadData, user?.role, user?.management, user?.uid, firestore]);

  const clientsQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'clients');
    if (user?.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user?.management));
  }, [canLoadData, user?.role, user?.management, firestore]);
  
  const usersQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    return collection(firestore, 'users');
  }, [canLoadData, firestore]);

  const contactsQuery = useMemoFirebase(() => {
    if (!canLoadData) return null;
    const ref = collection(firestore, 'contacts');
    if (user?.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user?.management));
  }, [canLoadData, user?.role, user?.management, firestore]);

  const { data: activitiesData, loading: activitiesLoading } = useCollection<Activity>(activitiesQuery);
  const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery);
  const { data: contacts, loading: contactsLoading } = useCollection<Contact>(contactsQuery);
  
  const activities = useMemo(() => {
    if (!activitiesData) return [];
    return [...activitiesData].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  }, [activitiesData]);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients?.forEach(client => map.set(client.id, client.name));
    return map;
  }, [clients]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users?.forEach(u => map.set(u.uid, u));
    return map;
  }, [users]);

  const isLoading = userLoading || (activitiesLoading && activitiesQuery !== null) || clientsLoading || usersLoading || contactsLoading;
  
  const getDaysText = (days: number | null) => {
    if (days === null) return t('App.loading');
    if (days === 0) return t('Activity.updatedToday');
    if (days === 1) return t('Activity.updated1DayAgo');
    return t('Activity.updatedDaysAgo', { days });
  }

  const allUsersList = useMemo(() => users || [], [users]);
  const allContactsList = useMemo(() => contacts || [], [contacts]);

  // Form for new activity
  const form = useForm<z.infer<typeof newActivitySchema>>({
    resolver: zodResolver(newActivitySchema),
    defaultValues: {
      clientId: '',
      description: '',
      type: 'message',
      isPriority: false,
      dueDate: null,
    },
  });

  const onSubmit = async (values: z.infer<typeof newActivitySchema>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addActivity(firestore, {
        clientId: values.clientId,
        createdBy: user.uid,
        description: values.description,
        type: values.type,
        isPriority: values.isPriority,
        dueDate: values.dueDate,
      });
      toast({ variant: 'success', title: 'Actividad registrada' });
      setIsAddDialogOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.activities')}>
        <div className="flex items-center gap-4">
          {user?.role !== 'ingeniero' && (
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Registrar Actividad</span>
            </Button>
          )}
          <div className="h-8 w-px bg-border mx-1" />
          <div className="flex items-center">
            <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('card')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : activities.length > 0 ? (
          <>
            {viewMode === 'card' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || MessageSquare;
                    const clientName = clientMap.get(activity.clientId) || 'Unknown Client';
                    const updateDate = activity.updatedAt || activity.createdAt;
                    const daysSinceUpdate = updateDate ? differenceInDays(new Date(), updateDate) : 0;
                    const lastUpdateAuthorId = activity.latestFollowUpBy || activity.createdBy;
                    const lastUpdateAuthor = userMap.get(lastUpdateAuthorId);
                    const lastUpdateContent = activity.latestFollowUpContent || activity.description;
                    
                    return (
                      <Card key={activity.id} className="flex flex-col hover:shadow-lg transition-shadow border-slate-200">
                        <CardHeader 
                          onClick={() => router.push(`/clients/${activity.clientId}/activity`)}
                          className="cursor-pointer hover:bg-muted/50 p-4"
                        >
                          <div className="flex items-start gap-3">
                             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <CardTitle className="text-sm font-bold truncate">{clientName}</CardTitle>
                              <CardDescription className="text-[10px] uppercase font-bold text-primary/70">{t(`Activity.types.${activity.type}`)}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent 
                          className="flex-grow cursor-pointer hover:bg-muted/50 p-4 pt-0"
                          onClick={() => router.push(`/clients/${activity.clientId}/activity`)}
                        >
                          <div className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                             <RenderWithMentions text={lastUpdateContent} users={allUsersList} contacts={allContactsList} />
                          </div>
                        </CardContent>
                        <CardFooter className="px-4 py-3 bg-slate-50/50 border-t">
                           <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <Clock className="h-3 w-3" />
                            <span>{getDaysText(daysSinceUpdate)} • {lastUpdateAuthor?.displayName || 'Sistema'}</span>
                           </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <ActivityTable activities={activities} clientMap={clientMap} userMap={userMap} users={allUsersList} contacts={allContactsList} />
            )}
          </>
        ) : (
          <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white">
            <ActivityIcon className="h-16 w-16 text-slate-200" />
            <h3 className="mt-4 text-lg font-semibold text-slate-400">{t('Activity.noActivitiesTitle')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {user?.role === 'ingeniero' ? 'Ingenieros no tienen acceso a este módulo.' : t('Activity.noActivitiesDescription')}
            </p>
            {user?.role !== 'ingeniero' && (
              <Button className="mt-6" variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                Registrar mi primera actividad
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Global Add Activity Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Registrar Nueva Interacción
            </DialogTitle>
            <DialogDescription>
              Guarde un registro rápido de su contacto con el cliente.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccione un cliente..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px]">
                        {clients?.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Qué sucedió?</FormLabel>
                    <FormControl>
                       <MentionTextarea 
                          {...field}
                          users={allUsersList}
                          contacts={allContactsList}
                          placeholder="Escriba aquí los detalles..."
                          className="min-h-[100px]"
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medio de Contacto</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="call">Llamada</SelectItem>
                          <SelectItem value="meeting">Reunión</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="message">Mensaje / WhatsApp</SelectItem>
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
                      <FormLabel>Próximo Vencimiento</FormLabel>
                      <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-10 pl-3 text-left font-normal bg-white",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Sin vencimiento</span>
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
              </div>

              <FormField
                control={form.control}
                name="isPriority"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/5">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-bold text-slate-600">Marcar como prioridad</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                  {t('Auth.cancelLabel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Registrar Actividad
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}