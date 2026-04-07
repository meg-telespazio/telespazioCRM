
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import type { ServiceOrderItem, Location, ProductOrService, Contact, Service } from '@/lib/types';
import { addSOItem, updateSOItem, deleteSOItem } from '@/lib/firestore/service-orders';
import { collection, query, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, MapPin, Trash2, Plus, HardDrive, CheckCircle2, User, Loader2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SOItemManagerProps {
  soId: string;
  clientId: string;
  soType: string;
  disabled: boolean;
}

export function SOItemManager({ soId, clientId, soType, disabled }: SOItemManagerProps) {
  const { t } = useI18n();
  const firestore = useFirestore();
  const { user } = useUser();

  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ServiceOrderItem>>({
    locationId: '',
    serviceIdCatalog: '',
    equipmentIdCatalog: '',
    modality: 'Comodato',
    contactId: '',
  });

  // Fetch contextual data
  const locationsQuery = useMemo(() => clientId ? query(collection(firestore, 'locations'), where('clientId', '==', clientId)) : null, [firestore, clientId]);
  const contactsQuery = useMemo(() => clientId ? query(collection(firestore, 'contacts'), where('clientId', '==', clientId)) : null, [firestore, clientId]);
  const catalogQuery = useMemo(() => query(collection(firestore, 'productsAndServices'), where('status', '==', 'active')), [firestore]);
  
  // If Modification/Baja, fetch current active services for this client
  const activeServicesQuery = useMemo(() => 
    (soType === 'Baja' || soType === 'Modificación') && clientId 
      ? query(collection(firestore, 'services'), where('clientId', '==', clientId), where('status', '==', 'active'))
      : null, 
  [firestore, clientId, soType]);

  const { data: items } = useCollection<ServiceOrderItem>(collection(firestore, 'service_orders', soId, 'items'));
  const { data: locations } = useCollection<Location>(locationsQuery);
  const { data: contacts } = useCollection<Contact>(contactsQuery);
  const { data: catalog } = useCollection<ProductOrService>(catalogQuery);
  const { data: activeServices } = useCollection<Service>(activeServicesQuery);

  const services = useMemo(() => catalog?.filter(i => i.type === 'service' || i.type === 'bundle') || [], [catalog]);
  const equipment = useMemo(() => catalog?.filter(i => i.type === 'product') || [], [catalog]);

  const handleAddItem = async () => {
    if (!newItem.locationId || !newItem.serviceIdCatalog || !newItem.contactId) return;
    setIsAdding(true);
    try {
      await addSOItem(firestore, soId, newItem as any);
      setNewItem({
        locationId: '',
        serviceIdCatalog: '',
        equipmentIdCatalog: '',
        modality: 'Comodato',
        contactId: '',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateItem = async (itemId: string, data: Partial<ServiceOrderItem>) => {
    await updateSOItem(firestore, soId, itemId, data);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      await deleteSOItem(firestore, soId, itemId);
    }
  };

  const isEngineer = user?.role === 'ingeniero' || user?.role === 'admin';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          {t('SO.items')}
        </CardTitle>
        <Badge variant="secondary">{items?.length || 0} ítems</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[200px]">Locación & Contacto</TableHead>
                <TableHead>Servicio & Equipo</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead className="w-[200px]">Activación (PM)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Row for New Item */}
              {!disabled && user?.role !== 'ingeniero' && (
                <TableRow className="bg-primary/5">
                  <TableCell className="space-y-2">
                    <Select value={newItem.locationId} onValueChange={(v) => setNewItem(p => ({...p, locationId: v}))}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Locación..." /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={newItem.contactId} onValueChange={(v) => setNewItem(p => ({...p, contactId: v}))}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Contacto..." /></SelectTrigger>
                      <SelectContent>
                        {contacts?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="space-y-2">
                    <Select value={newItem.serviceIdCatalog} onValueChange={(v) => setNewItem(p => ({...p, serviceIdCatalog: v}))}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Plan..." /></SelectTrigger>
                      <SelectContent>
                        {soType === 'Alta' ? (
                          services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                        ) : (
                          activeServices?.map(s => <SelectItem key={s.id} value={s.id}>{s.serviceNickname} ({s.servicePlan})</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                    <Select value={newItem.equipmentIdCatalog} onValueChange={(v) => setNewItem(p => ({...p, equipmentIdCatalog: v}))}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Hardware..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin Equipo</SelectItem>
                        {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={newItem.modality} onValueChange={(v: any) => setNewItem(p => ({...p, modality: v}))}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Comodato">Comodato</SelectItem>
                        <SelectItem value="Venta">Venta</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground italic text-[10px]">
                    Completado por PM
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={handleAddItem} disabled={isAdding || !newItem.locationId || !newItem.serviceIdCatalog}>
                      {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              {/* Items List */}
              {items?.map((item) => {
                const loc = locations?.find(l => l.id === item.locationId);
                const contact = contacts?.find(c => c.id === item.contactId);
                const sCatalog = catalog?.find(s => s.id === item.serviceIdCatalog);
                const eCatalog = catalog?.find(e => e.id === item.equipmentIdCatalog);

                return (
                  <TableRow key={item.id} className={cn(item.isClosed && "bg-green-50/30")}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <MapPin className="h-3 w-3 text-primary" />
                          {loc?.name || 'Locación desconocida'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-medium">
                          <User className="h-2.5 w-2.5" />
                          {contact?.name || 'Sin contacto'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs font-medium">{sCatalog?.name || 'Plan desconocido'}</div>
                        {item.equipmentIdCatalog !== 'none' && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <HardDrive className="h-2.5 w-2.5" />
                            {eCatalog?.name || item.equipmentIdCatalog}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.modality}</Badge>
                    </TableCell>
                    <TableCell>
                      {isEngineer ? (
                        <div className="space-y-2 animate-in slide-in-from-right-2">
                          <Input 
                            placeholder="Final Service ID..." 
                            className="h-7 text-[10px] bg-white border-primary/20" 
                            defaultValue={item.serviceIdFinal}
                            onBlur={(e) => handleUpdateItem(item.id, { serviceIdFinal: e.target.value })}
                          />
                          <div className="flex gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-7 w-full text-[10px] justify-start bg-white border-primary/20">
                                  <CalendarIcon className="mr-1 h-3 w-3" />
                                  {item.activationDate ? format(item.activationDate, 'dd/MM/yy') : 'Fecha Act.'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={item.activationDate} 
                                  onSelect={(date) => handleUpdateItem(item.id, { activationDate: date || undefined })}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {item.isClosed ? (
                            <div className="text-green-700 font-bold flex items-center gap-1 text-[10px] uppercase">
                              <CheckCircle2 className="h-3 w-3" />
                              Activado: {item.serviceIdFinal}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[10px]">Pendiente de PM</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!disabled && user?.role !== 'ingeniero' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {items?.length === 0 && !isAdding && (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground italic text-xs">
                    {t('SO.noItems')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
