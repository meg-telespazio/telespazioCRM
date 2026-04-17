
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

## 🛠️ Comandos de Terminal (Git)

Para mantener tu código sincronizado con GitHub, usa estos comandos en tu terminal:

### Bajar la última versión de GitHub
```bash
git pull origin main
```

### Subir tus cambios locales a GitHub
```bash
git add .
git commit -m "Descripción de tus cambios"
git push origin main
```

### 🆘 Solución a Errores Comunes

#### Error: fatal: Need to specify how to reconcile divergent branches
Este error ocurre cuando Git no sabe si debe mezclar (merge) o sobreescribir (rebase) los cambios. 
**Solución:**
1. Ejecuta: `git config pull.rebase false`
2. Luego ejecuta: `git pull origin main`

#### Error: [rejected] main -> main (fetch first)
Este error significa que hay cambios en GitHub que no tienes localmente.
1. Ejecuta: `git pull origin main`
2. Si hay conflictos, resuélvelos en los archivos, guarda y haz commit.
3. Vuelve a intentar: `git push origin main`

#### Error de Autenticación (PAT)
Si la terminal te pide contraseña y falla, recuerda que debes usar un **Personal Access Token**:
1. Genera un **Token (Classic)** en GitHub (Settings > Developer Settings).
2. Dale permisos de `repo`.
3. Úsalo como contraseña cuando la terminal te lo solicite.

---

## 📦 Despliegue en Vercel

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

---
Desarrollado para **Telespazio Argentina**.
