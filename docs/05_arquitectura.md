# Arquitectura

## Resumen
EmpleoFacil es un monorepo full-stack orientado a conectar talento y empresas en Ecuador. La arquitectura separa frontend (React + Vite) y backend (Node.js + Express) orquestados con Docker.

## Frontend
- **Stack:** React + Vite + Tailwind CSS v4.
- **Routing:** `react-router-dom` en `src/App.jsx`.
- **Estructura:**
  - `src/components/` componentes reutilizables.
  - `src/modules/` vistas por módulo.
  - `src/services/` llamadas a API.
  - `src/utils/` helpers.
  - `src/styles/` estilos globales.
- **Estilos globales:**
  - `src/index.css` y `src/styles/globals.css` (ambos importados en `src/main.jsx`).
  - Contenedor base `.page-container` para alineación y ancho consistente.
  - Header fijo compensado con `padding-top` en `body` usando `--header-height`.
- **Modulo auth:**
  - `src/modules/auth/Login.jsx` (login).
  - `src/modules/auth/Register.jsx` (registro en 2 pasos: tipo de cuenta + credenciales).
  - `src/modules/auth/RequestPassword.jsx` (recuperacion por correo).
  - Estilos locales en `src/modules/auth/auth.css` para evitar afectar otras vistas.
- **Modulos post-login (mockup):**
  - `src/modules/candidate/CandidateVacantes.jsx` (candidato: vacantes).
  - `src/modules/candidate/CandidatePostulaciones.jsx` (candidato: postulaciones).
  - `src/modules/candidate/CandidateProfile.jsx` (candidato: perfil).
  - `src/modules/company/CompanyHome.jsx` (inicio empresa).
  - `src/modules/admin/AdminHome.jsx` (root: consola de admin).
  - `src/modules/admin/AdminRolesPermisos.jsx` (root: roles y permisos).
  - `src/modules/admin/AdminCuentas.jsx` (root: empresas y candidatos).
  - `src/modules/admin/AdminAuditoria.jsx` (root: auditoria y logs).
- **Variables de entorno:** `VITE_API_URL`, `VITE_WS_URL` (opcional).

## Backend
- **Stack:** Node.js + Express + MySQL (`mysql2`).
- **Estructura:** `routes/`, `controllers/`, `services/`, `models/`, `middlewares/`, `utils/`.
- **Auth y utilidades:** JWT, `bcryptjs`, `multer`.

## Infraestructura
- **Docker Compose** para `mysql`, `backend`, `frontend`, `phpmyadmin` (opcional).
- **Puertos por defecto:** Frontend `3001`, Backend `3000`, MySQL `3306`.

## Flujo general
1. El frontend consume el backend vía `VITE_API_URL`.
2. El backend consulta MySQL y expone API REST.
3. Docker Compose orquesta los servicios en desarrollo.
