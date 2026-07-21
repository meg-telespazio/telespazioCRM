'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import type { ProductOrService, SystemConfig } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  addProductOrService,
  updateProductOrService,
} from '@/lib/firestore/products-and-services';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Package, Plus, Trash2, ChevronRight } from 'lucide-react';
import { AvatarCropper } from '@/components/profile/avatar-cropper';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const getFormSchema = (t: (key: string) => string) =>
  z.object({
    type: z.enum(['product', 'service', 'bundle']),
    name: z.string().min(2, t('Validation.itemNameMin')),
    description: z.string().optional(),
    photoURL: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    unitOfMeasure: z.enum(['units', 'meters', 'kg', 'liters', 'GB']).optional(),
    oneTimeCharge: z.coerce.number().min(0, t('Validation.itemChargeMin')).optional(),
    recurringCharge: z.coerce.number().min(0, t('Validation.itemChargeMin')).optional(),
    currency: z.string().optional(),
    isEditable: z.boolean().default(false),
    availableDiscounts: z
      .string()
      .optional()
      .transform((val) =>
        val ? val.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : []
      ),
    bundleItems: z.array(z.object({
      itemId: z.string().min(1),
      quantity: z.coerce.number().min(1),
    })).optional(),
  });

type ItemFormData = z.infer<ReturnType<typeof getFormSchema>>;

