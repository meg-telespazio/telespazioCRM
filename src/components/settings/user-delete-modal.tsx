'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useI18n } from '@/firebase/client-provider';
import { useFirestore } from '@/firebase';
import { deleteUserAndReassignData } from '@/lib/firestore/users';
import { useToast } from '@/hooks/use-toast';
import { UserX, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import type { UserProfile, ManagementArea } from '@/lib/types';

interface UserDeleteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userToDelete: UserProfile | null;
  availableUsers: UserProfile[];
}

export function UserDeleteModal({
  isOpen,
  onOpenChange,
  userToDelete,
  availableUsers,
}: UserDeleteModalProps) {
  const { t } = useI18n();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [newOwnerId, setNewOwnerId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const eligibleNewOwners = useMemo(() => {
    return availableUsers
      .filter(u => u.uid !== userToDelete?.uid && (u.role === 'ejecutivo' || u.role === 'gerente' || u.role === 'admin'))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [availableUsers, userToDelete]);

  const handleDelete = async () => {
    if (!userToDelete || !newOwnerId) return;

    const newOwner = eligibleNewOwners.find(u => u.uid === newOwnerId);
    if (!newOwner) return;

    setIsDeleting(true);
    try {
      await deleteUserAndReassignData(
        firestore, 
        userToDelete.uid, 
        newOwnerId, 
        newOwner.management as ManagementArea
      );
      
      toast({ 
        variant: 'success', 
        title: 'Usuario eliminado', 
        description: `Los datos de ${userToDelete.displayName} han sido traspasados a ${newOwner.displayName}.` 
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al eliminar', 
        description: error.message 
      });
    } finally {
      setIsDeleting(false);
      setNewOwnerId('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
            <UserX className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Eliminar Usuario</DialogTitle>
          <DialogDescription className="text-center">
            Estás por eliminar a <strong>{userToDelete?.displayName}</strong>. 
            Para mantener la integridad del sistema, debes elegir quién heredará sus clientes y documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-tight">
              Esta acción actualizará masivamente Clientes, Oportunidades, Contratos y Servicios. 
              El nuevo responsable tendrá acceso total a estos registros.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-3 w-3" />
              Nuevo Responsable Asignado
            </Label>
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Seleccionar nuevo dueño..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleNewOwners.map(u => (
                  <SelectItem key={u.uid} value={u.uid}>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{u.displayName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{u.management} ({u.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t('Auth.cancelLabel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={!newOwnerId || isDeleting}
            className="min-w-[140px]"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
            Confirmar y Borrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
