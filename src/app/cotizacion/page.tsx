'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Image from 'next/image';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addQuoteRequest } from '@/lib/firestore/quote-requests';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Send, Quote, Building2, UserCircle, Zap, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const quoteSchema = z.object({
  companyName: z.string().min(2, 'Empresa requerida'),
  legalName: z.string().min(2, 'Razón Social requerida'),
  taxIdType: z.enum(['CUIT', 'RUT_CL', 'RUC_PE', 'CNPJ', 'RUT_CO', 'NIT_CR', 'EIN_US', 'OTHER']),
  taxId: z.string().min(8, 'ID Tributario inválido'),
  country: z.enum(['Argentina', 'Brazil', 'Chile', 'Colombia', 'CostaRica', 'Peru']),
  address: z.object({
    streetName: z.string().min(1, 'Calle requerida'),
    streetNumber: z.string().min(1, 'Altura requerida'),
    city: z.string().min(1, 'Ciudad requerida'),
    province: z.string().min(1, 'Provincia requerida'),
    country: z.string().min(1, 'País requerido'),
    postalCode: z.string().min(1, 'CP requerido'),
  }),
  contact: z.object({
    firstName: z.string().min(1, 'Nombre requerido'),
    lastName: z.string().min(1, 'Apellido requerido'),
    phone: z.string().min(8, 'Teléfono requerido'),
    email: z.string().email('Email inválido'),
  }),
  description: z.string().min(10, 'Por favor detalla más tu requerimiento').max(500),
  quantity: z.coerce.number().min(1, 'Cantidad mínima 1'),
  usage: z.enum(['movil', 'fijo']),
  usageLocation: z.string().min(1, 'Indique dónde se utilizará'),
  dataCapacityGb: z.coerce.number().min(1, 'Capacidad mínima 1 GB'),
  approxImplementationDate: z.coerce.date().optional(),
  discoverySource: z.enum(['web', 'linkedin', 'referencia', 'otro']),
});

