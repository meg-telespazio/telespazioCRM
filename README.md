# T-Track Sales CRM - Telespazio

Sistema integral de gestión de relaciones con clientes (CRM) diseñado específicamente para las necesidades de Telespazio, con soporte para múltiples gerencias (SatComs y GeoInfo) y gestión financiera multimoneda.

## 🚀 Características Principales

- **Dashboard Financiero**: Visualización de KPIs, proyecciones de ingresos y gráficos de embudo con conversión de moneda en tiempo real.
- **Gestión de Clientes y Contactos**: Directorio centralizado con seguimiento de responsables y países de origen (HQ).
- **Seguridad Avanzada**:
  - Autenticación de Doble Factor (MFA) vía SMS y App (TOTP).
  - MFA Obligatorio configurable por el administrador.
- **Ciclo de Ventas Completo**: Oportunidades, Contratos, POs y Servicios.
- **Logística e Inventario**: Gestión de Kits (Equipos) y Locaciones mapeadas.

## 🛠️ Despliegue en Vercel

Este proyecto está optimizado para funcionar en Vercel. Sigue estos pasos:

1.  **Vincular GitHub**: Conecta tu repositorio `meg-telespazio/telespazioCRM` a un nuevo proyecto en Vercel.
2.  **Variables de Entorno**: En la configuración del proyecto en Vercel, agrega las variables definidas en el archivo `.env.example`.
3.  **Build Settings**: Vercel detectará automáticamente Next.js. No es necesario cambiar los comandos predeterminados.
4.  **Genkit AI**: Asegúrate de incluir `GOOGLE_GENAI_API_KEY` para que las funciones de inteligencia artificial (como el buscador de logos o el generador de reportes IA) funcionen.

## 📦 Instrucciones para subir a GitHub

Para subir el código a tu repositorio, abre la terminal y ejecuta:

```bash
# 1. Inicializar el repositorio local
git init

# 2. Agregar los archivos
git add .

# 3. Crear el primer commit
git commit -m "Initial commit: Sistema CRM T-Track completo"

# 4. Vincular con el repositorio remoto
git remote add origin https://github.com/meg-telespazio/telespazioCRM.git

# 5. Subir el código
git branch -M main
git push -u origin main
```

---
Desarrollado para **Telespazio Argentina**.
