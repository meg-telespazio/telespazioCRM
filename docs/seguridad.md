
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

| Riesgo | Impacto | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Storage Permisivo** | Alto | La regla catch-all permitía acceso total. | **MITIGADO**: Ahora requiere validación de gerencia vía Firestore. |
| **Manipulación de Contadores** | Medio | Escritura global permitía resetear IDs. | **MITIGADO**: Restringido a Admin y operaciones de incremento controladas. |
| **Falta de App Check** | Medio | Las claves de Firebase son públicas en el cliente. | Pendiente (Requiere configuración en Consola Google Cloud). |
| **Logs de Auditoría** | Bajo | No existe un registro histórico de quién cambió qué valor. | **MITIGADO**: Implementado sistema de registro en `/auditLogs`. |
| **Bypass Administrador** | Crítico | Asegurar que el bypass total esté restringido por email. | **MITIGADO**: Diferenciación entre SuperAdmin (Email) y Admin (Rol). |

---

## 3. Checklist de Producción

1. [ ] **Habilitar Firebase App Check** (Recaptcha Enterprise).
2. [ ] **Restringir API Keys** en la consola de Google Cloud (solo para el dominio de la app).
3. [x] **Refinar reglas de Storage** para que los archivos solo sean accesibles por los roles autorizados.
4. [ ] **Configurar Alertas de Presupuesto** en Firebase/GCP para detectar anomalías de uso.
5. [x] **Revisión de Administrador Global**: Bypass total de reglas restringido por email.

---
**Estado Actual: Sistema de auditoría activo y jerarquía de administración refinada. Próximo paso: App Check.**
