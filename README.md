# T-Track Sales CRM - Telespazio

Sistema integral de gestión de relaciones con clientes (CRM) diseñado específicamente para las necesidades de Telespazio, con soporte para múltiples gerencias (SatComs y GeoInfo) y gestión financiera multimoneda.

## 🚀 Características Principales

- **Dashboard Financiero**: Visualización de KPIs, proyecciones de ingresos y gráficos de embudo con conversión de moneda en tiempo real.
- **Gestión de Clientes y Contactos**: Directorio centralizado con seguimiento de responsables y países de origen (HQ).
- **Ciclo de Ventas Completo**: 
  - Gestión de Oportunidades con cálculo de FCV automático.
  - Generación de Propuestas Comerciales en PDF.
  - Gestión de Contratos con Adendas e historial de modificaciones.
  - Órdenes de Compra vinculadas.
- **Base Instalada y Logística**:
  - Inventario de Equipos (UUID/Terminal).
  - Gestión de Servicios activos.
  - Mapas dinámicos de locaciones mediante Leaflet.
- **Seguridad Avanzada**:
  - Autenticación de Doble Factor (MFA) vía SMS y App (TOTP).
  - Control de accesos por Roles (Admin, Gerente, Ejecutivo, Ingeniero).
  - MFA Obligatorio configurable por el administrador.
- **Reportes Inteligentes**: Constructor de reportes manuales y con asistencia de IA.

## 🛠️ Tecnologías

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos & Auth**: Firebase (Firestore, Auth, Storage)
- **Estilos**: Tailwind CSS + ShadCN UI
- **Mapas**: Leaflet
- **AI**: Google Gemini (vía Genkit)

## 📦 Instrucciones para subir a GitHub

Para subir el código a tu repositorio `telespazioCRM`, abre la terminal y ejecuta:

```bash
# 1. Inicializar el repositorio local
git init

# 2. Agregar los archivos (el .gitignore omitirá lo innecesario)
git add .

# 3. Crear el primer commit
git commit -m "Initial commit: Sistema CRM T-Track completo con MFA y Multimoneda"

# 4. Vincular con el repositorio remoto de Telespazio
git remote add origin https://github.com/meg-telespazio/telespazioCRM.git

# 5. Cambiar a la rama principal y subir el código
git branch -M main
git push -u origin main
```

---
Desarrollado como prototipo avanzado para **Telespazio Argentina**.