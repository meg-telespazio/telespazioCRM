
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { redirect, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ProductServiceTable } from '@/components/products-and-services/product-service-table';
import type { ProductOrService } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query } from 'firebase/firestore';
import { deleteProductOrService } from '@/lib/firestore/products-and-services';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProductsAndServicesPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();
  const router = useRouter();

  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');

  const { data: itemsData, loading: itemsLoading } = useCollection<ProductOrService>(
    useMemo(() => (firestore ? collection(firestore, 'productsAndServices') : null), [firestore])
  );

  const items = useMemo(() => {
    if (!itemsData) return [];
    const filtered = typeFilter === 'all' ? itemsData : itemsData.filter(item => item.type === typeFilter);
    return [...filtered].sort((a, b) => (a.publicId || '').localeCompare(b.publicId || ''));
  }, [itemsData, typeFilter]);

  useEffect(() => {
    if (!userLoading && !user) redirect('/login');
    if (user && user.role !== 'admin' && user.role !== 'gerente') redirect('/dashboard');
  }, [user, userLoading]);

  const handleEditItem = (item: ProductOrService) => {
    router.push(`/products-and-services/${item.id}`);
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteProductOrService(firestore, itemId);
    }
  };

  if (userLoading) return <div className="p-12 text-center">{t('App.loading')}</div>;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AppHeader title={t('Pages.ps')}>
        {user?.role === 'admin' && (
          <Button onClick={() => router.push('/products-and-services/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('Pages.addItem')}
          </Button>
        )}
      </AppHeader>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-4">
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <TabsList><TabsTrigger value="all">{t('Table.all')}</TabsTrigger><TabsTrigger value="product">{t('PS.product')}</TabsTrigger><TabsTrigger value="service">{t('PS.service')}</TabsTrigger></TabsList>
          </Tabs>
        </div>
        {itemsLoading ? (
          <div className="space-y-4"><Skeleton className="h-96 w-full" /></div>
        ) : (
          <ProductServiceTable data={items} onEdit={handleEditItem} onDelete={handleDeleteItem} />
        )}
      </main>
    </div>
  );
}
