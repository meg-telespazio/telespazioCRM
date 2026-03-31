# Análisis de Seguridad: T-Track Sales CRM

Este documento detalla las medidas de seguridad implementadas y los puntos de mejora identificados antes del paso a producción.

## 1. Pilares de Protección Implementados

### 1.1. Autenticación y MFA
*   **Firebase Auth**: Gestión de identidad robusta con hashing de contraseñas manejado por Google.
*   **MFA (Multi-Factor Authentication)**: Soporte para SMS y aplicaciones de autenticación (TOTP).
*   **MFA Enforced**: Lógica de navegación que intercepta al usuario si su perfil exige MFA y aún no lo ha configurado.

### 1.2. Autorización (RBAC)
*   **Firestore Security Rules**: Las reglas validan no solo la autenticación, sino el rol del usuario (`admin`, `gerente`, `ejecutivo`, `ingeniero`).
*   **Aislamiento de Gerencias**: Los datos están filtrados por el campo `management`. Un usuario solo puede acceder a documentos que coincidan con su gerencia asignada.

### 1.3. Seguridad de Datos en Reposo y Tránsito
*   **Encriptación SSL/TLS**: Todo el tráfico entre el cliente y Firebase viaja cifrado.
*   **Firestore**: Los datos se almacenan cifrados en los servidores de Google.

---

## 2. Análisis de Gaps (Riesgos a mitigar)

| Riesgo | Impacto | Descripción | Recomendación |
| :--- | :--- | :--- | :--- |
| **Storage Permisivo** | Alto | La regla catch-all `match /{allPaths=**}` permite que cualquier empleado borre archivos de otros. | Restringir permisos de escritura solo a los creadores o administradores por carpeta. |
| **Manipulación de Contadores** | Medio | Los documentos en `/counters/` tienen permiso de escritura global para usuarios. Un usuario malintencionado podría resetear los IDs. | Mover la lógica de incremento a una Cloud Function o restringir el acceso solo a creación de documentos. |
| **Falta de App Check** | Medio | Las claves de Firebase son públicas en el cliente. Alguien podría atacar la API directamente sin usar la web. | Implementar **Firebase App Check** para asegurar que solo el dominio autorizado pueda hablar con el backend. |
| **Logs de Auditoría** | Bajo | No existe un registro histórico de quién cambió qué valor (ej: quién bajó un precio). | Crear una colección `auditLogs` para acciones críticas como `delete` o cambios de `monthlyFee`. |

---

## 3. Checklist de Producción

1. [ ] **Habilitar Firebase App Check** (Recaptcha Enterprise).
2. [ ] **Restringir API Keys** en la consola de Google Cloud (solo para el dominio de la app).
3. [ ] **Refinar reglas de Storage** para que los archivos de `contracts/` solo sean accesibles por los roles autorizados.
4. [ ] **Configurar Alertas de Presupuesto** en Firebase/GCP para detectar anomalías de uso.
5. [ ] **Revisión de Administrador Global**: Asegurar que solo el email de Mariano Gonzalez tenga el bypass total de reglas en `firestore.rules`.

---
**Estado Actual: Seguro para pruebas internas. Requiere ajustes de reglas para despliegue masivo.**
