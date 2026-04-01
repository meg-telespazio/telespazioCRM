
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
*   **CSP (Content Security Policy)**: Implementada en headers de servidor para mitigar ataques XSS y controlar orígenes de datos externos.
*   **Trusted Types**: Implementado vía CSP para prevenir ataques XSS basados en DOM mediante la validación de escrituras en el DOM.
*   **Frame Protection**: Implementación de `frame-ancestors 'none'` y `X-Frame-Options: DENY` para prevenir ataques de Clickjacking.
*   **Protección MIME (nosniff)**: Implementación de `X-Content-Type-Options: nosniff` para prevenir que el navegador ejecute scripts camuflados en otros tipos de archivos.
*   **Permissions Policy**: Restricción de acceso a hardware y APIs del navegador (cámara, micrófono, geolocalización) para reducir la superficie de ataque y proteger la privacidad.
*   **CORS Policy**: Configuración estricta de cabeceras `Access-Control` para gestionar el intercambio de recursos entre orígenes de forma segura.
*   **Anti-CSRF Strategy**:
    *   **Stateless Auth**: El uso del SDK de Firebase evita la dependencia de cookies de sesión ambientales, utilizando ID Tokens que no se adjuntan automáticamente en ataques CSRF.
    *   **Server Actions Guard**: Las funciones de servidor de Next.js validan los encabezados de origen por defecto.
    *   **Integrity Check**: Desafío matemático dinámico en formularios públicos para prevenir automatización y falsificación de peticiones.
*   **Origin Isolation (COOP & CORP)**: 
    *   **COOP (same-origin)**: Aísla el contexto de navegación para prevenir ataques de canal lateral.
    *   **CORP (same-origin)**: Asegura que los recursos del sitio no sean incrustados por terceros maliciosos.

---

## 2. Análisis de Gaps (Riesgos a mitigar)

| Riesgo | Impacto | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Clickjacking** | Medio | Posibilidad de incrustar la app en un iframe malicioso. | **MITIGADO**: Política de frames restrictiva aplicada. |
| **Inyección XSS** | Medio | Posibilidad de ejecutar scripts maliciosos vía inputs. | **MITIGADO**: Política CSP estricta aplicada en `next.config.ts`. |
| **XSS basado en DOM** | Medio | Ejecución de scripts mediante manipulación de sinks del DOM. | **MITIGADO**: Trusted Types aplicado en la cabecera CSP. |
| **MIME-sniffing** | Bajo | El navegador podría interpretar archivos de datos como scripts ejecutables. | **MITIGADO**: Header `nosniff` configurado globalmente. |
| **Acceso a Hardware** | Bajo | Acceso no autorizado a cámara o micrófono del usuario. | **MITIGADO**: Permissions-Policy desactiva estas funciones. |
| **CORS Misconfiguration** | Medio | Permisos excesivos para que otros sitios lean datos de la app. | **MITIGADO**: Cabeceras ACAC, ACAH, ACAO, ACAEH y ACAMA configuradas. |
| **CSRF** | Medio | Falsificación de peticiones en nombre del usuario. | **MITIGADO**: Arquitectura basada en tokens y protección de Server Actions. |
| **Aislamiento de Origen** | Bajo | Fuga de información a través de ventanas abiertas o recursos compartidos. | **MITIGADO**: COOP y CORP configurados como `same-origin`. |
| **Storage Permisivo** | Alto | La regla catch-all permitía acceso total. | **MITIGADO**: Ahora requiere validación de gerencia vía Firestore. |
| **Falta de App Check** | Medio | Las claves de Firebase son públicas en el cliente. | **MITIGADO**: Infraestructura de App Check inicializada en el código. |
| **Logs de Auditoría** | Bajo | No existe un registro histórico de quién cambió qué valor. | **MITIGADO**: Implementado sistema de registro inmutable en `/auditLogs`. |

---

## 3. Checklist de Producción

1. [x] **Habilitar Firebase App Check** (Recaptcha Enterprise) en la consola de Firebase.
2. [ ] **Restringir API Keys** en la consola de Google Cloud (solo para el dominio de la app).
3. [x] **Configurar Política CSP y Frames** en el servidor de producción.
4. [x] **Habilitar Trusted Types** en la política CSP.
5. [x] **Activar protección contra MIME-sniffing (nosniff)**.
6. [x] **Configurar Permissions-Policy** para desactivar hardware no necesario.
7. [x] **Establecer cabeceras CORS** (ACAO debe ser el dominio final, no `*`).
8. [x] **Activar Aislamiento de Origen (COOP y CORP)**.
9. [x] **Refinar reglas de Storage** para que los archivos solo sean accesibles por los roles autorizados.
10. [x] **Configurar Alertas de Presupuesto** en la consola de Facturación de Google Cloud.

---

## 4. Notas Técnicas sobre COEP
Se ha decidido **no activar** `Cross-Origin-Embedder-Policy: require-corp` por el momento. Dado que la aplicación consume recursos externos como mapas (OpenStreetMap) e imágenes de terceros que no siempre proporcionan cabeceras CORP, activar esta política bloquearía dichas funcionalidades. Se prioriza la disponibilidad del servicio manteniendo otras capas de seguridad robustas (CSP y COOP).

---
**Estado Actual: Sistema de auditoría activo, protección contra clickjacking, MIME-sniffing, CORS, CSRF y aislamiento de origen habilitada. El CRM cumple con estándares de seguridad de nivel corporativo.**