export default function PublicQuotePage() {
  const { t } = useI18n();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      companyName: '',
      legalName: '',
      taxIdType: 'CUIT',
      taxId: '',
      country: 'Argentina',
      address: {
        streetName: '',
        streetNumber: '',
        city: '',
        province: '',
        country: '',
        postalCode: '',
      },
      contact: {
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
      },
      description: '',
      quantity: 1,
      usage: 'fijo',
      usageLocation: '',
      dataCapacityGb: 1,
      discoverySource: 'web',
    },
  });

  async function onSubmit(values: z.infer<typeof quoteSchema>) {
    setIsSubmitting(true);
    try {
      await addQuoteRequest(firestore, values as any);
      setIsSuccess(true);
      toast({
        variant: 'success',
        title: 'Solicitud enviada',
        description: 'Un asesor comercial de Telespazio se pondrá en contacto con usted.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la solicitud. Por favor reintente más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4">
        <Card className="w-full max-w-md text-center py-12 animate-in fade-in zoom-in duration-500 shadow-2xl">
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-slate-800">¡Muchas Gracias!</h2>
              <p className="text-slate-500 text-lg">Hemos recibido tu solicitud de cotización. Un miembro de nuestro equipo comercial te contactará a la brevedad.</p>
            </div>
            <Button variant="outline" className="w-full h-12" onClick={() => window.location.reload()}>
              Enviar otra solicitud
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-destructive py-12 px-4 sm:px-8">
      <div className="text-center mb-10 flex flex-col items-center">
        <Image
          src="/img/logoBlancoChico.png"
          alt="Telespazio Logo"
          width={240}
          height={60}
          priority
          className="mb-6 drop-shadow-xl"
        />
        <div className="h-1 w-20 bg-white/30 rounded-full mb-4" />
        <h1 className="text-white text-2xl font-black uppercase tracking-[0.2em]">Solicitud de Cotización</h1>
      </div>

      <Card className="w-full max-w-4xl shadow-2xl border-none overflow-hidden mb-12">
        <CardHeader className="bg-slate-50 border-b p-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary text-white rounded-xl shadow-inner">
              <Quote className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-black text-slate-800">¿Cómo podemos ayudarlo?</CardTitle>
              <CardDescription className="text-lg">Complete el formulario para recibir una propuesta técnica a medida.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              
              {/* SECCIÓN 1: DATOS CLIENTE */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-5 w-5" />
                  <h3 className="font-black uppercase tracking-tighter">Datos de la Empresa</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre de la Empresa *</FormLabel><FormControl><Input placeholder="Nombre Fantasía" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="legalName" render={({ field }) => (
                    <FormItem><FormLabel>Razón Social *</FormLabel><FormControl><Input placeholder="Razón Social Completa" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="taxIdType" render={({ field }) => (
                      <FormItem className="col-span-1"><FormLabel>Tipo ID *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {['CUIT', 'RUT_CL', 'RUC_PE', 'CNPJ', 'RUT_CO', 'NIT_CR', 'EIN_US', 'OTHER'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="taxId" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>ID Tributario *</FormLabel><FormControl><Input placeholder="00-00000000-0" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem><FormLabel>País de Operación *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {['Argentina', 'Brazil', 'Chile', 'Colombia', 'CostaRica', 'Peru'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <FormField control={form.control} name="address.streetName" render={({ field }) => (<FormItem><FormLabel>Calle *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="address.streetNumber" render={({ field }) => (<FormItem><FormLabel>Número *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="address.city" render={({ field }) => (<FormItem><FormLabel>Ciudad *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="address.province" render={({ field }) => (<FormItem><FormLabel>Provincia *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="address.country" render={({ field }) => (<FormItem><FormLabel>País *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="address.postalCode" render={({ field }) => (<FormItem><FormLabel>Código Postal *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>

              <Separator />

              {/* SECCIÓN 2: CONTACTO */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <UserCircle className="h-5 w-5" />
                  <h3 className="font-black uppercase tracking-tighter">Persona de Contacto</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="contact.firstName" render={({ field }) => (<FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="contact.lastName" render={({ field }) => (<FormItem><FormLabel>Apellido *</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="contact.phone" render={({ field }) => (<FormItem><FormLabel>Teléfono *</FormLabel><FormControl><Input placeholder="+54..." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="contact.email" render={({ field }) => (<FormItem><FormLabel>Email Corporativo *</FormLabel><FormControl><Input type="email" placeholder="email@empresa.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>

              <Separator />

              {/* SECCIÓN 3: DATOS SOLICITUD */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="h-5 w-5" />
                  <h3 className="font-black uppercase tracking-tighter">Datos de la Solicitud</h3>
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción corta del requerimiento *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detalle sus necesidades (máximo 500 caracteres)..." 
                        className="min-h-[100px] resize-none" 
                        maxLength={500}
                        {...field} 
                        disabled={isSubmitting} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Cantidad de servicios *</FormLabel><FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="usage" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de Uso *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="fijo">Fijo (Base Terrestre)</SelectItem>
                          <SelectItem value="movil">Móvil (Vehículos/Marítimo)</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dataCapacityGb" render={({ field }) => (
                    <FormItem><FormLabel>Capacidad de datos (GB) *</FormLabel><FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="usageLocation" render={({ field }) => (
                    <FormItem><FormLabel>¿Dónde se utilizará? *</FormLabel><FormControl><Input placeholder="Ej: Vaca Muerta, Altamar, etc." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="approxImplementationDate" render={({ field }) => (
                    <FormItem><FormLabel>Fecha Aproximada de Implementación</FormLabel><FormControl><Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="discoverySource" render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Cómo nos conoció?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="web">Sitio Web</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="referencia">Referencia Personal</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="pt-6">
                <Button type="submit" className="w-full h-14 text-xl font-black uppercase tracking-widest shadow-xl" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Procesando...</>
                  ) : (
                    <><Send className="mr-2 h-6 w-6" /> Enviar Solicitud de Cotización</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="text-center space-y-2 opacity-60">
        <p className="text-white font-bold text-xs uppercase tracking-[0.3em]">Telespazio Argentina S.A.</p>
        <p className="text-white text-[10px]">Un líder global en servicios satelitales y geoinformación.</p>
      </div>
    </div>
  );
}
