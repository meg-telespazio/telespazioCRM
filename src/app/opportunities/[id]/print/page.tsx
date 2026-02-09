'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import {
  type Opportunity,
  type Client,
  type Contact,
  type ProductOrService,
} from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { format, addDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

type EnrichedLineItem = Opportunity['lineItems'][0] & {
  type: ProductOrService['type'];
};

const numberToWords = (
  num: number,
  currency: 'USD' | 'EUR' | 'ARS' = 'USD'
): string => {
  return `${currency} ${num.toFixed(2)}`;
};

export default function PrintOpportunityPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'es' ? es : enUS;
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const firestore = useFirestore();

  const opportunityId = params.id as string;

  const [deliveryTime, setDeliveryTime] = useState(
    t('Proposal.delivery_time_placeholder')
  );
  const [customNote, setCustomNote] = useState('');

  // Data fetching
  const opportunityRef = useMemo(
    () => (firestore ? doc(firestore, 'opportunities', opportunityId) : null),
    [firestore, opportunityId]
  );
  const { data: opportunity, loading: opportunityLoading } =
    useDoc<Opportunity>(opportunityRef);

  const clientRef = useMemo(
    () =>
      firestore && opportunity?.clientId
        ? doc(firestore, 'clients', opportunity.clientId)
        : null,
    [firestore, opportunity?.clientId]
  );
  const { data: client, loading: clientLoading } = useDoc<Client>(clientRef);

  const contactRef = useMemo(
    () =>
      firestore && opportunity?.contactId
        ? doc(firestore, 'contacts', opportunity.contactId)
        : null,
    [firestore, opportunity?.contactId]
  );
  const { data: contact, loading: contactLoading } =
    useDoc<Contact>(contactRef);

  const psQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'productsAndServices'),
      where('createdBy', '==', user.uid)
    );
  }, [user, firestore]);
  const { data: psData, loading: psLoading } =
    useCollection<ProductOrService>(psQuery);

  const {
    enrichedLineItems,
    productSubtotalNrc,
    productSubtotalMrc,
    serviceSubtotalNrc,
    serviceSubtotalMrc,
    totalNrc,
    totalMrc,
    finalFcv,
  } = useMemo(() => {
    if (!opportunity?.lineItems || !psData) {
      return {
        enrichedLineItems: [],
        productSubtotalNrc: 0,
        productSubtotalMrc: 0,
        serviceSubtotalNrc: 0,
        serviceSubtotalMrc: 0,
        totalNrc: 0,
        totalMrc: 0,
        finalFcv: opportunity?.value || 0,
      };
    }

    const psMap = new Map(psData.map((item) => [item.id, item]));
    const items: EnrichedLineItem[] = opportunity.lineItems.map((lineItem) => ({
      ...lineItem,
      type: psMap.get(lineItem.itemId)?.type || 'product',
    }));

    const calculateTotals = (
      items: EnrichedLineItem[],
      type: 'product' | 'service'
    ) => {
      return items
        .filter((item) => item.type === type)
        .reduce(
          (acc, item) => {
            const nrc =
              item.quantity * item.oneTimeCharge * (1 - item.discount / 100);
            const mrc =
              item.quantity * item.recurringCharge * (1 - item.discount / 100);
            acc.nrc += nrc;
            acc.mrc += mrc;
            return acc;
          },
          { nrc: 0, mrc: 0 }
        );
    };

    const productTotals = calculateTotals(items, 'product');
    const serviceTotals = calculateTotals(items, 'service');
    const lineItemTotalNrc = productTotals.nrc + serviceTotals.nrc;
    const lineItemTotalMrc = productTotals.mrc + serviceTotals.mrc;

    const discountMultiplier =
      1 - (opportunity.generalDiscountPercentage || 0) / 100;
    const finalNrc = opportunity.applyDiscountToNrc
      ? lineItemTotalNrc * discountMultiplier
      : lineItemTotalNrc;
    const finalMrc = opportunity.applyDiscountToMrc
      ? lineItemTotalMrc * discountMultiplier
      : lineItemTotalMrc;
    const fcv = finalNrc + finalMrc * (opportunity.contractMonths || 1);

    return {
      enrichedLineItems: items,
      productSubtotalNrc: productTotals.nrc,
      productSubtotalMrc: productTotals.mrc,
      serviceSubtotalNrc: serviceTotals.nrc,
      serviceSubtotalMrc: serviceTotals.mrc,
      totalNrc: finalNrc,
      totalMrc: finalMrc,
      finalFcv: fcv,
    };
  }, [opportunity, psData]);

  if (
    opportunityLoading ||
    clientLoading ||
    contactLoading ||
    psLoading ||
    !opportunity
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="w-full max-w-4xl bg-white p-8 shadow-lg">
          <Skeleton className="h-16 w-1/3" />
          <Skeleton className="mt-8 h-8 w-1/4" />
          <Skeleton className="mt-4 h-24 w-full" />
          <Skeleton className="mt-8 h-48 w-full" />
        </div>
      </div>
    );
  }

  const recipientName = contact?.name || client?.name || '';
  const validationDate = format(
    addDays(new Date(opportunity.requestDate), 30),
    'd [de] MMMM [de] yyyy',
    { locale: dateLocale }
  );

  const ProposalHeader = () => (
    <header className="flex items-start justify-between border-b-2 border-red-700 pb-4">
      <div className="h-12 w-48">
        <Image src="/img/logoLarge.png" alt="Logo" width={140} height={40} />
      </div>
      <div className="text-right">
        <h1 className="text-2xl font-bold">{t('Proposal.title')}</h1>
        <p className="font-bold text-red-700">{opportunity.publicId}</p>
      </div>
    </header>
  );

  const ProposalFooter = ({ page, totalPages }: { page: number, totalPages: number }) => (
    <footer className="mt-auto pt-6">
      <Separator className="mb-2 bg-black" />
      <div className="flex items-end justify-between">
        <p className="text-[9px] font-bold">{t('Proposal.confidential')}</p>
        <div className="text-right text-xs">
          <p className="font-bold">{t('Proposal.signature_name')}</p>
          <p>{t('Proposal.signature_company')}</p>
          <p>{t('Proposal.signature_title')}</p>
        </div>
      </div>
      <div className="mt-2 border-t pt-1 text-right text-[9px]">
        {t('Proposal.page')} {page} de {totalPages}
      </div>
    </footer>
  );

  const Page1Content = () => (
    <>
      <ProposalHeader />
      <p className="mt-6 text-right">
        {t('Proposal.date_location', {
          city: 'Ciudad Autónoma de Buenos Aires',
          date: format(new Date(), 'EEEE, d [de] MMMM [de] yyyy', {
            locale: dateLocale,
          }),
        })}
      </p>
      <div className="mt-6">
        <p className="font-bold">{t('Proposal.to')}</p>
        <p>{recipientName.toUpperCase()}</p>
      </div>
      <section className="mt-6">
        <h2 className="text-lg font-bold uppercase text-red-700">
          {t('Proposal.proposalData')}
        </h2>
        <table className="mt-2 w-2/3">
          <tbody>
            {[
              { label: 'quote_id', value: opportunity.publicId },
              { label: 'valid_until', value: validationDate },
              { label: 'client', value: client?.name || '' },
              {
                label: 'framework_agreement',
                value: `CM-${new Date().getFullYear()}-000001`,
              },
              {
                label: 'contract_duration',
                value: `${opportunity.contractMonths} meses`,
              },
            ].map(({ label, value }) => (
              <tr key={label}>
                <td className="w-1/3 py-0.5 font-semibold">
                  {t(`Proposal.${label}`)}
                </td>
                <td className="border-b border-dotted border-gray-400 py-0.5">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-6 flex-grow">
        <h2 className="text-lg font-bold uppercase text-red-700">
          {t('Proposal.products_services')}
        </h2>
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-red-700 text-white">
              <th className="w-[5%] border border-red-700 p-0.5 text-center">
                {t('Proposal.item')}
              </th>
              <th className="w-[10%] border border-red-700 p-0.5 text-left">
                {t('Proposal.type')}
              </th>
              <th className="border border-red-700 p-0.5 text-left">
                {t('Proposal.description')}
              </th>
              <th className="w-[5%] border border-red-700 p-0.5 text-center">
                {t('Proposal.qty')}
              </th>
              <th className="w-[5%] border border-red-700 p-0.5 text-center">
                {t('Proposal.disc')}
              </th>
              <th
                className="w-[20%] border border-red-700 p-0.5 text-center"
                colSpan={2}
              >
                {t('Proposal.unit_price')}
              </th>
              <th
                className="w-[20%] border border-red-700 p-0.5 text-center"
                colSpan={2}
              >
                {t('Proposal.subtotals')}
              </th>
            </tr>
            <tr className="bg-red-700 text-white">
              <th colSpan={5}></th>
              <th className="border border-red-700 p-0.5 text-center font-normal">
                {t('Proposal.otc')}
              </th>
              <th className="border border-red-700 p-0.5 text-center font-normal">
                {t('Proposal.mrc')}
              </th>
              <th className="border border-red-700 p-0.5 text-center font-normal">
                {t('Proposal.otc')}
              </th>
              <th className="border border-red-700 p-0.5 text-center font-normal">
                {t('Proposal.mrc')}
              </th>
            </tr>
          </thead>
          <tbody>
            {enrichedLineItems.map((line, index) => {
              const subtotalNrc =
                line.quantity * line.oneTimeCharge * (1 - line.discount / 100);
              const subtotalMrc =
                line.quantity * line.recurringCharge * (1 - line.discount / 100);
              return (
                <tr key={line.itemId} className="even:bg-gray-50">
                  <td className="border p-0.5 text-center">{index + 1}</td>
                  <td className="border p-0.5">{t(`PS.${line.type}`)}</td>
                  <td className="border p-0.5">{line.name}</td>
                  <td className="border p-0.5 text-center">{line.quantity}</td>
                  <td className="border p-0.5 text-center">{line.discount}%</td>
                  <td className="border p-0.5 text-right">
                    {line.oneTimeCharge.toFixed(2)}
                  </td>
                  <td className="border p-0.5 text-right">
                    {line.recurringCharge.toFixed(2)}
                  </td>
                  <td className="border p-0.5 text-right">
                    {subtotalNrc.toFixed(2)}
                  </td>
                  <td className="border p-0.5 text-right">
                    {subtotalMrc.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <ProposalFooter page={1} totalPages={2} />
    </>
  );

  const Page2Content = () => (
    <>
      <ProposalHeader />
      <section className="mt-6 flex-grow">
        <h2 className="text-lg font-bold uppercase text-red-700">
          {t('Table.totals')}
        </h2>
        <table className="mt-2 w-full border-collapse text-[11px]">
          <tbody>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={7} className="border p-0.5 text-right">
                {t('Proposal.subtotal_products')}
              </td>
              <td className="border p-0.5 text-right">
                {productSubtotalNrc.toFixed(2)}
              </td>
              <td className="border p-0.5 text-right">
                {productSubtotalMrc.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={7} className="border p-0.5 text-right">
                {t('Proposal.subtotal_services')}
              </td>
              <td className="border p-0.5 text-right">
                {serviceSubtotalNrc.toFixed(2)}
              </td>
              <td className="border p-0.5 text-right">
                {serviceSubtotalMrc.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-gray-300 font-bold">
              <td colSpan={7} className="border p-0.5 text-right">
                {t('Proposal.totals')}
              </td>
              <td className="border p-0.5 text-right">{totalNrc.toFixed(2)}</td>
              <td className="border p-0.5 text-right">{totalMrc.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-8 space-y-4">
          <div>
            <span className="font-bold text-red-700">
              {t('Proposal.delivery_time')}:{' '}
            </span>
            <span>{deliveryTime}</span>
          </div>
          <div className="font-bold text-red-700">
            <span>{t('Proposal.total_contract_value')}: </span>
            <span>
              {numberToWords(finalFcv, opportunity.currency)}
            </span>
          </div>
          {customNote && (
            <div>
              <p className="font-bold">{t('Forms.notes').toUpperCase()}:</p>
              <p>{customNote}</p>
            </div>
          )}
          <div className="border-2 border-red-700 p-2">
            <p className="text-[8pt]">
              <span className="font-bold">{t('Proposal.notes_title')}: </span>
              {t('Proposal.notes_text')}
            </p>
          </div>
          <div>
            <p className="font-bold">{t('Proposal.legal_title')}</p>
            <p className="text-justify text-[8pt]">{t('Proposal.legal_text')}</p>
          </div>
        </div>
      </section>
      <ProposalFooter page={2} totalPages={2} />
    </>
  );

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background-color: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            border: none !important;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .page-break {
            page-break-before: always;
          }
        }
        @page {
          size: A4;
          margin: 0.5in;
        }
      `}</style>
      
      <div className="no-print min-h-screen bg-gray-100">
        <div className="container mx-auto max-w-7xl p-4 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`/opportunities/${opportunityId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('Proposal.back_to_opportunity')}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              {t('Proposal.generate_pdf')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 lg:col-span-9 flex justify-center group">
              <Carousel className="w-full max-w-[210mm]">
                <CarouselContent>
                  <CarouselItem>
                    <div className="p-1 md:p-2">
                      <div className="aspect-[210/297] bg-white p-10 text-[9pt] shadow-lg font-sans flex flex-col">
                        <Page1Content />
                      </div>
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="p-1 md:p-2">
                       <div className="aspect-[210/297] bg-white p-10 text-[9pt] shadow-lg font-sans flex flex-col">
                        <Page2Content />
                      </div>
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="left-4 opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
                <CarouselNext className="right-4 opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
              </Carousel>
            </div>
            
            <div className="md:col-span-4 lg:col-span-3">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>{t('Proposal.customization')}</CardTitle>
                  <CardDescription>{t('Proposal.customization_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div>
                    <label
                      htmlFor="delivery-time"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      {t('Proposal.delivery_time')}
                    </label>
                    <Textarea
                      id="delivery-time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder={t('Proposal.delivery_time_placeholder')}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-note"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      {t('Forms.notes')}
                    </label>
                    <Textarea
                      id="custom-note"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder={t('Proposal.custom_note_placeholder')}
                      className="bg-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>

      <div className="hidden print-only">
        <div className="print-sheet">
          <Page1Content />
        </div>
        <div className="print-sheet page-break">
          <Page2Content />
        </div>
      </div>
    </>
  );
}

    