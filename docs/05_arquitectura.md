# Arquitectura

## Resumen
EmpleoFacil es un monorepo full-stack con frontend React/Vite, backend Node/Express y MySQL. El desarrollo local corre con Docker Compose.

## Estructura del monorepo
```text
empleofacil/
  backend/
  frontend/
  docs/
  docker-compose.yml
  .env.example
  init.sql
```

## Backend (estado actual)
- Stack: Node.js 20 + Express + MySQL (`mysql2/promise`).
- Seguridad: JWT (`jsonwebtoken`) + hash de passwords con `bcryptjs`.
- Documentos: generacion PDF con `puppeteer`.
- Jobs internos: `node-cron` para sincronizacion automatica con Ademy.
- Documentacion tecnica detallada: `docs/02_backend.md`.

Estructura real en `backend/`:
- `index.js`: arranque HTTP, CORS, rutas y scheduler.
- `db.js`: pool MySQL, retries de conexion (`waitForConnection`).
- `routes/`: `auth`, `candidatos`, `perfilCandidato`, `hojaVida`, `integraciones`.
- `controllers/`: logica HTTP por modulo.
- `services/`: perfil candidato, integracion Ademy y armado/PDF de hoja de vida.
- `middlewares/`: autenticacion y control de rol.
- `jobs/ademySync.job.js`: cron de importacion incremental.

## Flujo backend
1. `index.js` levanta Express y valida conexion a DB antes de escuchar puerto.
2. La API expone auth, candidatos, hoja de vida e integraciones.
3. `auth.middleware` valida JWT y `requireRole` bloquea accesos por rol.
4. Integraciones usa un lock MySQL (`GET_LOCK`) para evitar sync concurrentes.
5. Si `ADEMY_SYNC_ENABLED=true`, corre cron y opcionalmente un sync al iniciar.

## Frontend
- Stack: React + Vite + Tailwind CSS v4.
- Routing: `react-router-dom` en `frontend/src/App.jsx`.
- Estructura:
  - `frontend/src/components/`: componentes reutilizables.
  - `frontend/src/modules/`: vistas por modulo (`auth`, `candidate`, `company`, `admin`, `Landing`).
  - `frontend/src/services/`: llamadas a API.
  - `frontend/src/utils/`: helpers.
  - `frontend/src/styles/`: estilos globales/tematicos.
- Estilos globales:
  - `frontend/src/index.css` y `frontend/src/styles/globals.css`.
  - Contenedor base `.page-container`.
  - Header fijo compensado con `--header-height`.
- Notificaciones:
  - `react-hot-toast` con provider global.
  - Helper unificado en `frontend/src/utils/showToast.jsx`.
  - Estilos dedicados en `frontend/src/styles/notifications.css`.
- Variables principales: `VITE_API_URL`, `VITE_WS_URL` (opcional).
- El frontend consume la API REST del backend.

### Perfil candidato (wizard UI)
- El flujo `/perfil/*` usa layout reusable `ProfileWizardLayout`:
  - Tabs superiores (`ProfileTabs`).
  - Columna principal con formulario.
  - Sidebar contextual sticky en desktop (`ProfileSidebarStatus`) y debajo del formulario en mobile.
- Las secciones y estados del perfil se centralizan en `frontend/src/modules/candidate/profileSections.js`.
  - Fase 1: `datos-basicos`, `datos-personales`, `preferencias`, `formacion`.
  - Fase 2: `idiomas`, `experiencia`, `documentos` con persistencia en backend `/api/perfil/*`.
- Micro-UX implementada:
  - Sidebar compacto (evita repetir mensajes cuando Fase 1 esta completa).
  - Resaltado de seccion actual en checklist.
  - CTA contextual en formularios: seccion completa -> `Actualizar informacion` + `Cancelar`; seccion pendiente -> `Guardar` + `Guardar y continuar`.
  - Alertas de edicion no bloqueantes para cambios sensibles (email, telefono celular, documento) cuando aplica.

## Infraestructura
- `docker-compose.yml` (dev): `mysql`, `backend`, `frontend`.
- `docker compose --profile tools ...`: agrega `phpmyadmin` si esta definido en tu compose.
- Puertos por defecto: backend `3000`, frontend `3001`, mysql `3306`.

## Variables importantes
- DB: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Auth: `JWT_SECRET`, `JWT_EXPIRES_IN`.
- Ademy: `ADEMY_API_URL`, `ADEMY_JWT_SECRET`, `ADEMY_JWT_ISS`, `ADEMY_JWT_AUD`, `ADEMY_JWT_SCOPE`.
- Scheduler: `ADEMY_SYNC_ENABLED`, `ADEMY_SYNC_CRON`, `ADEMY_SYNC_TZ`, `ADEMY_SYNC_RUN_ON_START`, `ADEMY_SYNC_PAGE_SIZE`.
