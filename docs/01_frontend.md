# Documentación frontend (React + Vite + Tailwind)

## Requisitos
- Node.js LTS y npm.

## Creación del frontend
1. Crear el proyecto con Vite:
   ```bash
   npm create vite@latest frontend -- --template react
   ```
2. Entrar a la carpeta e instalar dependencias de app (según necesidad):
   ```bash
   cd frontend
   npm install react-router-dom lucide-react axios socket.io-client
   ```
3. Instalar Tailwind y herramientas de build:
   ```bash
   npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss
   ```
4. Configurar `tailwind.config.js`:
   ```js
   export default {
     content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
     theme: { extend: {} },
     plugins: [],
   }
   ```
5. Configurar `postcss.config.js`:
   ```js
   export default {
     plugins: {
       "@tailwindcss/postcss": {},
       autoprefixer: {},
     },
   }
   ```
6. Agregar Tailwind a los estilos globales:
   - `src/index.css` o `src/styles/globals.css`
   ```css
   @import "tailwindcss";
   ```
7. Importar estilos globales en `src/main.jsx`:
   ```jsx
   import './index.css'
   import './styles/globals.css'
   ```
8. Variables de entorno (crear `.env` en la raíz del repo):
   ```bash
   VITE_API_URL=http://localhost:3000
   # VITE_WS_URL=ws://localhost:3000
   ```
9. Levantar el frontend:
   ```bash
   npm run dev
   ```

## Notas
- Las rutas se definen en `src/App.jsx` con `react-router-dom`.
- Modulo `auth` en `src/modules/auth/` con rutas `/login`, `/register` y `/request-password`.
- Modulo `Landing` en `src/modules/Landing/` con ruta `/`.
- Registro en 2 pasos (selector de tipo de cuenta + credenciales minimas).
- Mockups post-login: `/app/candidate/vacantes`, `/app/candidate/postulaciones`, `/app/candidate/perfil` y rutas empresa `/app/company/*`.
- Modulo `company` en `src/modules/company/` con rutas `/app/company/vacantes`, `/app/company/candidatos`, `/app/company/mensajes`, `/app/company/empresa`.
- Dashboard empresa en `/app/company` muestra hero con CTA publicar, actividad reciente, vacantes activas, candidatos destacados y resumen de mensajes.
- Seccion Vacantes (empresa) en `/app/company/vacantes` incluye listado con estado, filtros clave, acciones rapidas y metricas por vacante.
- Seccion Candidatos (empresa) en `/app/company/candidatos` incluye listado por vacante, estados del proceso, filtros potentes y acciones en lista.
- Seccion Mensajes (empresa) en `/app/company/mensajes` incluye bandeja, conversacion rapida y plantillas (invitacion, seguimiento, descarte) con contexto visible de vacante.
- Seccion Perfil (empresa) en `/app/company/empresa` agrupa perfil, usuarios, preferencias, verificacion y facturacion, con indicador de avance (40/70/100).
- Modulo `dashboard` reservado en `src/modules/dashboard/` (pendiente de contenido).
- Perfil candidato (frontend):
- Ruta principal: `/app/candidate/perfil`.
- Secciones con tabs (navegacion libre, no secuencial): `/perfil/datos-basicos`, `/perfil/preferencias`, `/perfil/experiencia`, `/perfil/formacion`, `/perfil/idiomas`, `/perfil/documentos`.
- Ruta adicional: `/perfil/datos-personales` usa la vista `ProfileDatosPersonales`.
- Las tabs viven en `frontend/src/modules/candidate/ProfileTabs.jsx` y se incluyen en cada pantalla del perfil.
- El panel izquierdo del perfil muestra progreso, siguiente paso recomendado y tips rapidos.
- Los servicios de API van en `src/services/`.
- Helpers y utilidades van en `src/utils/`.
- No commitear `.env`. Usar `.env.example` como referencia.
- Tailwind v4: usar `@import "tailwindcss";` en CSS global.
- Si usas `@apply`, hacerlo dentro de `@layer components` para evitar errores de compilación.
- Para contenedores, usar `.page-container` (centrado y con padding consistente).
- El header es fijo y se compensa con `padding-top` en `body` usando `--header-height`.
- Estilos del modulo empresa estan aislados en `frontend/src/modules/company/company.css` y se aplican con la clase `company-scope` en cada pagina de empresa.
