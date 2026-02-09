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
import numeroALetras from 'numero-a-letras';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type EnrichedLineItem = Opportunity['lineItems'][0] & {
  type: ProductOrService['type'];
};

const numberToWords = (num: number, currency: 'USD' | 'EUR' | 'ARS') => {
  const currencyMap = {
    USD: {
      plural: 'DÓLARES ESTADOUNIDENSES',
      singular: 'DÓLAR ESTADOUNIDENSE',
      centPlural: 'CENTAVOS',
      centSingular: 'CENTAVO',
    },
    ARS: {
      plural: 'PESOS ARGENTINOS',
      singular: 'PESO ARGENTINO',
      centPlural: 'CENTAVOS',
      centSingular: 'CENTAVO',
    },
    EUR: {
      plural: 'EUROS',
      singular: 'EURO',
      centPlural: 'CÉNTIMOS',
      centSingular: 'CÉNTIMO',
    },
  };
  try {
    // This library can have CJS/ESM interop issues, so we robustly find the function.
    const converter = (numeroALetras as any).default || numeroALetras;
    return converter(num, { ...currencyMap[currency] }).toUpperCase();
  } catch (e) {
    console.error('Error converting number to words:', e);
    return 'Error';
  }
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
  const { data: contact, loading: contactLoading } = useDoc<Contact>(contactRef);

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

  const handlePrint = () => {
    window.print();
  };

  const recipientName = contact?.name || client?.name || '';
  const validationDate = format(
    addDays(new Date(opportunity.requestDate), 30),
    'd [de] MMMM [de] yyyy',
    { locale: dateLocale }
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
          #print-area {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            border: none !important;
          }
        }
        @page {
          size: A4;
          margin: 0.75in;
        }
      `}</style>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8 no-print">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/opportunities/${opportunityId}`)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('Proposal.back_to_opportunity')}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('Proposal.generate_pdf')}
          </Button>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
        </div>
      </div>
      <div className="flex justify-center bg-gray-100">
        <main
          id="print-area"
          className="w-full max-w-[210mm] aspect-[210/297] bg-white p-[1in] text-[10pt] shadow-lg font-sans"
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <header className="flex items-start justify-between border-b-2 border-red-700 pb-4">
              <div className="h-12 w-48">
                 <Image src="/img/logoLarge.png" alt="Logo" width={140} height={40}/>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold">
                  {t('Proposal.title')}
                </h1>
                <p className="font-bold text-red-700">
                  {opportunity.publicId}
                </p>
              </div>
            </header>

            {/* Date */}
            <p className="mt-8 text-right">
              {t('Proposal.date_location', {
                city: 'Ciudad Autónoma de Buenos Aires',
                date: format(new Date(), 'EEEE, d [de] MMMM [de] yyyy', {
                  locale: dateLocale,
                }),
              })}
            </p>

            {/* Recipient */}
            <div className="mt-8">
              <p className="font-bold">{t('Proposal.to')}</p>
              <p>{recipientName.toUpperCase()}</p>
            </div>

            {/* Proposal Data */}
            <section className="mt-8">
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
                      <td
                        className="border-b border-dotted border-gray-400 py-0.5"
                      >
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            
            {/* Line Items */}
            <section className='mt-8'>
                <h2 className='text-lg font-bold uppercase text-red-700'>{t('Proposal.products_services')}</h2>
                <table className="w-full mt-2 text-xs border-collapse">
                    <thead>
                        <tr className='bg-red-700 text-white'>
                            <th className='p-1 border border-red-700 text-center w-[5%]'>{t('Proposal.item')}</th>
                            <th className='p-1 border border-red-700 text-left w-[10%]'>{t('Proposal.type')}</th>
                            <th className='p-1 border border-red-700 text-left'>{t('Proposal.description')}</th>
                            <th className='p-1 border border-red-700 text-center w-[5%]'>{t('Proposal.qty')}</th>
                            <th className='p-1 border border-red-700 text-center w-[5%]'>{t('Proposal.disc')}</th>
                            <th className='p-1 border border-red-700 text-center w-[20%]' colSpan={2}>{t('Proposal.unit_price')}</th>
                            <th className='p-1 border border-red-700 text-center w-[20%]' colSpan={2}>{t('Proposal.subtotals')}</th>
                        </tr>
                        <tr className='bg-red-700 text-white'>
                            <th colSpan={5}></th>
                            <th className='p-1 border border-red-700 text-center font-normal'>{t('Proposal.otc')}</th>
                            <th className='p-1 border border-red-700 text-center font-normal'>{t('Proposal.mrc')}</th>
                            <th className='p-1 border border-red-700 text-center font-normal'>{t('Proposal.otc')}</th>
                            <th className='p-1 border border-red-700 text-center font-normal'>{t('Proposal.mrc')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrichedLineItems.map((line, index) => {
                            const subtotalNrc = line.quantity * line.oneTimeCharge * (1 - line.discount / 100);
                            const subtotalMrc = line.quantity * line.recurringCharge * (1 - line.discount / 100);
                            return (
                                <tr key={line.itemId} className="even:bg-gray-50">
                                    <td className='p-1 border text-center'>{index + 1}</td>
                                    <td className='p-1 border'>{t(`PS.${line.type}`)}</td>
                                    <td className='p-1 border'>{line.name}</td>
                                    <td className='p-1 border text-center'>{line.quantity}</td>
                                    <td className='p-1 border text-center'>{line.discount}%</td>
                                    <td className='p-1 border text-right'>{line.oneTimeCharge.toFixed(2)}</td>
                                    <td className='p-1 border text-right'>{line.recurringCharge.toFixed(2)}</td>
                                    <td className='p-1 border text-right'>{subtotalNrc.toFixed(2)}</td>
                                    <td className='p-1 border text-right'>{subtotalMrc.toFixed(2)}</td>
                                </tr>
                            )
                        })}

                        {/* Subtotals */}
                        <tr className="bg-gray-200 font-bold">
                            <td colSpan={7} className="p-1 border text-right">{t('Proposal.subtotal_products')}</td>
                            <td className="p-1 border text-right">{productSubtotalNrc.toFixed(2)}</td>
                            <td className="p-1 border text-right">{productSubtotalMrc.toFixed(2)}</td>
                        </tr>
                         <tr className="bg-gray-200 font-bold">
                            <td colSpan={7} className="p-1 border text-right">{t('Proposal.subtotal_services')}</td>
                            <td className="p-1 border text-right">{serviceSubtotalNrc.toFixed(2)}</td>
                            <td className="p-1 border text-right">{serviceSubtotalMrc.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-gray-300 font-bold">
                            <td colSpan={7} className="p-1 border text-right">{t('Proposal.totals')}</td>
                            <td className="p-1 border text-right">{totalNrc.toFixed(2)}</td>
                            <td className="p-1 border text-right">{totalMrc.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Body */}
            <div className="flex-grow mt-8 space-y-4">
              <div>
                <span className="font-bold text-red-700">{t('Proposal.delivery_time')}: </span>
                <span>{deliveryTime}</span>
              </div>
              <div className="font-bold text-red-700">
                <span>{t('Proposal.total_contract_value')}: </span>
                <span>{numberToWords(finalFcv, 'USD')} ({opportunity.currency} {finalFcv.toFixed(2)})</span>
              </div>
              {customNote && <div><p className='font-bold'>{t('Forms.notes').toUpperCase()}:</p><p>{customNote}</p></div>}
              <div className='border-2 border-red-700 p-2'>
                <p><span className='font-bold'>{t('Proposal.notes_title')}: </span>{t('Proposal.notes_text')}</p>
              </div>
              <div>
                <p className='font-bold'>{t('Proposal.legal_title')}</p>
                <p className='text-justify'>{t('Proposal.legal_text')}</p>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto pt-12">
                <Separator className="bg-black mb-4"/>
                <div className='flex justify-between items-end'>
                    <p className="text-xs font-bold">{t('Proposal.confidential')}</p>
                    <div className="text-right text-xs">
                        <p className="font-bold">{t('Proposal.signature_name')}</p>
                        <p>{t('Proposal.signature_company')}</p>
                        <p>{t('Proposal.signature_title')}</p>
                    </div>
                </div>
                 <div className="text-right text-xs mt-4 border-t pt-2">
                    {t('Proposal.page')} 1 de 1
                </div>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
