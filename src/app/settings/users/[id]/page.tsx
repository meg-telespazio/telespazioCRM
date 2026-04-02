'use client';

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useDoc, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, UserRole, ManagementArea } from '@/lib/types';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ShieldCheck, ShieldAlert, Loader2, ChevronRight } from 'lucide-react';
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
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setRole(userProfile.role);
      setManagement(userProfile.management);
      setStatus(userProfile.status);
      setMfaEnforced(userProfile.mfaEnforced || false);
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(userDocRef, {
        role,
        management,
        status,
        mfaEnforced,
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

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={
        <div className="flex items-center gap-2">
          <Link href="/settings/users" className="text-muted-foreground hover:text-primary transition-colors">{t('Settings.users')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{userProfile?.displayName || 'User'}</span>
        </div>
      }>
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
                <div className="p-2 border rounded bg-white text-sm text-slate-500 font-medium">{userProfile?.email}</div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label>{t('Profile.role')}</Label>
                  <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Satellite Communications">{t('Management.SatelliteCommunications')}</SelectItem>
                      <SelectItem value="GeoInformacion">{t('Management.GeoInformacion')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('Profile.status')}</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Status.active')}</SelectItem>
                      <SelectItem value="suspended">{t('Status.suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-primary/5 border-primary/20">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      {t('Settings.mfaEnforced')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('Settings.mfaEnforcedDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={mfaEnforced}
                    onCheckedChange={setMfaEnforced}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
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
