# T-Track Sales CRM - Telespazio

Sistema integral de gestión de relaciones con clientes (CRM) diseñado específicamente para las necesidades de Telespazio, con soporte para múltiples gerencias (SatComs y GeoInfo) y gestión financiera multimoneda.

## 🚀 Características Principales

- **Dashboard Financiero**: Visualización de KPIs, proyecciones de ingresos y gráficos de embudo con conversión de moneda en tiempo real.
- **Gestión de Clientes y Contactos**: Directorio centralizado con seguimiento de responsables y países de origen (HQ).
- **Seguridad Avanzada**:
  - Autenticación de Doble Factor (MFA) vía SMS y App (TOTP).
  - MFA Obligatorio configurable por el administrador.
  - Protección de documentos mediante reglas de Storage por gerencia.
- **Ciclo de Ventas Completo**: Oportunidades, Contratos, POs y Servicios.
- **Logística e Inventario**: Gestión de Kits (Equipos) y Locaciones mapeadas.

## 🛠️ Despliegue en Vercel

Para que el proyecto funcione en Vercel, debes configurar las siguientes **Environment Variables**:

### 1. Variables de Firebase
Obtén estos valores en la Consola de Firebase > Configuración del Proyecto > General > Tus Apps (Web App):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 2. Variable de IA (Genkit)
Necesaria para el buscador de logos y reportes inteligentes. Obtén tu clave en [Google AI Studio](https://aistudio.google.com/):
- `GOOGLE_GENAI_API_KEY`

### 3. Seguridad (Opcional para Dev, Recomendado para Prod)
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: Clave de sitio para Firebase App Check (reCAPTCHA Enterprise).

---

## 📦 Instrucciones para GitHub

Para vincular este proyecto con el repositorio de Telespazio, abre una terminal en la carpeta del proyecto y ejecuta:

### Opción A: Si es la primera vez que subes el código
```bash
git init
git add .
git commit -m "Initial commit: Sistema CRM T-Track completo con endurecimiento de seguridad"
git remote add origin https://github.com/meg-telespazio/telespazioCRM.git
git branch -M main
git push -u origin main
```

---
Desarrollado para **Telespazio Argentina**.
