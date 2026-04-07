
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { UserProfile, SystemConfig, PermissionsMatrix, UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, User as UserIcon, PlusCircle, Loader2, CheckCircle2, ShieldAlert, ShieldCheck, Lock, Save } from 'lucide-react';
import Link from 'next/link';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseConfig } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

const newUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'gerente', 'ejecutivo', 'ingeniero']),
  management: z.enum(['Satellite Communications', 'GeoInformacion']),
});

type NewUserForm = z.infer<typeof newUserSchema>;

const ROLES: UserRole[] = ['admin', 'gerente', 'ejecutivo', 'ingeniero'];
const MODULES = [
  { id: 'clients', label: 'Clientes' },
  { id: 'contacts', label: 'Contactos' },
  { id: 'opportunities', label: 'Negocios' },
  { id: 'contracts', label: 'Contratos' },
  { id: 'purchaseOrders', label: 'Órdenes de Compra' },
  { id: 'services', label: 'Servicios' },
  { id: 'equipment', label: 'Equipos' },
  { id: 'activities', label: 'Actividades' },
  { id: 'locations', label: 'Locaciones' },
  { id: 'productsAndServices', label: 'Catálogo' },
  { id: 'reports', label: 'Reportes' },
];

const MENU_ITEMS = [
  { id: 'showOpportunities', label: 'Ver Oportunidades' },
  { id: 'showCatalog', label: 'Ver Catálogo' },
  { id: 'showReports', label: 'Ver Reportes' },
  { id: 'showSettings', label: 'Ver Configuración' },
  { id: 'showContracts', label: 'Ver Contratos' },
  { id: 'showPos', label: 'Ver POs' },
  { id: 'showServices', label: 'Ver Servicios' },
  { id: 'showEquipment', label: 'Ver Equipos' },
  { id: 'showActivities', label: 'Ver Actividades' },
  { id: 'showLocations', label: 'Ver Locaciones' },
];

