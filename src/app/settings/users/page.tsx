

'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useFirebaseApp } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, UserRole, ManagementArea } from '@/lib/types';
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
import { Edit, Shield, User as UserIcon, PlusCircle, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
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

const newUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'gerente', 'ejecutivo', 'ingeniero']),
  management: z.enum(['Satellite Communications', 'GeoInformacion']),
});

type NewUserForm = z.infer<typeof newUserSchema>;

export default function UsersManagementPage() {
  const { t } = useI18n();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, loading } = useCollection<UserProfile>(usersQuery);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      role: 'ejecutivo',
      management: 'Satellite Communications',
    }
  });

  const handleCreateUser = async (values: NewUserForm) => {
    setIsCreating(true);
    const config = getFirebaseConfig();
    const tempAppName = `TempApp-${Date.now()}`;
    const tempApp = initializeApp(config, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
      const uid = userCredential.user.uid;

      // 2. Create Firestore Profile
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
        mfaEnforced: true, // Default to true for new users
      };

      await setDoc(doc(firestore, 'users', uid), {
        ...profile,
        createdAt: serverTimestamp(),
      });

      toast({ variant: 'success', title: 'Usuario creado', description: 'El usuario ahora puede iniciar sesión con sus credenciales.' });
      setIsAddUserOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al crear usuario', description: e.message });
    } finally {
      await deleteApp(tempApp);
      setIsCreating(false);
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

      <main className="flex-1 p-4 sm:p-6">
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
      </main>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Settings.newUserTitle')}</DialogTitle>
            <DialogDescription>{t('Settings.newUserDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Auth.firstNameLabel')}</Label>
                <Input {...form.register('firstName')} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>{t('Auth.lastNameLabel')}</Label>
                <Input {...form.register('lastName')} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Auth.emailLabel')}</Label>
              <Input {...form.register('email')} type="email" placeholder="email@telespazio.com" />
            </div>
            <div className="space-y-2">
              <Label>{t('Auth.passwordLabel')}</Label>
              <Input {...form.register('password')} type="password" placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Profile.role')}</Label>
                <Select onValueChange={(v: any) => form.setValue('role', v)} defaultValue="ejecutivo">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="ejecutivo">Ejecutivo de Cuentas</SelectItem>
                    <SelectItem value="ingeniero">Ingeniero de Cuentas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Profile.management')}</Label>
                <Select onValueChange={(v: any) => form.setValue('management', v)} defaultValue="Satellite Communications">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Satellite Communications">SatComs</SelectItem>
                    <SelectItem value="GeoInformacion">GeoInfo</SelectItem>
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
