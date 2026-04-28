'use client';

import { useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/firebase/client-provider';
import type { Client, UserProfile, ManagementArea } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2, UserCheck, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { reassignClient } from '@/lib/firestore/clients';

interface ClientBulkEditDialogProps {
  selectedClients: Client[];
  users: UserProfile[];
  onComplete: () => void;
}

export function ClientBulkEditDialog({
  selectedClients,
  users,
  onComplete,
}: ClientBulkEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const firestore = useFirestore();

  const [status, setStatus] = useState<string>('no_change');
  const [type, setType] = useState<string>('no_change');
  const [assignedTo, setAssignedTo] = useState<string>('no_change');

  const count = selectedClients.length;

  const validExecutives = useMemo(() => {
    return users
      .filter(u => u.role === 'ejecutivo' || u.role === 'admin')
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [users]);

  if (count === 0) return null;

  const handleUpdate = async () => {
    if (!firestore) return;
    if (status === 'no_change' && type === 'no_change' && assignedTo === 'no_change') {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    let successCount = 0;

    try {
      // Si hay cambio de responsable, usamos la lógica de reasignación en cascada
      if (assignedTo !== 'no_change') {
        const newExec = users.find(u => u.uid === assignedTo);
        if (!newExec) throw new Error("Nuevo responsable no encontrado.");

        for (const client of selectedClients) {
          // Primero actualizamos el responsable con la cascada
          await reassignClient(firestore, client.id, assignedTo, newExec.management as ManagementArea);
          
          // Luego aplicamos otros cambios masivos si existen
          const extraUpdates: any = {};
          if (status !== 'no_change') extraUpdates.status = status;
          if (type !== 'no_change') extraUpdates.type = type;

          if (Object.keys(extraUpdates).length > 0) {
            await updateDoc(doc(firestore, 'clients', client.id), extraUpdates);
          }
          successCount++;
        }
      } else {
        // Solo cambios de estado/tipo (Update normal)
        const updates: any = {};
        if (status !== 'no_change') updates.status = status;
        if (type !== 'no_change') updates.type = type;

        const promises = selectedClients.map((client) => {
          const docRef = doc(firestore, 'clients', client.id);
          return updateDoc(docRef, updates).then(() => {
            successCount++;
          });
        });

        await Promise.allSettled(promises);
      }

      toast({
        variant: 'success',
        title: 'Actualización completada',
        description: `Se procesaron ${successCount} clientes con éxito.`,
      });

      setIsOpen(false);
      onComplete();
      
      // Reset dropdowns
      setStatus('no_change');
      setType('no_change');
      setAssignedTo('no_change');
    } catch (error: any) {
      console.error('Error updating clients', error);
      toast({
        variant: 'destructive',
        title: 'Error de actualización',
        description: error.message || 'Ha ocurrido un error inesperado al actualizar clientes.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        className="bg-slate-800 hover:bg-slate-700 text-xs h-9"
        onClick={() => setIsOpen(true)}
      >
        <Settings2 className="h-4 w-4 mr-2" />
        Ajustes Masivos ({count})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajustes Masivos</DialogTitle>
            <DialogDescription>
              Aplica cambios a {count} cliente{count !== 1 ? 's' : ''}. El cambio de responsable reasignará automáticamente todos los contactos, oportunidades y contratos vinculados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado del cliente</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Sin cambios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">-- Sin cambios --</SelectItem>
                  <SelectItem value="active">{t('Status.active')}</SelectItem>
                  <SelectItem value="suspended">{t('Status.suspended')}</SelectItem>
                  <SelectItem value="canceled">{t('Status.canceled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de cuenta</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Sin cambios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">-- Sin cambios --</SelectItem>
                  <SelectItem value="client">{t('ClientType.client')}</SelectItem>
                  <SelectItem value="prospect">{t('ClientType.prospect')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="executive" className="flex items-center gap-2">
                <UserCheck className="h-3 w-3" />
                Traspasar a Nuevo Responsable
              </Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="executive">
                  <SelectValue placeholder="Sin cambios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">-- Sin cambios --</SelectItem>
                  {validExecutives.map(u => (
                    <SelectItem key={u.uid} value={u.uid}>
                      {u.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || (status === 'no_change' && type === 'no_change' && assignedTo === 'no_change')}
            >
              {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Aplicar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
