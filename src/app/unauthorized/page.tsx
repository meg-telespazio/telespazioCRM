
'use client';

import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center mb-8 flex flex-col items-center">
        <Image
          src="/img/logoLarge.png"
          alt="T-Track Logo"
          width={100}
          height={100}
          priority
          className="mb-4 opacity-20 grayscale"
        />
      </div>
      
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-red-50 p-4 rounded-full mb-6 ring-8 ring-red-50/50">
          <ShieldAlert className="h-12 w-12 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Usted no tiene privilegios para acceder a esta parte del sistema. Si cree que esto es un error, contacte a su administrador.
        </p>
        
        <Button 
          className="w-full h-12 gap-2 font-bold" 
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
      
      <p className="mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        Telespazio Argentina - T-Track CRM
      </p>
    </div>
  );
}
