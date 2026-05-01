'use server';
/**
 * @fileOverview Genkit Tools para el agente de reportes.
 * Cada tool ejecuta lógica de acceso a datos con seguridad aplicada en código.
 * El enfoque pragmático pasa los datos ya cargados desde el frontend como contexto.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CRM_COLLECTIONS, MODULE_TO_COLLECTION, generateSchemaContext } from '@/ai/knowledge/crm-data-schema';
import type { PermissionsMatrix, UserRole } from '@/lib/types';

// --- Contexto compartido por las tools (inyectado por el flow) ---
// Usamos un patrón de "context injection" donde el flow setea estos valores
// antes de invocar al LLM, y las tools los leen.
let _toolContext: {
  userRole: UserRole;
  userId: string;
  userManagement: string;
  permissionsMatrix: PermissionsMatrix;
  collectionsData: Record<string, any[]>;
} | null = null;

export function setToolContext(ctx: typeof _toolContext) {
  _toolContext = ctx;
}

function getCtx() {
  if (!_toolContext) throw new Error('Tool context not initialized');
  return _toolContext;
}

// --- Helpers de seguridad ---

function userCanViewModule(moduleName: string): boolean {
  const ctx = getCtx();
  const perms = ctx.permissionsMatrix?.[ctx.userRole];
  if (!perms) return false;
  return perms.modules?.[moduleName]?.view === true;
}

function applySecurityFilters(data: any[]): any[] {
  const ctx = getCtx();
  if (ctx.userRole === 'admin') return data;

  let filtered = data.filter((item: any) =>
    item.management === ctx.userManagement || !item.management
  );

  if (ctx.userRole === 'ejecutivo') {
    filtered = filtered.filter((item: any) =>
      item.assignedTo === ctx.userId || !item.assignedTo
    );
  }

  return filtered;
}

function getCollectionForModule(moduleName: string): string | null {
  return MODULE_TO_COLLECTION[moduleName] || null;
}

// --- Tool 1: getAvailableModules ---

export const getAvailableModulesTool = ai.defineTool(
  {
    name: 'getAvailableModules',
    description: 'Retorna la lista de módulos/colecciones a los que el usuario actual tiene acceso de lectura. Usa esta tool ANTES de consultar datos para verificar permisos.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      modules: z.array(z.object({
        name: z.string().describe('Nombre del módulo'),
        collection: z.string().describe('Nombre de la colección en la base de datos'),
        canView: z.boolean().describe('Si el usuario puede ver datos de este módulo'),
      })),
    }),
  },
  async () => {
    const ctx = getCtx();
    const perms = ctx.permissionsMatrix?.[ctx.userRole];
    const modules = Object.entries(MODULE_TO_COLLECTION).map(([moduleName, collName]) => ({
      name: moduleName,
      collection: collName,
      canView: perms?.modules?.[moduleName]?.view === true,
    }));
    return { modules };
  }
);

// --- Tool 2: getSchemaInfo ---

export const getSchemaInfoTool = ai.defineTool(
  {
    name: 'getSchemaInfo',
    description: 'Retorna información detallada del schema de una colección específica o de todas las colecciones. Usa esta tool para entender qué campos, tipos de datos y valores posibles tiene cada colección antes de hacer una consulta.',
    inputSchema: z.object({
      collectionName: z.string().optional().describe('Nombre de la colección a consultar. Si se omite, retorna el schema completo.'),
    }),
    outputSchema: z.object({
      schema: z.string().describe('Descripción del schema en formato legible'),
    }),
  },
  async ({ collectionName }) => {
    if (collectionName) {
      const coll = CRM_COLLECTIONS[collectionName];
      if (!coll) {
        return { schema: `La colección "${collectionName}" no existe. Colecciones disponibles: ${Object.keys(CRM_COLLECTIONS).join(', ')}` };
      }
      const lines = [`## ${collectionName}\n${coll.description}\n\nCampos:`];
      for (const [fname, f] of Object.entries(coll.fields)) {
        let line = `- ${fname} (${f.type}): ${f.description}`;
        if (f.values) line += ` | Valores: [${f.values.join(', ')}]`;
        if (f.aggregatable) line += ' | AGREGABLE';
        lines.push(line);
      }
      if (coll.relationships.length > 0) {
        lines.push('\nRelaciones:');
        for (const rel of coll.relationships) {
          lines.push(`→ ${rel.target} via "${rel.via}" (${rel.direction})`);
        }
      }
      return { schema: lines.join('\n') };
    }
    return { schema: generateSchemaContext() };
  }
);

// --- Tool 3: queryCollection ---

export const queryCollectionTool = ai.defineTool(
  {
    name: 'queryCollection',
    description: 'Consulta datos de una colección del CRM aplicando filtros opcionales. Los filtros de seguridad por rol se aplican automáticamente. Máximo 100 registros. Para consultar datos de una colección relacionada (ej: nombre del cliente de un contrato), puedes usar el campo enrichWithClients para incluir datos del cliente.',
    inputSchema: z.object({
      collection: z.string().describe('Nombre de la colección a consultar (clients, contracts, opportunities, etc.)'),
      filters: z.array(z.object({
        field: z.string().describe('Nombre del campo a filtrar'),
        operator: z.enum(['equals', 'not_equals', 'contains', 'gt', 'lt', 'gte', 'lte']).describe('Operador de comparación'),
        value: z.any().describe('Valor a comparar'),
      })).optional().describe('Filtros a aplicar sobre los datos'),
      fields: z.array(z.string()).optional().describe('Campos a retornar. Si se omite, retorna todos los campos principales.'),
      sortBy: z.string().optional().describe('Campo por el que ordenar'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenamiento'),
      limit: z.number().optional().describe('Límite de registros (máximo 100)'),
      enrichWithClients: z.boolean().optional().describe('Si es true, agrega el nombre del cliente resolviendo el clientId'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional().describe('Mensaje de error o información'),
      totalCount: z.number().describe('Total de registros encontrados (antes del límite)'),
      data: z.array(z.any()).describe('Registros resultantes'),
      columns: z.array(z.string()).describe('Nombres de las columnas retornadas'),
    }),
  },
  async ({ collection: collName, filters, fields, sortBy, sortDirection, limit, enrichWithClients }) => {
    const ctx = getCtx();

    // 1. Validar que la colección existe
    const moduleName = Object.entries(MODULE_TO_COLLECTION).find(([, v]) => v === collName)?.[0] || collName;
    if (!CRM_COLLECTIONS[collName]) {
      return { success: false, message: `Colección "${collName}" no existe.`, totalCount: 0, data: [], columns: [] };
    }

    // 2. Validar permisos
    if (!userCanViewModule(moduleName)) {
      return { success: false, message: `No tienes permisos para acceder al módulo "${moduleName}".`, totalCount: 0, data: [], columns: [] };
    }

    // 3. Obtener datos con filtros de seguridad
    let data = ctx.collectionsData[collName] || [];
    data = applySecurityFilters(data);

    // 4. Aplicar filtros del usuario
    if (filters && filters.length > 0) {
      data = data.filter((item: any) => {
        return filters.every(f => {
          const val = item[f.field];
          if (val === undefined || val === null) {
            return f.operator === 'not_equals';
          }
          const strVal = String(val).toLowerCase();
          const strFilter = String(f.value || '').toLowerCase();

          switch (f.operator) {
            case 'equals': return strVal === strFilter;
            case 'not_equals': return strVal !== strFilter;
            case 'contains': return strVal.includes(strFilter);
            case 'gt': return Number(val) > Number(f.value);
            case 'lt': return Number(val) < Number(f.value);
            case 'gte': return Number(val) >= Number(f.value);
            case 'lte': return Number(val) <= Number(f.value);
            default: return true;
          }
        });
      });
    }

    const totalCount = data.length;

    // 5. Ordenar
    if (sortBy) {
      data.sort((a: any, b: any) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (valA < valB) return sortDirection === 'desc' ? 1 : -1;
        if (valA > valB) return sortDirection === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // 6. Limitar
    const maxLimit = Math.min(limit || 100, 100);
    data = data.slice(0, maxLimit);

    // 7. Enrich con clientes si se pide
    if (enrichWithClients && collName !== 'clients') {
      const clientsData = ctx.collectionsData['clients'] || [];
      const clientMap = new Map(clientsData.map((c: any) => [c.id, c]));
      data = data.map((item: any) => {
        const client = clientMap.get(item.clientId);
        return { ...item, _clientName: client?.name || 'N/A' };
      });
    }

    // 8. Seleccionar campos
    const schemaFields = Object.keys(CRM_COLLECTIONS[collName].fields);
    const selectedFields = fields && fields.length > 0
      ? fields.filter(f => schemaFields.includes(f) || f === '_clientName' || f === 'id')
      : [...schemaFields.slice(0, 6), 'id']; // Mostrar primeros 6 campos + id por defecto

    const projectedData = data.map((item: any) => {
      const row: any = {};
      for (const f of selectedFields) {
        let val = item[f];
        // Convertir Firestore Timestamps a strings legibles
        if (val && typeof val === 'object' && val.seconds) {
          val = new Date(val.seconds * 1000).toISOString().split('T')[0];
        }
        if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        }
        row[f] = val ?? null;
      }
      return row;
    });

    return {
      success: true,
      totalCount,
      data: projectedData,
      columns: selectedFields,
    };
  }
);

// --- Tool 4: aggregateCollection ---

export const aggregateCollectionTool = ai.defineTool(
  {
    name: 'aggregateCollection',
    description: 'Calcula agregaciones (suma, promedio, conteo) sobre una colección. Los filtros de seguridad se aplican automáticamente. Útil para preguntas como "¿cuántos clientes hay?", "¿cuál es la facturación total?", "¿cuál es el promedio de valor de oportunidades?".',
    inputSchema: z.object({
      collection: z.string().describe('Nombre de la colección'),
      aggregations: z.array(z.object({
        field: z.string().describe('Campo sobre el que agregar'),
        type: z.enum(['sum', 'avg', 'count']).describe('Tipo de agregación'),
        label: z.string().optional().describe('Etiqueta para el resultado'),
      })).describe('Agregaciones a calcular'),
      filters: z.array(z.object({
        field: z.string().describe('Campo a filtrar'),
        operator: z.enum(['equals', 'not_equals', 'contains', 'gt', 'lt', 'gte', 'lte']),
        value: z.any(),
      })).optional().describe('Filtros opcionales'),
      groupBy: z.string().optional().describe('Campo por el que agrupar resultados (ej: sector, status, currency)'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      totalRecords: z.number().describe('Total de registros base para el cálculo'),
      results: z.array(z.any()).describe('Resultados de la agregación'),
      columns: z.array(z.string()).describe('Columnas de los resultados'),
    }),
  },
  async ({ collection: collName, aggregations, filters, groupBy }) => {
    const ctx = getCtx();

    // Validar colección y permisos
    const moduleName = Object.entries(MODULE_TO_COLLECTION).find(([, v]) => v === collName)?.[0] || collName;
    if (!CRM_COLLECTIONS[collName]) {
      return { success: false, message: `Colección "${collName}" no existe.`, totalRecords: 0, results: [], columns: [] };
    }
    if (!userCanViewModule(moduleName)) {
      return { success: false, message: `No tienes permisos para acceder al módulo "${moduleName}".`, totalRecords: 0, results: [], columns: [] };
    }

    let data = ctx.collectionsData[collName] || [];
    data = applySecurityFilters(data);

    // Aplicar filtros
    if (filters && filters.length > 0) {
      data = data.filter((item: any) => {
        return filters.every(f => {
          const val = item[f.field];
          if (val === undefined || val === null) return f.operator === 'not_equals';
          const strVal = String(val).toLowerCase();
          const strFilter = String(f.value || '').toLowerCase();
          switch (f.operator) {
            case 'equals': return strVal === strFilter;
            case 'not_equals': return strVal !== strFilter;
            case 'contains': return strVal.includes(strFilter);
            case 'gt': return Number(val) > Number(f.value);
            case 'lt': return Number(val) < Number(f.value);
            case 'gte': return Number(val) >= Number(f.value);
            case 'lte': return Number(val) <= Number(f.value);
            default: return true;
          }
        });
      });
    }

    const totalRecords = data.length;

    // Agregar
    if (groupBy) {
      const groups = new Map<string, any[]>();
      for (const item of data) {
        const key = String(item[groupBy] ?? 'N/A');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }

      const results: any[] = [];
      const columns = [groupBy];

      for (const [groupKey, items] of groups) {
        const row: any = { [groupBy]: groupKey };
        for (const agg of aggregations) {
          const label = agg.label || `${agg.type}_${agg.field}`;
          columns.push(label);
          if (agg.type === 'count') {
            row[label] = items.length;
          } else {
            const nums = items
              .map((i: any) => i[agg.field])
              .filter((v: any) => v !== undefined && v !== null && !isNaN(Number(v)))
              .map(Number);
            if (agg.type === 'sum') row[label] = nums.reduce((a, b) => a + b, 0);
            else if (agg.type === 'avg') row[label] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
          }
        }
        results.push(row);
      }

      return { success: true, totalRecords, results, columns: [...new Set(columns)] };
    } else {
      // Agregación global (sin groupBy)
      const row: any = {};
      const columns: string[] = [];
      for (const agg of aggregations) {
        const label = agg.label || `${agg.type}_${agg.field}`;
        columns.push(label);
        if (agg.type === 'count') {
          row[label] = data.length;
        } else {
          const nums = data
            .map((i: any) => i[agg.field])
            .filter((v: any) => v !== undefined && v !== null && !isNaN(Number(v)))
            .map(Number);
          if (agg.type === 'sum') row[label] = nums.reduce((a, b) => a + b, 0);
          else if (agg.type === 'avg') row[label] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        }
      }
      return { success: true, totalRecords, results: [row], columns };
    }
  }
);
