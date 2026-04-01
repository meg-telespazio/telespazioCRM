
# Análisis de Seguridad: T-Track Sales CRM

Este documento detalla las medidas de seguridad implementadas y los puntos de mejora identificados antes del paso a producción.

## 1. Pilares de Protección Implementados

### 1.1. Autenticación y MFA
*   **Firebase Auth**: Gestión de identidad robusta con hashing de contraseñas manejado por Google.
*   **MFA (Multi-Factor Authentication)**: Soporte para SMS y aplicaciones de autenticación (TOTP).
*   **MFA Enforced**: Lógica de navegación que intercepta al usuario si su perfil exige MFA y aún no lo ha configurado.

### 1.2. Autorización (RBAC)
*   **Firestore Security Rules**: Las reglas validan no solo la autenticación, sino el rol del usuario (`admin`, `gerente`, `ejecutivo`, `ingeniero`).
*   **Aislamiento por Gerencias**: Los datos están filtrados por el campo `management`. Un usuario solo puede acceder a documentos que coincidan con su gerencia asignada.
*   **Jerarquía de Borrado**: Se ha restringido la eliminación de registros críticos (Clientes, Contratos, Oportunidades) únicamente a perfiles de Gerencia o Administración.

### 1.3. Seguridad de Datos en Reposo y Tránsito
*   **Encriptación SSL/TLS**: Todo el tráfico entre el cliente y Firebase viaja cifrado.
*   **Firestore**: Los datos se almacenan cifrados en los servidores de Google.

---

## 2. Análisis de Gaps (Riesgos a mitigar)

| Riesgo | Impacto | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Storage Permisivo** | Alto | La regla catch-all permitía acceso total. | **MITIGADO**: Ahora requiere validación de gerencia vía Firestore. |
| **Manipulación de Contadores** | Medio | Escritura global permitía resetear IDs. | **MITIGADO**: Restringido a Admin y operaciones de incremento controladas. |
| **Falta de App Check** | Medio | Las claves de Firebase son públicas en el cliente. | **MITIGADO**: Infraestructura de App Check inicializada en el código. |
| **Logs de Auditoría** | Bajo | No existe un registro histórico de quién cambió qué valor. | **MITIGADO**: Implementado sistema de registro inmutable en `/auditLogs`. |
| **Bypass Administrador** | Crítico | Asegurar que el bypass total esté restringido por email. | **MITIGADO**: Diferenciación entre SuperAdmin (Email) y Admin (Rol). |
| **Alertas de Presupuesto** | Medio | Excesos accidentales en facturación de Firebase. | **MITIGADO**: Seguimiento de ejecución comercial en App y Guía de GCP añadida. |

---

## 3. Checklist de Producción

1. [x] **Habilitar Firebase App Check** (Recaptcha Enterprise) en la consola de Firebase.
2. [ ] **Restringir API Keys** en la consola de Google Cloud (solo para el dominio de la app).
3. [x] **Refinar reglas de Storage** para que los archivos solo sean accesibles por los roles autorizados.
4. [x] **Configurar Alertas de Presupuesto** en la consola de Facturación de Google Cloud.
5. [x] **Revisión de Administrador Global**: Bypass total de reglas restringido por email específico.

---

## 4. Guía de Configuración: Alertas de Presupuesto (Billing)

Para evitar sorpresas en la facturación de Google Cloud/Firebase, sigue estos pasos:

1.  Accede a la [Consola de Facturación de Google Cloud](https://console.cloud.google.com/billing).
2.  En el menú lateral, selecciona **Presupuestos y alertas**.
3.  Haz clic en **Crear presupuesto**.
4.  **Nombre**: "Alerta CRM Telespazio".
5.  **Alcance**: Selecciona tu proyecto actual.
6.  **Importe**: Elige "Especificado" y pon un valor mensual (ej: 10 USD).
7.  **Acciones**: Configura umbrales al 50%, 90% y 100%.
8.  **Notificaciones**: Asegúrate de que tu correo esté seleccionado para recibir los emails.

*Nota: La aplicación también implementa alertas de ejecución presupuestaria para contratos (PO vs Monto), pero estas son independientes de la facturación del servicio en la nube.*

---
**Estado Actual: Sistema de auditoría activo, jerarquía de administración refinada y App Check inicializado. La app está lista para pruebas de estrés de seguridad.**
