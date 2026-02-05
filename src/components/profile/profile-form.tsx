'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useAuth, useFirestore, useStorage } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AvatarCropper } from './avatar-cropper';
import { Camera } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const userAvatarPlaceholder = PlaceHolderImages.find((img) => img.id === 'user-avatar');

const getProfileFormSchema = (t: (key: string) => string) =>
  z.object({
    firstName: z.string().min(2, t('Validation.firstNameMin')),
    lastName: z.string().min(2, t('Validation.lastNameMin')),
  });

export function ProfileForm() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { t } = useI18n();

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedAvatar, setCroppedAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const profileFormSchema = useMemo(() => getProfileFormSchema(t), [t]);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
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
    if (!user) return;
    setIsUploading(true);

    try {
      let photoURL = user.photoURL;
      const displayName = `${values.firstName} ${values.lastName}`.trim();

      // 1. Upload cropped avatar if it exists (this is the blocking part)
      if (croppedAvatar) {
        toast({ title: t('Profile.uploadingAvatar') });
        const avatarRef = ref(storage, `avatars/${user.uid}/avatar.png`);
        const uploadTask = await uploadString(avatarRef, croppedAvatar, 'data_url');
        photoURL = await getDownloadURL(uploadTask.ref);
        toast({ title: t('Profile.avatarUpdated') });
      }

      // 2. Update Auth profile (fire and forget with catch)
      updateProfile(user, { displayName, photoURL }).catch((error) => {
         console.error("Auth profile update error:", error);
         toast({
            variant: 'destructive',
            title: t('Profile.updateFailure'),
            description: (error as Error).message,
        });
      });

      // 3. Update Firestore profile (fire and forget with catch)
      const userDocRef = doc(firestore, 'users', user.uid);
      const userProfileData = {
        firstName: values.firstName,
        lastName: values.lastName,
        displayName,
        photoURL,
      };
      setDoc(userDocRef, userProfileData, { merge: true }).catch(
        (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: userProfileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      );

      // Optimistic UI update
      toast({ title: t('Profile.updateSuccess') });
      setCroppedAvatar(null);

    } catch (uploadError) {
      console.error("Profile update error:", uploadError);
      toast({
        variant: 'destructive',
        title: t('Profile.updateFailure'),
        description: (uploadError as Error).message,
      });
    } finally {
      setIsUploading(false);
    }
  }

  const currentAvatarSrc = croppedAvatar || user?.photoURL || userAvatarPlaceholder?.imageUrl;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={currentAvatarSrc} alt={t('Profile.userAvatarAlt')} />
                <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <Button asChild variant="outline" size="icon" className="absolute bottom-1 right-1 h-8 w-8 rounded-full">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Camera className="h-4 w-4" />
                  <input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={onFileChange} disabled={isUploading} />
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
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={isUploading} className="w-full sm:w-auto">
            {isUploading ? t('App.loading') : t('Profile.saveChanges')}
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
