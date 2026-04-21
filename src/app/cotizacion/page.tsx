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
import { addQuoteRequest } from '@/lib/firestore/quote-requests';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Send, Quote } from 'lucide-react';

const quoteSchema = z.object({
  fullName: z.string().min(2, 'Nombre requerido'),
  companyName: z.string().min(2, 'Empresa requerida'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono requerido'),
  sector: z.string().min(2, 'Sector requerido'),
  requirements: z.string().min(10, 'Por favor detalla un poco más tus necesidades'),
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
      fullName: '',
      companyName: '',
      email: '',
      phone: '',
      sector: '',
      requirements: '',
    },
  });

  async function onSubmit(values: z.infer<typeof quoteSchema>) {
    setIsSubmitting(true);
    try {
      await addQuoteRequest(firestore, values);
      setIsSuccess(true);
      toast({
        variant: 'success',
        title: 'Solicitud enviada',
        description: 'Un asesor comercial se pondrá en contacto a la brevedad.',
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-8 animate-in fade-in zoom-in duration-300">
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">¡Gracias por contactarnos!</h2>
              <p className="text-slate-500">Hemos recibido tu solicitud de cotización correctamente. Un miembro de nuestro equipo comercial te contactará pronto.</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Enviar otra solicitud
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-destructive p-4 sm:p-8">
      <div className="text-center mb-8 flex flex-col items-center">
        <Image
          src="/img/logoLarge.png"
          alt="T-Track Logo"
          width={160}
          height={160}
          priority
          className="mb-4 drop-shadow-2xl"
        />
        <p className="text-white/80 font-bold uppercase tracking-widest text-xs">Solicitud de Cotización</p>
      </div>

      <Card className="w-full max-w-2xl shadow-2xl border-none">
        <CardHeader className="bg-slate-50 border-b p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Quote className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">¿Cómo podemos ayudarlo?</CardTitle>
              <CardDescription>Complete el formulario y reciba una propuesta técnica adaptada a su empresa.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre y Apellido</FormLabel>
                    <FormControl><Input placeholder="Ej: Juan Pérez" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl><Input placeholder="Ej: Acme Corp S.A." {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Corporativo</FormLabel>
                    <FormControl><Input type="email" placeholder="email@empresa.com" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de Contacto</FormLabel>
                    <FormControl><Input placeholder="+54..." {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="sector" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sector / Industria</FormLabel>
                  <FormControl><Input placeholder="Ej: Minería, Energía, Agro..." {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="requirements" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuéntenos sobre sus necesidades</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalle el tipo de servicio, cantidad de locaciones o terminales que requiere..." 
                      className="min-h-[120px] resize-none" 
                      {...field} 
                      disabled={isSubmitting} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
                  ) : (
                    <><Send className="mr-2 h-5 w-5" /> Enviar Solicitud</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-white/50 text-[10px] font-bold uppercase tracking-widest">
        Telespazio Argentina - Servicios Satelitales & GeoInformación
      </p>
    </div>
  );
}