export default function UsersManagementPage() {
  const { t } = useI18n();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, loading } = useCollection<UserProfile>(usersQuery);

  const configDocRef = useMemo(() => doc(firestore, 'systemConfig', 'globals'), [firestore]);
  const { data: config } = useDoc<SystemConfig>(configDocRef);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [localMatrix, setLocalMatrix] = useState<PermissionsMatrix | null>(null);

  useEffect(() => {
    if (config?.permissionsMatrix) {
      setLocalMatrix(config.permissionsMatrix);
    } else {
      // Inicializar matriz por defecto si no existe
      const initial: any = {};
      ROLES.forEach(role => {
        initial[role] = {
          modules: {},
          menu: {
            showCatalog: role === 'admin' || role === 'gerente',
            showReports: true,
            showSettings: role === 'admin',
            showOpportunities: role !== 'ingeniero',
            showActivities: role !== 'ingeniero',
            showLocations: true,
            showContracts: true,
            showPos: true,
            showServices: true,
            showEquipment: true,
          }
        };
        MODULES.forEach(mod => {
          initial[role].modules[mod.id] = {
            view: true,
            create: role !== 'ingeniero',
            edit: role !== 'ingeniero',
            delete: role === 'admin' || role === 'gerente',
          };
        });
      });
      setLocalMatrix(initial);
    }
  }, [config]);

  const form = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      role: 'ejecutivo',
      management: 'Satellite Communications',
    }
  });

  const handleCreateUser = async (values: NewUserForm) => {
    setIsCreating(true);
    const firebaseConfig = getFirebaseConfig();
    const tempAppName = `TempApp-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
      const uid = userCredential.user.uid;

      const profile: UserProfile = {
        uid,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        displayName: `${values.firstName} ${values.lastName}`,
        role: values.role,
        management: values.management,
        status: 'active',
        position: 'Executive',
        phone: '',
        mfaEnforced: true,
      };

      await setDoc(doc(firestore, 'users', uid), {
        ...profile,
        createdAt: serverTimestamp(),
      });

      toast({ variant: 'success', title: 'Usuario creado', description: 'El usuario ahora puede iniciar sesión.' });
      setIsAddUserOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al crear usuario', description: e.message });
    } finally {
      await deleteApp(tempApp);
      setIsCreating(false);
    }
  };

  const updateMatrixValue = (role: UserRole, type: 'modules' | 'menu', key: string, action?: keyof ModulePermission) => {
    if (!localMatrix) return;
    const newMatrix = { ...localMatrix };
    if (type === 'modules' && action) {
      newMatrix[role].modules[key][action] = !newMatrix[role].modules[key][action];
    } else if (type === 'menu') {
      (newMatrix[role].menu as any)[key] = !(newMatrix[role].menu as any)[key];
    }
    setLocalMatrix(newMatrix);
  };

  const handleSaveMatrix = async () => {
    if (!localMatrix) return;
    setIsSavingMatrix(true);
    try {
      await updateDoc(configDocRef, {
        permissionsMatrix: localMatrix,
        updatedAt: serverTimestamp(),
      });
      toast({ variant: 'success', title: 'Matriz de permisos actualizada' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: e.message });
    } finally {
      setIsSavingMatrix(false);
    }
  };

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Settings.users')}>
        <div className="flex bg-muted rounded-lg p-1 mr-4">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/settings/users">{t('Settings.users')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/system">{t('Settings.system')}</Link>
          </Button>
        </div>
        <Button onClick={() => setIsAddUserOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('Settings.addUser')}
        </Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6 pb-24">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="list" className="gap-2"><UserIcon className="h-4 w-4" /> Directorio de Usuarios</TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2"><Lock className="h-4 w-4" /> Matriz de Roles y Permisos</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-destructive hover:bg-destructive">
                    <TableHead className="text-white font-bold text-[10px] uppercase">USUARIO</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase">EMAIL</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center">ROL</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase">GERENCIA</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center">MFA</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center">ESTADO</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-right px-4">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.sort((a,b) => a.displayName.localeCompare(b.displayName)).map((user) => (
                    <TableRow key={user.uid} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-primary">
                            <UserIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-bold text-[11px] text-slate-700">{user.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500">{user.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold border-primary/20 text-primary">
                          {t(`Roles.${user.role}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-600 font-medium">
                        {t(`Management.${user.management?.replace(' ', '')}`)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.mfaEnforced ? (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            OBLIGATORIO
                          </Badge>
                        ) : (
                          <span className="text-[9px] text-muted-foreground italic">Opcional</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="text-[9px] h-5 px-2">
                          {t(`Status.${user.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-4">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/settings/users/${user.uid}`)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="matrix">
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/20">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Configuración de Acceso</h3>
                  <p className="text-sm text-muted-foreground">Defina qué puede hacer cada rol en los diferentes módulos del sistema.</p>
                </div>
                <Button onClick={handleSaveMatrix} disabled={isSavingMatrix}>
                  {isSavingMatrix ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Cambios en la Matriz
                </Button>
              </div>

              {localMatrix && ROLES.map(role => (
                <div key={role} className="rounded-xl border bg-white shadow-sm overflow-hidden mb-8">
                  <div className="bg-slate-50 border-b p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded shadow-sm"><Lock className="h-4 w-4 text-slate-600" /></div>
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">Permisos para: {t(`Roles.${role}`)}</h4>
                        <p className="text-[10px] text-muted-foreground">Control de módulos y visibilidad de menús.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100/50">
                          <TableHead className="w-[200px] text-[10px] font-bold">MÓDULO</TableHead>
                          <TableHead className="text-center text-[10px] font-bold">VER</TableHead>
                          <TableHead className="text-center text-[10px] font-bold">CREAR</TableHead>
                          <TableHead className="text-center text-[10px] font-bold">EDITAR</TableHead>
                          <TableHead className="text-center text-[10px] font-bold">BORRAR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MODULES.map(mod => (
                          <TableRow key={mod.id}>
                            <TableCell className="font-medium text-xs text-slate-700">{mod.label}</TableCell>
                            {(['view', 'create', 'edit', 'delete'] as const).map(action => (
                              <TableCell key={action} className="text-center">
                                <Checkbox 
                                  checked={localMatrix[role].modules[mod.id]?.[action]} 
                                  onCheckedChange={() => updateMatrixValue(role, 'modules', mod.id, action)}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="bg-slate-50/50 p-4 border-t">
                    <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">Opciones de Menú</h5>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {MENU_ITEMS.map(item => (
                        <div key={item.id} className="flex items-center gap-2 border bg-white p-2 rounded-md">
                          <Checkbox 
                            id={`${role}-${item.id}`}
                            checked={(localMatrix[role].menu as any)[item.id]} 
                            onCheckedChange={() => updateMatrixValue(role, 'menu', item.id)}
                          />
                          <label htmlFor={`${role}-${item.id}`} className="text-[10px] font-medium cursor-pointer">{item.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Añadir Usuario */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Settings.newUserTitle')}</DialogTitle>
            <DialogDescription>{t('Settings.newUserDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Auth.firstNameLabel')}</Label>
                <Input {...form.register('firstName')} placeholder="John" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Auth.lastNameLabel')}</Label>
                <Input {...form.register('lastName')} placeholder="Doe" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Auth.emailLabel')}</Label>
                <Input {...form.register('email')} type="email" placeholder="email@telespazio.com" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Auth.passwordLabel')}</Label>
                <Input {...form.register('password')} type="password" placeholder="••••••••" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Profile.role')}</Label>
                <Select onValueChange={(v: any) => form.setValue('role', v)} defaultValue="ejecutivo">
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('Roles.admin')}</SelectItem>
                    <SelectItem value="gerente">{t('Roles.gerente')}</SelectItem>
                    <SelectItem value="ejecutivo">{t('Roles.ejecutivo')}</SelectItem>
                    <SelectItem value="ingeniero">{t('Roles.ingeniero')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Profile.management')}</Label>
                <Select onValueChange={(v: any) => form.setValue('management', v)} defaultValue="Satellite Communications">
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Satellite Communications">{t('Management.SatelliteCommunications')}</SelectItem>
                    <SelectItem value="GeoInformacion">{t('Management.GeoInformacion')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAddUserOpen(false)} disabled={isCreating}>
                {t('Auth.cancelLabel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {t('Forms.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