export default function ProductServiceFormPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [bundleItemToAdd, setBundleItemToAdd] = useState<{itemId: string, quantity: number}>({ itemId: '', quantity: 1 });

  const itemId = params.id as string;
  const isNew = itemId === 'new';

  const itemDocRef = useMemo(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'productsAndServices', itemId);
  }, [firestore, itemId, isNew]);

  const { data: itemData, loading: itemLoading } =
    useDoc<ProductOrService>(itemDocRef);
    
  const configDocRef = useMemo(() => (firestore && user) ? doc(firestore, 'systemConfig', 'globals') : null, [firestore, user]);
  const { data: configData } = useDoc<SystemConfig>(configDocRef);

  const baseQuery = useMemo(() => (user ? where('createdBy', '==', user.uid) : null), [user]);
  const { data: allCatalogData, loading: catalogLoading } = useCollection<ProductOrService>(useMemo(() => baseQuery ? query(collection(firestore, 'productsAndServices'), baseQuery) : null, [firestore, baseQuery]));

  const catalogData = useMemo(() => {
    if (!allCatalogData) return null;
    return allCatalogData.filter(item => item.type !== 'bundle');
  }, [allCatalogData]);

  const catalogItems = useMemo(() => {
    if (!catalogData) return [];
    return [...catalogData].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogData]);


  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'product',
      name: '',
      description: '',
      photoURL: '',
      status: 'active',
      unitOfMeasure: 'units',
      oneTimeCharge: 0,
      recurringCharge: 0,
      currency: 'USD',
      isEditable: false,
      availableDiscounts: '',
      bundleItems: [],
    },
  });
  
  const { fields: bundleItemFields, append: appendBundleItem, remove: removeBundleItem } = useFieldArray({
    control: form.control,
    name: 'bundleItems',
  });

  const watchedType = form.watch('type');

  useEffect(() => {
    if (itemData) {
      form.reset({
        ...itemData,
        availableDiscounts: itemData.availableDiscounts?.join(', ') || '',
        bundleItems: itemData.bundleItems || [],
      });
    }
  }, [itemData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      redirect('/login');
    }
    // Acceso controlado por PageWrapper/Permissions
  }, [user, userLoading]);

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
    setCroppedImage(croppedImageUrl);
    setImageToCrop(null);
  };
  
  const handleAddBundleItem = () => {
    if (!bundleItemToAdd.itemId || bundleItemToAdd.quantity < 1) return;
    appendBundleItem({ itemId: bundleItemToAdd.itemId, quantity: bundleItemToAdd.quantity });
    setBundleItemToAdd({ itemId: '', quantity: 1 });
  };


  async function onSubmit(values: ItemFormData) {
    if (!user) return;
    setIsSaving(true);
    
    let dataToSave: Partial<ItemFormData> = {
      ...values,
      photoURL: croppedImage || itemData?.photoURL || '',
    };
    
    if (values.type !== 'bundle') {
        dataToSave.bundleItems = [];
    } else {
        delete (dataToSave as any).oneTimeCharge;
        delete (dataToSave as any).recurringCharge;
        delete (dataToSave as any).unitOfMeasure;
        delete (dataToSave as any).currency;
    }

    try {
      if (isNew) {
        await addProductOrService(firestore, user.uid, dataToSave as any);
        toast({ variant: 'success', title: t('PS.saveSuccess') });
      } else {
        await updateProductOrService(firestore, itemId, dataToSave);
        toast({ variant: 'success', title: t('PS.saveSuccess') });
      }
      router.push('/products-and-services');
    } catch (error: any) {
      console.error('Failed to save item', error);
      toast({
        variant: 'destructive',
        title: t('Actions.saveErrorGeneric'),
        description: error.message,
      });
    } finally {
        setIsSaving(false);
    }
  }

  const pageIsLoading = userLoading || (itemLoading && !isNew) || catalogLoading;
  const currentImageSrc = croppedImage || form.watch('photoURL');
  
  if (pageIsLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={isNew ? t('PS.addItem') : t('PS.editItem')} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  const statusOptions: ProductOrService['status'][] = ['active', 'inactive'];
  const unitOptions: ProductOrService['unitOfMeasure'][] = ['units', 'meters', 'kg', 'liters', 'GB'];
  const currencyOptions: string[] = configData?.currencies || ['USD', 'EUR', 'ARS'];
  const typeOptions: ProductOrService['type'][] = ['product', 'service', 'bundle'];

  return (
    <>
      <div className="flex flex-1 flex-col">
        <AppHeader title={
          <div className="flex items-center gap-2">
            <Link href="/products-and-services" className="text-muted-foreground hover:text-primary transition-colors">{t('Sidebar.ps')}</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span>{isNew ? t('PS.addItem') : (itemData?.name || t('PS.editItem'))}</span>
          </div>
        } />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-32 w-32 rounded-lg">
                          <AvatarImage src={currentImageSrc} alt={t('PS.itemName')} />
                          <AvatarFallback className="rounded-lg">
                            <Package className="h-16 w-16 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <Button asChild variant="outline" size="icon" className="absolute bottom-1 right-1 h-8 w-8 rounded-full" disabled={isSaving}>
                          <label htmlFor="item-photo-upload" className="cursor-pointer">
                            <Camera className="h-4 w-4" />
                            <input id="item-photo-upload" type="file" accept="image/*" className="sr-only" onChange={onFileChange} disabled={isSaving} />
                          </label>
                        </Button>
                      </div>
                    </div>
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem className="space-y-3"><FormLabel>{t('PS.itemType')}</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                            {typeOptions.map(type => (
                               <FormItem key={type} className="flex items-center space-x-2 space-y-0">
                                <FormControl><RadioGroupItem value={type} /></FormControl>
                                <FormLabel className="font-normal">{t(`PS.${type}`)}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('PS.itemName')}</FormLabel>
                        <FormControl><Input placeholder={t('PS.itemNamePlaceholder')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('PS.itemDescription')}</FormLabel>
                        <FormControl><Textarea placeholder={t('PS.itemDescriptionPlaceholder')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
                
                {watchedType !== 'bundle' && (
                    <Card>
                    <CardContent className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField control={form.control} name="unitOfMeasure" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('PS.unitOfMeasure')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('PS.selectUnit')} /></SelectTrigger></FormControl>
                            <SelectContent>
                                {unitOptions.map((unit) => (
                                <SelectItem key={unit} value={unit}>{t(`UnitOfMeasures.${unit}`)}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('PS.currency')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {currencyOptions.map((currency) => (
                                <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="oneTimeCharge" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('PS.oneTimeCharge')}</FormLabel>
                            <FormControl><Input type="number" placeholder={t('Forms.chargePlaceholder')} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="recurringCharge" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('PS.recurringCharge')}</FormLabel>
                            <FormControl><Input type="number" placeholder={t('Forms.chargePlaceholder')} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="availableDiscounts" render={({ field }) => (
                        <FormItem className='md:col-span-2'>
                            <FormLabel>{t('PS.availableDiscounts')}</FormLabel>
                            <FormControl><Input placeholder={t('PS.discountsPlaceholder')} {...field} /></FormControl>
                            <FormDescription>{t('Validation.itemDiscountFormat')}</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )} />
                    </CardContent>
                    </Card>
                )}
                
                {watchedType === 'bundle' && (
                    <Card>
                        <CardHeader><CardTitle>{t('PS.bundleItems')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[2fr,1fr,auto]" id="bundle-item-adder">
                                <div className="md:col-span-1">
                                    <Label htmlFor="bundle-item-select">{t('PS.itemName')}</Label>
                                    <Select value={bundleItemToAdd.itemId} onValueChange={(id) => setBundleItemToAdd(prev => ({...prev, itemId: id}))}>
                                        <SelectTrigger id="bundle-item-select"><SelectValue placeholder={t('Forms.selectItem')} /></SelectTrigger>
                                        <SelectContent>
                                            {catalogItems.map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div>
                                    <Label htmlFor="bundle-item-quantity">{t('Forms.quantity')}</Label>
                                    <Input
                                        id="bundle-item-quantity"
                                        type="number"
                                        value={bundleItemToAdd.quantity}
                                        onChange={(e) => setBundleItemToAdd(prev => ({...prev, quantity: Number(e.target.value)}))}
                                        min={1}
                                    />
                                </div>
                                <Button type="button" size="icon" onClick={handleAddBundleItem} disabled={!bundleItemToAdd.itemId}>
                                    <Plus /><span className="sr-only">{t('PS.addBundleItem')}</span>
                                </Button>
                             </div>
                             <Separator />
                              {bundleItemFields.length > 0 ? (
                                <ul className="space-y-2">
                                  {bundleItemFields.map((field, index) => {
                                    const item = catalogItems.find(i => i.id === field.itemId);
                                    return (
                                      <li key={field.id} className="flex items-center justify-between rounded-md border p-2">
                                        <span>{item?.name || field.itemId} (x{field.quantity})</span>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeBundleItem(index)}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </li>
                                    )
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">{t('PS.noBundleItems')}</p>
                              )}
                        </CardContent>
                    </Card>
                )}


                <Card>
                    <CardContent className='p-6 space-y-6'>
                        <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('PS.status')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('PS.selectStatus')} /></SelectTrigger></FormControl>
                            <SelectContent>
                                {statusOptions.map((status) => (
                                <SelectItem key={status} value={status}>{t(`Status.${status}`)}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )} />

                        <FormField control={form.control} name="isEditable" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel>{t('PS.isEditable')}</FormLabel>
                            <FormDescription>{t('PS.isEditableDesc')}</FormDescription>
                            </div>
                        </FormItem>
                        )} />
                    </CardContent>
                </Card>


                <div className="flex items-center justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    {t('Auth.cancelLabel')}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? t('App.loading') : t('PS.saveItem')}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
      <AvatarCropper
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
        onClose={() => setImageToCrop(null)}
        cropShape="rect"
      />
    </>
  );
}
