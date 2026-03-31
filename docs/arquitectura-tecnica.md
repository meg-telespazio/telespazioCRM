# Documentación Técnica y Arquitectura: T-Track Sales CRM

## 1. Visión General
T-Track Sales CRM es una plataforma integral diseñada para la gestión comercial de **Telespazio Argentina**. El sistema centraliza el ciclo de vida del cliente, desde la prospección de oportunidades hasta la gestión de la base instalada (servicios) y activos (equipos), con un fuerte enfoque en la integridad financiera multimoneda y la seguridad de acceso.

---

## 2. Stack Tecnológico
El proyecto utiliza un stack moderno de alto rendimiento:

*   **Frontend**: [Next.js 15+](https://nextjs.org/) utilizando el **App Router** para una navegación eficiente y SSR (Server Side Rendering).
*   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) para garantizar la robustez mediante tipado estático.
*   **Interfaz de Usuario**: [React](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/) + [ShadCN UI](https://ui.shadcn.com/) para componentes estéticos y accesibles.
*   **Backend & Infraestructura (Firebase)**:
    *   **Firestore**: Base de datos NoSQL en tiempo real para persistencia de datos.
    *   **Firebase Auth**: Gestión de identidades con soporte para MFA (Multi-Factor Authentication).
    *   **Firebase Storage**: Almacenamiento de documentación crítica (Contratos, Órdenes de Compra).
    *   **App Hosting**: Despliegue optimizado para aplicaciones Next.js.
*   **Inteligencia Artificial**: [Genkit](https://firebase.google.com/docs/genkit) para procesos de automatización como el buscador de logos corporativos y generación de reportes inteligentes.
*   **Librerías Clave**:
    *   **jsPDF & html2canvas**: Generación dinámica de propuestas comerciales en PDF.
    *   **Recharts**: Visualización de KPIs financieros y proyecciones.
    *   **Leaflet**: Mapeo y geolocalización de activos en tiempo real.

---

## 3. Arquitectura del Sistema

### 3.1. Modelo de Datos (Firestore)
La base de datos se organiza en colecciones jerárquicas y transversales:

1.  **Users**: Perfiles con roles (Admin, Gerente, Ejecutivo, Ingeniero) y segmentación por Gerencia (SatCom / GeoInfo).
2.  **Clients**: Entidades principales vinculadas a Holdings y Centros de Costo.
3.  **Opportunities**: Gestión de deals con desglose de ítems (NRC/MRC), cálculo automático de FCV y márgenes brutos.
4.  **Contracts**: Contratos legales con soporte para adendas, anexos y listas de precios específicas.
5.  **Purchase Orders (PO)**: Documentos de compra que actúan como puente entre contratos y servicios.
6.  **Services**: Base instalada vinculada a una PO y a un equipo físico.
7.  **Equipment**: Inventario de activos (Kits) identificados por UUID y Serial con estado físico.
8.  **Activities**: Timeline de interacciones con soporte para menciones (@) y seguimientos.

### 3.2. Seguridad y Permisos (RBAC)
El acceso está protegido por **Firestore Security Rules**, aplicando las siguientes lógicas:
*   **Segmentación por Gerencia**: Los usuarios (excepto Admin) solo ven datos pertenecientes a su gerencia.
*   **Roles**:
    *   *Ejecutivo*: Gestiona sus propios clientes y negocios.
    *   *Ingeniero*: Acceso a datos técnicos y ubicaciones, sin acceso a montos financieros sensibles.
    *   *Gerente*: Supervisión total de su área.
*   **MFA Obligatorio**: Control de navegación global que bloquea el sistema si el usuario no ha configurado el Doble Factor cuando es requerido.

---

## 4. Funcionalidades Destacadas

### 4.1. Motor Financiero
*   **Conversión Dinámica**: El sistema integra con `DolarAPI` para obtener cotizaciones diarias.
*   **Dashboard Multimoneda**: Visualización de ingresos proyectados en USD, EUR o ARS con un clic.
*   **Cálculo de FCV**: Algoritmo que procesa cargos fijos y recurrentes sobre la duración del contrato.

### 4.2. Generador de Propuestas
Módulo que traduce una Oportunidad en un documento PDF profesional con diseño institucional, incluyendo tablas de ítems, términos legales y firma del ejecutivo, optimizado para bajo peso de archivo.

### 4.3. Constructor de Reportes
Interfaz visual que permite a los usuarios crear consultas personalizadas, aplicar filtros avanzados y exportar resultados a CSV, eliminando la dependencia de IT para la obtención de datos.

---

## 5. Mantenimiento y Extensibilidad
*   **Traducciones (i18n)**: Sistema centralizado de idiomas en `src/lib/translations.ts`.
*   **Configuraciones Globales**: Colección `systemConfig` que permite actualizar sectores, monedas y centros de costo sin tocar el código.
*   **Git Flow**: El proyecto está preparado para integración continua mediante GitHub y despliegue en Vercel o Firebase App Hosting.

---
**Desarrollado para Telespazio Argentina - 2025**