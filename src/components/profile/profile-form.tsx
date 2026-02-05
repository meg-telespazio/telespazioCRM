'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { updateProfile } from 'firebase/auth';
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
import { Camera } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { UserProfile } from '@/lib/types';

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
    status: z.enum(['active', 'suspended']),
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

  const profileFormSchema = useMemo(() => getProfileFormSchema(t), [t]);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      mobile: '',
      position: 'Executive',
      status: 'active',
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
        status: user.status || 'active',
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
        status: values.status,
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

      toast({ title: t('Profile.updateSuccess') });
      setCroppedAvatar(null);
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (!error.name.includes('FirestorePermissionError')) {
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
  const statusOptions: UserProfile['status'][] = ['active', 'suspended'];

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
              <FormLabel>{t('Auth.emailLabel')}</FormLabel>
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
                    defaultValue={field.value}
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

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Profile.status')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSaving}
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
