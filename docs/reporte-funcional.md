# Reporte Funcional T-Track CRM - Telespazio Argentina

Este documento detalla las funcionalidades operativas implementadas en el sistema hasta la fecha.

## 1. Seguridad y Acceso
- **Autenticación Robusta**: Acceso mediante email y contraseña con validaciones de complejidad.
- **Doble Factor de Autenticación (MFA)**: 
    - Soporte para **SMS** y **App de Autenticador** (TOTP).
    - Configuración obligatoria configurable por el administrador para cada usuario.
    - Bloqueo de navegación global si el MFA es obligatorio pero no ha sido configurado.
- **Control de Sesión**: Cierre de sesión automático tras 15 minutos de inactividad con aviso previo de 60 segundos.
- **Roles y Permisos (RBAC)**: 
    - **Admin**: Acceso total, gestión de usuarios y variables del sistema.
    - **Gerente**: Supervisión de toda su gerencia (SatCom o GeoInfo).
    - **Ejecutivo**: Gestión de sus propios clientes y negocios.
    - **Ingeniero**: Consulta de datos técnicos y clientes de su gerencia (sin acceso a datos financieros sensibles como montos de contratos).

## 2. Gestión Comercial (Ventas)
- **Directorio de Clientes**: 
    - Registro con Sector/Subsector, País de Casa Matriz (HQ) y Grupo Económico (Holding).
    - **Buscador de Logos Inteligente**: Utiliza IA para encontrar el logo de la empresa mediante su URL web.
    - **Vista 360°**: Resumen financiero, documentos, contactos y servicios activos en una sola pantalla.
- **Embudo de Oportunidades**: 
    - Cálculo automático de **FCV (Full Contract Value)** basado en cargos únicos (NRC) y recurrentes (MRC).
    - Gestión de ítems de línea desde un catálogo centralizado.
    - **Generador de Propuestas**: Creación de propuestas comerciales en PDF con diseño institucional de Telespazio.
    - Seguimiento de competencia y motivos de pérdida/cancelación.

## 3. Gestión de Contratos y Operaciones
- **Contratos**: 
    - Clasificación por tipo (Acuerdo Marco, Locación, etc.).
    - Control de renovaciones automáticas y plazos de preaviso.
    - **Historial de Adendas**: Registro de modificaciones firmadas sin alterar el contrato original.
    - **Lista de Precios Específica**: Definición de precios acordados por contrato para planes de Starlink y otros servicios.
- **Órdenes de Compra (PO)**: Vinculación directa con contratos para el seguimiento de la ejecución presupuestaria.
- **Servicios (Base Instalada)**: 
    - Gestión masiva de abonos y líneas.
    - **Edición Rápida**: Actualización de precios directamente desde la tabla.
    - **Acciones Masivas**: Cambio de planes, precios o POs para múltiples servicios a la vez.

## 4. Logística e Inventario Técnico
- **Inventario de Equipos**: Seguimiento por ID de Terminal (UUID) y Serial.
- **Estado Físico**: Control de equipos activos, en reparación o retirados.
- **Geolocalización**: Mapa dinámico (Leaflet) que muestra la ubicación exacta de las terminales y bases operativas de los clientes.

## 5. Inteligencia de Negocio y Reportes
- **Dashboard Financiero**: 
    - KPIs en tiempo real (Revenue Total, Tasa de Cierre).
    - Gráfico de proyección de ingresos anual.
    - **Multimoneda Dinámica**: Conversión instantánea de todos los montos del dashboard a USD, EUR o ARS según la selección del usuario.
- **Constructor de Reportes**: 
    - Herramienta manual para crear informes personalizados.
    - Soporte para **Joins automáticos** (ej: ver campos de clientes en un reporte de servicios).
    - Agregaciones (SUM, AVG, COUNT) y agrupamiento por cualquier campo.
    - Exportación de resultados a CSV para análisis externo.

## 6. Colaboración y Seguimiento
- **Registro de Actividades**: Timeline de interacciones (llamadas, reuniones, correos).
- **Menciones (@)**: Capacidad de mencionar a miembros del equipo o contactos en los comentarios.
- **Seguimientos (Follow-ups)**: Hilos de conversación dentro de cada actividad registrada.

## 7. Configuración del Sistema
- **Variables Dinámicas**: Gestión de Sectores, Gerencias y Unidades de Medida.
- **Gestión de Usuarios**: El administrador puede crear nuevos usuarios y asignarles roles/gerencias.
- **Sincronización de Divisas**: Actualización automática de tipos de cambio (ARS vs USD) mediante integración con API externa.
- **Gestión de Archivos**: Almacenamiento seguro de contratos y documentos adjuntos en Firebase Storage.
