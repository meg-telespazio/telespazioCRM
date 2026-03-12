
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, UserRole, ManagementArea } from '@/lib/types';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditUserPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const targetUid = params.id as string;
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const userDocRef = useMemo(() => doc(firestore, 'users', targetUid), [firestore, targetUid]);
  const { data: userProfile, loading } = useDoc<UserProfile>(userDocRef);

  const [role, setRole] = useState<UserRole>('ejecutivo');
  const [management, setManagement] = useState<ManagementArea>('Satellite Communications');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setRole(userProfile.role);
      setManagement(userProfile.management);
      setStatus(userProfile.status);
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(userDocRef, {
        role,
        management,
        status,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid,
      });
      toast({ variant: 'success', title: t('Profile.updateSuccess') });
      router.back();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={userProfile?.displayName || 'User'}>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{t('Actions.back')}</Button>
      </AppHeader>

      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{t('Settings.editUser')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="p-2 border rounded bg-slate-50 text-sm text-slate-500">{userProfile?.email}</div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>{t('Profile.role')}</Label>
                  <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('Roles.admin')}</SelectItem>
                      <SelectItem value="gerente">{t('Roles.gerente')}</SelectItem>
                      <SelectItem value="ejecutivo">{t('Roles.ejecutivo')}</SelectItem>
                      <SelectItem value="ingeniero">{t('Roles.ingeniero')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('Profile.management')}</Label>
                  <Select value={management} onValueChange={(v: ManagementArea) => setManagement(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Satellite Communications">{t('Management.SatelliteCommunications')}</SelectItem>
                      <SelectItem value="GeoInformacion">{t('Management.GeoInformacion')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('Profile.status')}</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Status.active')}</SelectItem>
                      <SelectItem value="suspended">{t('Status.suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {t('Settings.saveUser')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
