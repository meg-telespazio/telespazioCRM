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

## 📦 Instrucciones para GitHub

Para vincular este proyecto con el repositorio de Telespazio, abre una terminal en la carpeta del proyecto y ejecuta:

### Opción A: Si es la primera vez que subes el código
```bash
# 1. Inicializar el repositorio local
git init

# 2. Agregar los archivos
git add .

# 3. Crear el primer commit
git commit -m "Initial commit: Sistema CRM T-Track completo"

# 4. Vincular con el repositorio remoto
git remote add origin https://github.com/meg-telespazio/telespazioCRM.git

# 5. Subir a la rama principal
git branch -M main
git push -u origin main
```

### Opción B: Si ya tenías otro repositorio y quieres cambiarlo a este
```bash
# Cambiar la URL del remoto "origin"
git remote set-url origin https://github.com/meg-telespazio/telespazioCRM.git

# Verificar el cambio
git remote -v

# Subir los cambios
git push -u origin main
```

### ⚠️ Solución al Error 403 (Permission Denied)
Si recibes el error `remote: Permission denied to Maexgon`, sigue estos pasos:

1. **Permisos en GitHub**: El administrador del repo en la organización `meg-telespazio` debe ir a **Settings > Collaborators** y añadir a `Maexgon` con permiso de **Write**.
2. **Token de Acceso (PAT)**: Si usas HTTPS, asegúrate de que tu Personal Access Token tenga activado el scope `repo`.
3. **SSH (Recomendado)**: Si los problemas persisten, usa SSH:
   ```bash
   git remote set-url origin git@github.com:meg-telespazio/telespazioCRM.git
   ```

## 🛠️ Despliegue en Vercel

Este proyecto está optimizado para funcionar en Vercel. Sigue estos pasos:

1.  **Vincular GitHub**: Conecta tu repositorio `meg-telespazio/telespazioCRM` a un nuevo proyecto en Vercel.
2.  **Variables de Env**: En la configuración del proyecto en Vercel, agrega las variables definidas en el archivo `.env.example`.
3.  **Build Settings**: Vercel detectará automáticamente Next.js. No es necesario cambiar los comandos predeterminados.
4.  **Genkit AI**: Asegúrate de incluir `GOOGLE_GENAI_API_KEY` para que las funciones de IA (buscador de logos, reportes IA) funcionen.

---
Desarrollado para **Telespazio Argentina**.
