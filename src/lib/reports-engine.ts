'use client';

import type { ReportConfig } from '@/lib/types';

/**
 * Motor de procesamiento de reportes.
 * Ejecuta una configuración de reporte sobre un conjunto de datos locales.
 */
export function runReportEngine(config: ReportConfig, collectionsMap: any) {
  const sourceData = collectionsMap[config.primaryDataSource];
  if (!sourceData) return null;

  const clientMap = new Map(collectionsMap.clients?.map((c: any) => [c.id, c]));
  const poMap = new Map(collectionsMap.purchaseOrders?.map((p: any) => [p.id, p]));
  const contractMap = new Map(collectionsMap.contracts?.map((c: any) => [c.id, c]));
  const equipMap = new Map(collectionsMap.equipment?.map((e: any) => [e.id, e]));

  // 1. Join Tables
  const joinedData = sourceData.map((item: any) => {
    const row: any = { [config.primaryDataSource]: item };
    
    // Auto-joins based on common relationships
    if (item.clientId) {
      row.clients = clientMap.get(item.clientId);
    }

    if (config.primaryDataSource === 'services') {
      const po = poMap.get(item.poId);
      if (po) {
        row.purchaseOrders = po;
        const contract = contractMap.get(po.contractId);
        if (contract) {
          row.contracts = contract;
          if (!row.clients) row.clients = clientMap.get(contract.clientId);
        }
      }
      if (item.equipmentId) {
        row.equipment = equipMap.get(item.equipmentId);
      }
    }

    if (config.primaryDataSource === 'purchaseOrders') {
      const contract = contractMap.get(item.contractId);
      if (contract) {
        row.contracts = contract;
        if (!row.clients) row.clients = clientMap.get(contract.clientId);
      }
    }

    return row;
  });

  // 2. Apply Filters
  let filtered = joinedData;
  if (config.filters?.length) {
    filtered = joinedData.filter((item: any) => {
      return config.filters.every(f => {
        const [source, field] = f.field.split('.');
        const val = item[source]?.[field];
        
        if (f.operator === 'is_not_empty') {
          return val !== undefined && val !== null && val !== '';
        }

        if (val === undefined || val === null) return false;
        
        const stringVal = String(val).toLowerCase();
        const stringFilter = String(f.value || '').toLowerCase();

        switch (f.operator) {
          case 'contains': return stringVal.includes(stringFilter);
          case 'equals': return stringVal === stringFilter;
          case 'not_equals': return stringVal !== stringFilter;
          case 'gt': return Number(val) > Number(f.value);
          case 'lt': return Number(val) < Number(f.value);
          case 'gte': return Number(val) >= Number(f.value);
          case 'lte': return Number(val) <= Number(f.value);
          default: return true;
        }
      });
    });
  }

  // 3. Handle Aggregations
  if (config.aggregations?.length) {
    // Case A: Aggregation with Grouping
    if (config.groupBy && config.groupBy !== 'none') {
      const groups = new Map<string, any>();
      const [groupSource, groupField] = config.groupBy.split('.');

      filtered.forEach((row: any) => {
        const groupValue = row[groupSource]?.[groupField];
        const groupKey = groupValue !== undefined && groupValue !== null ? String(groupValue) : 'N/A';
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { _key: groupKey, _records: [] });
        }
        groups.get(groupKey)._records.push(row);
      });

      const finalData = Array.from(groups.values()).map(group => {
        const aggregatedRow: any = {};
        aggregatedRow[config.groupBy!] = group._key;

        config.aggregations!.forEach(agg => {
          const [aggSource, aggField] = agg.field.split('.');
          const numericValues = group._records
            .map((r: any) => r[aggSource]?.[aggField])
            .filter((v: any) => v !== undefined && v !== null && !isNaN(Number(v)))
            .map((v: any) => Number(v));
          
          let result = 0;
          if (agg.type === 'sum') result = numericValues.reduce((a: number, b: number) => a + b, 0);
          else if (agg.type === 'avg') result = numericValues.length ? numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length : 0;
          else if (agg.type === 'count') result = group._records.length;

          aggregatedRow[`${agg.field}_${agg.type}`] = result;
        });
        return aggregatedRow;
      });

      const finalColumns = [
        { accessorKey: config.groupBy, header: config.groupBy },
        ...config.aggregations.map(agg => ({
          accessorKey: `${agg.field}_${agg.type}`,
          header: `${agg.type.toUpperCase()}(${agg.field})`
        }))
      ];

      return { data: finalData, columns: finalColumns };
    } 
    // Case B: Global Aggregation (No grouping)
    else {
      const aggregatedRow: any = { _isSummary: true };
      config.aggregations.forEach(agg => {
        const [aggSource, aggField] = agg.field.split('.');
        const numericValues = filtered
          .map((r: any) => r[aggSource]?.[aggField])
          .filter((v: any) => v !== undefined && v !== null && !isNaN(Number(v)))
          .map((v: any) => Number(v));
        
        let result = 0;
        if (agg.type === 'sum') result = numericValues.reduce((a: number, b: number) => a + b, 0);
        else if (agg.type === 'avg') result = numericValues.length ? numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length : 0;
        else if (agg.type === 'count') result = filtered.length;

        aggregatedRow[`${agg.field}_${agg.type}`] = result;
      });

      const finalColumns = config.aggregations.map(agg => ({
        accessorKey: `${agg.field}_${agg.type}`,
        header: `${agg.type.toUpperCase()}(${agg.field})`
      }));

      return { data: [aggregatedRow], columns: finalColumns };
    }
  }

  // 4. Default detail view
  const finalColumns = config.fields.map(fKey => {
    const [source, field] = fKey.split('.');
    return { accessorKey: fKey, header: `${source}.${field}` };
  });

  // Apply basic sorting if defined
  if (config.sorting?.length) {
    filtered.sort((a: any, b: any) => {
      for (const sort of config.sorting) {
        const [source, field] = sort.field.split('.');
        const valA = a[source]?.[field];
        const valB = b[source]?.[field];
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  return { data: filtered, columns: finalColumns };
}
