/**
 * @fileOverview Schema completo del CRM T-Track para consumo del agente AI.
 * Describe colecciones, campos, tipos, valores enum, relaciones y reglas de seguridad.
 */

export type FieldDef = {
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
  description: string;
  values?: string[];
  aggregatable?: boolean;
  filterable?: boolean;
};

export type CollectionSchema = {
  description: string;
  fields: Record<string, FieldDef>;
  relationships: { target: string; via: string; direction: 'one-to-many' | 'many-to-one' }[];
};

export const CRM_COLLECTIONS: Record<string, CollectionSchema> = {
  clients: {
    description: 'Empresas clientes y prospectos del CRM. Entidad principal del sistema.',
    fields: {
      name:       { type: 'string',  description: 'Nombre comercial', filterable: true },
      legalName:  { type: 'string',  description: 'Razón social' },
      cuit:       { type: 'string',  description: 'Identificador fiscal (CUIT, RUT, CNPJ, etc.)', filterable: true },
      taxIdType:  { type: 'enum',    description: 'Tipo de identificador fiscal', values: ['CUIT','RUT_CL','RUC_PE','CNPJ','RUT_CO','NIT_CR','EIN_US','OTHER'] },
      email:      { type: 'string',  description: 'Email principal' },
      phone:      { type: 'string',  description: 'Teléfono principal' },
      website:    { type: 'string',  description: 'Sitio web' },
      status:     { type: 'enum',    description: 'Estado del cliente', values: ['active','suspended','canceled'], filterable: true },
      type:       { type: 'enum',    description: 'Tipo de registro', values: ['client','prospect'], filterable: true },
      sector:     { type: 'string',  description: 'Sector industria (Finance, Energy, Mining, Agriculture, Telecommunications, Government, etc.)', filterable: true },
      subsector:  { type: 'string',  description: 'Subsector específico', filterable: true },
      holding:    { type: 'string',  description: 'Grupo empresarial al que pertenece', filterable: true },
      countryHQ:  { type: 'string',  description: 'País de la sede central (Argentina, Chile, Colombia, Peru, Brazil, etc.)', filterable: true },
      costCenterId: { type: 'string', description: 'Centro de costo asociado', filterable: true },
      notes:      { type: 'string',  description: 'Notas internas' },
      assignedTo: { type: 'string',  description: 'UID del ejecutivo responsable', filterable: true },
      management: { type: 'enum',    description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
      publicId:   { type: 'string',  description: 'ID público (formato CLI-0000001)' },
      createdAt:  { type: 'date',    description: 'Fecha de creación', filterable: true },
    },
    relationships: [
      { target: 'contacts',      via: 'clientId', direction: 'one-to-many' },
      { target: 'opportunities', via: 'clientId', direction: 'one-to-many' },
      { target: 'contracts',     via: 'clientId', direction: 'one-to-many' },
      { target: 'activities',    via: 'clientId', direction: 'one-to-many' },
      { target: 'locations',     via: 'clientId', direction: 'one-to-many' },
    ],
  },

  contacts: {
    description: 'Personas de contacto vinculadas a un cliente.',
    fields: {
      name:     { type: 'string', description: 'Nombre completo', filterable: true },
      position: { type: 'enum',   description: 'Cargo', values: ['Analyst','CEO','CFO','CIO','CISO','Head','Manager'], filterable: true },
      area:     { type: 'enum',   description: 'Área funcional', values: ['Administration','IT','Legal','Marketing','Procurement','Sales','Supplier Payments'], filterable: true },
      notes:    { type: 'string', description: 'Notas' },
      clientId: { type: 'string', description: 'ID del cliente asociado', filterable: true },
      publicId: { type: 'string', description: 'ID público' },
    },
    relationships: [
      { target: 'clients', via: 'clientId', direction: 'many-to-one' },
    ],
  },

  opportunities: {
    description: 'Oportunidades de negocio (prospección, propuestas, negociaciones).',
    fields: {
      title:          { type: 'string',  description: 'Título de la oportunidad', filterable: true },
      stage:          { type: 'enum',    description: 'Etapa del pipeline', values: ['Prospecting','Proposal','Negotiation','Won','Lost','Canceled','Suspended'], filterable: true },
      value:          { type: 'number',  description: 'Valor monetario de la oportunidad', aggregatable: true, filterable: true },
      currency:       { type: 'string',  description: 'Moneda (USD, ARS, BRL, etc.)', filterable: true },
      probability:    { type: 'number',  description: 'Probabilidad de cierre (0-100)', aggregatable: true, filterable: true },
      closeDate:      { type: 'date',    description: 'Fecha estimada de cierre', filterable: true },
      requestDate:    { type: 'date',    description: 'Fecha de solicitud', filterable: true },
      risk:           { type: 'enum',    description: 'Nivel de riesgo', values: ['C-Low','B-Medium','A-High'], filterable: true },
      opportunityType:{ type: 'enum',    description: 'Tipo de oportunidad', values: ['New Logo','New Business','Ampliacion','Renegociacion','Renovaciones'], filterable: true },
      isPlanned:      { type: 'boolean', description: 'Si está planificada', filterable: true },
      isTender:       { type: 'boolean', description: 'Si es licitación', filterable: true },
      contractMonths: { type: 'number',  description: 'Duración del contrato en meses (12, 24 o 36)', filterable: true },
      grossMarginPercentage: { type: 'number', description: 'Porcentaje de margen bruto', aggregatable: true },
      grossMarginAmount:     { type: 'number', description: 'Monto de margen bruto', aggregatable: true },
      clientId:       { type: 'string',  description: 'ID del cliente', filterable: true },
      publicId:       { type: 'string',  description: 'ID público' },
      assignedTo:     { type: 'string',  description: 'UID del ejecutivo responsable', filterable: true },
      management:     { type: 'enum',    description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
      createdAt:      { type: 'date',    description: 'Fecha de creación', filterable: true },
    },
    relationships: [
      { target: 'clients', via: 'clientId', direction: 'many-to-one' },
    ],
  },

  contracts: {
    description: 'Contratos firmados con clientes.',
    fields: {
      publicId:      { type: 'string',  description: 'Identificador público del contrato', filterable: true },
      type:          { type: 'enum',    description: 'Tipo de contrato', values: ['Acuerdo Marco','Locación de Servicios','Compraventa','Locación de Equipos','Comodato de Equipos'], filterable: true },
      status:        { type: 'enum',    description: 'Estado', values: ['activo','vencido','renovado','renovado automatico'], filterable: true },
      amount:        { type: 'number',  description: 'Monto del contrato', aggregatable: true, filterable: true },
      currency:      { type: 'string',  description: 'Moneda', filterable: true },
      startDate:     { type: 'date',    description: 'Fecha de inicio', filterable: true },
      endDate:       { type: 'date',    description: 'Fecha de fin', filterable: true },
      durationMonths:{ type: 'number',  description: 'Duración en meses', filterable: true },
      autoRenews:    { type: 'boolean', description: 'Si se renueva automáticamente', filterable: true },
      renewalTerm:   { type: 'enum',    description: 'Plazo de renovación', values: ['1 month','2 months','3 months','12 months'] },
      country:       { type: 'string',  description: 'País del contrato', filterable: true },
      costCenterId:  { type: 'string',  description: 'Centro de costo', filterable: true },
      clientId:      { type: 'string',  description: 'ID del cliente', filterable: true },
      assignedTo:    { type: 'string',  description: 'UID del ejecutivo responsable', filterable: true },
      management:    { type: 'enum',    description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
      createdAt:     { type: 'date',    description: 'Fecha de creación', filterable: true },
    },
    relationships: [
      { target: 'clients',        via: 'clientId',   direction: 'many-to-one' },
      { target: 'purchaseOrders', via: 'contractId', direction: 'one-to-many' },
    ],
  },

  purchaseOrders: {
    description: 'Órdenes de compra asociadas a contratos.',
    fields: {
      poNumber:            { type: 'string',  description: 'Número de referencia de la OC', filterable: true },
      amount:              { type: 'number',  description: 'Monto', aggregatable: true, filterable: true },
      currency:            { type: 'string',  description: 'Moneda', filterable: true },
      status:              { type: 'enum',    description: 'Estado', values: ['pending','approved','canceled','received'], filterable: true },
      emissionDate:        { type: 'date',    description: 'Fecha de emisión', filterable: true },
      contractId:          { type: 'string',  description: 'ID del contrato asociado', filterable: true },
      idContractStarfleet: { type: 'string',  description: 'ID Starfleet del contrato' },
      idClientStarfleet:   { type: 'string',  description: 'ID Starfleet del cliente' },
      assignedTo:          { type: 'string',  description: 'UID del ejecutivo responsable', filterable: true },
      management:          { type: 'enum',    description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
    },
    relationships: [
      { target: 'contracts', via: 'contractId', direction: 'many-to-one' },
      { target: 'services',  via: 'poId',       direction: 'one-to-many' },
    ],
  },

  services: {
    description: 'Servicios activos vinculados a una orden de compra y equipo.',
    fields: {
      serviceNickname:       { type: 'string',  description: 'Apodo/nombre del servicio', filterable: true },
      serviceLineNumber:     { type: 'string',  description: 'Número de línea de servicio', filterable: true },
      servicePlan:           { type: 'string',  description: 'Plan de servicio contratado', filterable: true },
      monthlyFee:            { type: 'number',  description: 'Tarifa mensual', aggregatable: true, filterable: true },
      currency:              { type: 'string',  description: 'Moneda de la tarifa', filterable: true },
      serviceAllocationGb:   { type: 'number',  description: 'Asignación de datos en GB', aggregatable: true },
      partnerName:           { type: 'string',  description: 'Nombre del partner', filterable: true },
      customerName:          { type: 'string',  description: 'Nombre del cliente', filterable: true },
      status:                { type: 'enum',    description: 'Estado del servicio', values: ['active','paused','canceled'], filterable: true },
      isTelespazioOwned:     { type: 'boolean', description: 'Si es propiedad de Telespazio', filterable: true },
      poId:                  { type: 'string',  description: 'ID de la orden de compra', filterable: true },
      equipmentId:           { type: 'string',  description: 'ID del equipo asociado', filterable: true },
      activationDate:        { type: 'date',    description: 'Fecha de activación', filterable: true },
      assignedTo:            { type: 'string',  description: 'UID del ejecutivo responsable', filterable: true },
      management:            { type: 'enum',    description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
    },
    relationships: [
      { target: 'purchaseOrders', via: 'poId',        direction: 'many-to-one' },
      { target: 'equipment',      via: 'equipmentId', direction: 'many-to-one' },
    ],
  },

  equipment: {
    description: 'Equipos/terminales satelitales.',
    fields: {
      userTerminal:    { type: 'string',  description: 'Identificador/serial del terminal', filterable: true },
      type:            { type: 'string',  description: 'Tipo de equipo', filterable: true },
      physicalStatus:  { type: 'enum',    description: 'Estado físico', values: ['Activa','En reparación','Retirada'], filterable: true },
      installationDate:{ type: 'date',    description: 'Fecha de instalación', filterable: true },
      isClientOwned:   { type: 'boolean', description: 'Si es propiedad del cliente', filterable: true },
      comodatoFee:     { type: 'number',  description: 'Tarifa de comodato', aggregatable: true },
      latitude:        { type: 'number',  description: 'Latitud de ubicación' },
      longitude:       { type: 'number',  description: 'Longitud de ubicación' },
    },
    relationships: [],
  },

  activities: {
    description: 'Actividades comerciales (llamadas, reuniones, emails, mensajes).',
    fields: {
      type:        { type: 'enum',    description: 'Tipo de actividad', values: ['call','meeting','email','message'], filterable: true },
      description: { type: 'string',  description: 'Descripción de la actividad', filterable: true },
      isPriority:  { type: 'boolean', description: 'Si es prioritaria', filterable: true },
      dueDate:     { type: 'date',    description: 'Fecha de vencimiento', filterable: true },
      clientId:    { type: 'string',  description: 'ID del cliente', filterable: true },
      publicId:    { type: 'string',  description: 'ID público' },
      assignedTo:  { type: 'string',  description: 'UID del ejecutivo responsable', filterable: true },
      management:  { type: 'enum',    description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
      createdAt:   { type: 'date',    description: 'Fecha de creación', filterable: true },
    },
    relationships: [
      { target: 'clients', via: 'clientId', direction: 'many-to-one' },
    ],
  },

  locations: {
    description: 'Ubicaciones físicas (sucursales, oficinas, sitios) de los clientes.',
    fields: {
      name:         { type: 'string', description: 'Nombre de la ubicación', filterable: true },
      type:         { type: 'enum',   description: 'Tipo de ubicación', values: ['branch','headquarters','warehouse','office','property','field'], filterable: true },
      status:       { type: 'enum',   description: 'Estado', values: ['active','suspended'], filterable: true },
      city:         { type: 'string', description: 'Ciudad', filterable: true },
      province:     { type: 'string', description: 'Provincia/Estado', filterable: true },
      country:      { type: 'string', description: 'País', filterable: true },
      streetName:   { type: 'string', description: 'Calle' },
      streetNumber: { type: 'string', description: 'Número' },
      postalCode:   { type: 'string', description: 'Código postal' },
      clientId:     { type: 'string', description: 'ID del cliente', filterable: true },
      publicId:     { type: 'string', description: 'ID público' },
      assignedTo:   { type: 'string', description: 'UID del ejecutivo responsable', filterable: true },
      management:   { type: 'enum',   description: 'Gerencia', values: ['Satellite Communications','GeoInformacion'], filterable: true },
    },
    relationships: [
      { target: 'clients', via: 'clientId', direction: 'many-to-one' },
    ],
  },

  productsAndServices: {
    description: 'Catálogo de productos y servicios ofrecidos por Telespazio.',
    fields: {
      name:           { type: 'string',  description: 'Nombre del producto/servicio', filterable: true },
      type:           { type: 'enum',    description: 'Tipo', values: ['product','service','bundle'], filterable: true },
      status:         { type: 'enum',    description: 'Estado', values: ['active','inactive'], filterable: true },
      oneTimeCharge:  { type: 'number',  description: 'Cargo único (NRC)', aggregatable: true },
      recurringCharge:{ type: 'number',  description: 'Cargo recurrente (MRC)', aggregatable: true },
      currency:       { type: 'string',  description: 'Moneda' },
      description:    { type: 'string',  description: 'Descripción del ítem' },
    },
    relationships: [],
  },
};

/**
 * Módulos del CRM y su mapeo a colecciones para validación de permisos.
 * La clave es el nombre del módulo en la permissionsMatrix, el valor es la colección.
 */
export const MODULE_TO_COLLECTION: Record<string, string> = {
  clients: 'clients',
  contacts: 'contacts',
  opportunities: 'opportunities',
  contracts: 'contracts',
  purchaseOrders: 'purchaseOrders',
  services: 'services',
  equipment: 'equipment',
  activities: 'activities',
  locations: 'locations',
  catalog: 'productsAndServices',
};

/**
 * Genera un string de contexto legible para el LLM a partir del schema.
 */
export function generateSchemaContext(): string {
  const lines: string[] = ['SCHEMA DE LA BASE DE DATOS DEL CRM:\n'];

  for (const [collName, schema] of Object.entries(CRM_COLLECTIONS)) {
    lines.push(`## ${collName}`);
    lines.push(`Descripción: ${schema.description}`);
    lines.push('Campos:');
    for (const [fieldName, field] of Object.entries(schema.fields)) {
      let line = `  - ${fieldName} (${field.type}): ${field.description}`;
      if (field.values) line += ` | Valores: [${field.values.join(', ')}]`;
      if (field.aggregatable) line += ' | AGREGABLE (sum/avg)';
      lines.push(line);
    }
    if (schema.relationships.length > 0) {
      lines.push('Relaciones:');
      for (const rel of schema.relationships) {
        lines.push(`  → ${rel.target} via campo "${rel.via}" (${rel.direction})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
