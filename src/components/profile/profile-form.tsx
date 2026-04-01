'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AvatarCropper } from './avatar-cropper';
import { Camera, ShieldAlert, MailCheck, Loader2 } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { UserProfile } from '@/lib/types';
import { Badge } from '../ui/badge';

const userAvatarPlaceholder = PlaceHolderImages.find(
  (img) => img.id === 'user-avatar'
);

const getProfileFormSchema = (t: (key: string) => string) =>
  z.object({
    firstName: z.string().min(2, t('Validation.firstNameMin')),
    lastName: z.string().min(2, t('Validation.lastNameMin')),
    phone: z.string().min(10, t('Validation.phoneMin')),
    mobile: z.string().optional().or(z.literal('')),
    position: z.enum(['Director', 'Manager', 'Executive', 'Project Manager']),
    role: z.enum(['admin', 'gerente', 'ejecutivo', 'ingeniero']),
    status: z.enum(['active', 'suspended']),
    country: z.string().optional().or(z.literal('')),
    management: z.enum(['Satellite Communications', 'GeoInformacion']).optional(),
    notes: z.string().optional(),
  });

export function ProfileForm() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedAvatar, setCroppedAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const profileFormSchema = useMemo(() => getProfileFormSchema(t), [t]);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      mobile: '',
      position: 'Executive',
      role: 'ejecutivo',
      status: 'active',
      country: '',
      management: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || user.displayName?.split(' ')[0] || '',
        lastName:
          user.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        mobile: user.mobile || '',
        position: user.position || 'Executive',
        role: user.role || 'ejecutivo',
        status: user.status || 'active',
        country: user.country || '',
        management: user.management as any,
        notes: user.notes || '',
      });
    }
  }, [user, form]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
      });
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = ''; // Reset file input
    }
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setCroppedAvatar(croppedImageUrl);
    setImageToCrop(null);
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({
        variant: 'success',
        title: 'Correo Enviado',
        description: 'Se ha enviado un enlace de verificación a tu bandeja de entrada.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!user || !auth.currentUser) return;
    setIsSaving(true);
    toast({ title: t('Profile.savingProfile') });

    try {
      const displayName = `${values.firstName} ${values.lastName}`.trim();
      const authPromise = updateProfile(auth.currentUser, { displayName });

      const photoURL = croppedAvatar || user.photoURL;

      const userProfileData: Partial<UserProfile> = {
        firstName: values.firstName,
        lastName: values.lastName,
        displayName,
        photoURL,
        phone: values.phone,
        mobile: values.mobile,
        position: values.position,
        role: values.role,
        status: values.status,
        country: values.country,
        management: values.management,
        notes: values.notes,
      };

      const userDocRef = doc(firestore, 'users', user.uid);
      const firestorePromise = setDoc(userDocRef, userProfileData, {
        merge: true,
      }).catch((serverError) => {
        if (serverError?.code?.includes('permission-denied')) {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: userProfileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        } else {
          throw serverError; // Re-throw other errors
        }
      });

      await Promise.all([authPromise, firestorePromise]);

      toast({ variant: 'success', title: t('Profile.updateSuccess') });
      setCroppedAvatar(null);
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (!error.name?.includes('FirestorePermissionError')) {
        toast({
          variant: 'destructive',
          title: t('Profile.updateFailure'),
          description: error.message,
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  const currentAvatarSrc =
    croppedAvatar || user?.photoURL || userAvatarPlaceholder?.imageUrl;

  const positionOptions: UserProfile['position'][] = [
    'Director',
    'Manager',
    'Executive',
    'Project Manager',
  ];
  
  const roleOptions: UserProfile['role'][] = [
    'admin',
    'gerente',
    'ejecutivo',
    'ingeniero'
  ];

  const statusOptions: UserProfile['status'][] = ['active', 'suspended'];
  
  const countryOptions = [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'CostaRica', 'Cuba', 
    'DominicanRepublic', 'Ecuador', 'ElSalvador', 'Guatemala', 'Honduras', 
    'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'PuertoRico', 
    'Uruguay', 'Venezuela', 'USA', 'Canada', 'Bahamas', 'Barbados', 'Belize', 
    'Guyana', 'Suriname', 'TrinidadAndTobago'
  ].sort((a, b) => t(`Countries.${a}`).localeCompare(t(`Countries.${b}`)));

  const managementOptions: UserProfile['management'][] = [
    'Satellite Communications',
    'GeoInformacion'
  ];

  const isGlobalAdmin = user?.email === 'mariano.gonzalez@telespazio.com';
  const canEditPermissions = isGlobalAdmin;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={currentAvatarSrc}
                  alt={t('Profile.userAvatarAlt')}
                />
                <AvatarFallback>
                  {user?.email?.[0].toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                asChild
                variant="outline"
                size="icon"
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full"
              >
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Camera className="h-4 w-4" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={onFileChange}
                    disabled={isSaving}
                  />
                </label>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Auth.firstNameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Auth.lastNameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                {t('Auth.emailLabel')}
                {user?.emailVerified ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 text-[9px] h-4">Verificado</Badge>
                ) : (
                  <Button 
                    type="button" 
                    variant="link" 
                    className="h-auto p-0 text-[10px] text-destructive font-bold uppercase"
                    onClick={handleSendVerification}
                    disabled={isSendingVerification}
                  >
                    {isSendingVerification ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MailCheck className="h-3 w-3 mr-1" />}
                    Validar Email
                  </Button>
                )}
              </FormLabel>
              <FormControl>
                <Input value={user?.email || ''} readOnly disabled />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Auth.phoneLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Profile.mobile')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Profile.position')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSaving}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positionOptions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {t(`Positions.${pos}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t pt-4 bg-muted/10 rounded-lg p-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    {t('Profile.role')}
                    {!canEditPermissions && <ShieldAlert className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSaving || !canEditPermissions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`Roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!canEditPermissions && <p className="text-[10px] text-muted-foreground">Solo lectura para usuarios</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="management"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    {t('Profile.management')}
                    {!canEditPermissions && <ShieldAlert className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSaving || !canEditPermissions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Profile.management')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {managementOptions.map((opt) => {
                        const translationKey = opt?.replace(' ', '');
                        return (
                          <SelectItem key={opt} value={opt || ''}>
                            {t(`Management.${translationKey}`)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {!canEditPermissions && <p className="text-[10px] text-muted-foreground">Solo lectura para usuarios</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Profile.country')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSaving}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Profile.country')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countryOptions.map((country) => (
                        <SelectItem key={country} value={country}>
                          {t(`Countries.${country}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Profile.status')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSaving || !canEditPermissions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((stat) => (
                        <SelectItem key={stat} value={stat}>
                          {t(`Status.${stat}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Profile.notes')}</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none"
                    {...field}
                    disabled={isSaving}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? t('App.loading') : t('Profile.saveChanges')}
          </Button>
        </form>
      </Form>
      <AvatarCropper
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
        onClose={() => setImageToCrop(null)}
      />
    </>
  );
}
