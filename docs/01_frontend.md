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
   npm install react-router-dom lucide-react axios socket.io-client react-hot-toast @heroicons/react
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
- Sistema de toast:
  - Provider global en `src/App.jsx` con `Toaster` de `react-hot-toast`.
  - Helper de uso en `src/utils/showToast.jsx`.
  - Componente visual en `src/components/Toast.jsx`.
  - Estilos en `src/styles/notifications.css`.
- API de `showToast`:
  - Firma: `showToast({ type, message, actions, duration, onClose })`.
  - Tipos soportados: `success`, `warning`, `info`, `danger`, `error` (internamente `error` se normaliza a `danger`).
  - Duracion por defecto: `3000` ms. Si `actions` es funcion renderer, la duracion pasa a infinita hasta cerrar.
  - `actions` recibe `dismiss` para cerrar manualmente el toast.
  - `onClose` se ejecuta al cerrar.
- Ejemplo:
  ```jsx
  import { showToast } from '../../utils/showToast'

  showToast({
    type: 'success',
    message: 'Inicio de sesion exitoso',
  })
  ```
- Las rutas se definen en `src/App.jsx` con `react-router-dom`.
- Modulo `auth` en `src/modules/auth/` con rutas `/login`, `/register`, `/request-password` y `/app/change-password`.
- En `/login`, si backend responde `user.must_change_password = true`, se muestra alerta de clave temporal y se recomienda cambio inmediato.
- El dropdown del usuario (desktop/mobile) incluye `Cambiar contrasena` encima de `Salir`.
- La vista `/app/change-password` valida: campos requeridos, minimo 8 caracteres, nueva != actual y confirmacion igual.
- Modulo `Landing` en `src/modules/Landing/` con ruta `/`.
- Registro en 2 pasos (selector de tipo de cuenta + credenciales minimas).
- Vistas post-login activas: `/app/candidate/vacantes`, `/app/candidate/postulaciones`, `/app/candidate/perfil` y rutas empresa `/app/company/*`.
- Modulo `company` en `src/modules/company/` con rutas `/app/company/vacantes`, `/app/company/postulaciones`, `/app/company/candidatos`, `/app/company/mensajes`, `/app/company/empresa`.
- Modulo `admin` (rol root) en `src/modules/admin/` con rutas `/app/admin`, `/app/admin/roles`, `/app/admin/cuentas`, `/app/admin/auditoria`.
- Dashboard empresa en `/app/company` muestra hero con CTA publicar, actividad reciente, vacantes activas, candidatos destacados y resumen de mensajes.
- Seccion Vacantes (empresa) en `/app/company/vacantes` consume API real (`/api/vacantes/mias`) con listado, filtros basicos, paginacion, CRUD minimo (crear, editar, cambiar estado) y subvista de postulados por vacante (`/api/postulaciones/empresa`).
- La subvista de postulados en Vacantes muestra candidatos de una vacante, permite abrir perfil y copiar email/telefono para contacto rapido.
- Seccion Postulaciones (empresa) en `/app/company/postulaciones` queda como vista legacy de transicion.
- Seccion Vacantes (candidato) en `/app/candidate/vacantes` consume API real (`/api/vacantes`) con filtros `q`, `provincia`, `modalidad`, `tipo_contrato` y accion de postular (`POST /api/postulaciones`).
- Seccion Postulaciones (candidato) en `/app/candidate/postulaciones` consume API real (`/api/postulaciones/mias`) con paginacion y estado de proceso.
- Seccion Candidatos (empresa) en `/app/company/candidatos` incluye listado real de acreditados con busqueda `q`, paginacion (`page`, `page_size`) y drawer de perfil legible.
- Seccion Mensajes (empresa) en `/app/company/mensajes` incluye bandeja, conversacion rapida y plantillas (invitacion, seguimiento, descarte) con contexto visible de vacante.
- Seccion Perfil (empresa) en `/app/company/empresa` agrupa perfil, usuarios, preferencias y verificacion, con indicador de avance desde backend.
- Modulo `dashboard` reservado en `src/modules/dashboard/` (pendiente de contenido).
- Perfil candidato (frontend):
- Ruta principal: `/app/candidate/perfil`.
- Secciones con tabs: `/perfil/datos-basicos`, `/perfil/datos-personales`, `/perfil/preferencias`, `/perfil/formacion`, `/perfil/idiomas`, `/perfil/experiencia`, `/perfil/documentos`.
- Las tabs viven en `frontend/src/modules/candidate/ProfileTabs.jsx`.
- Las pantallas `/perfil/*` usan layout reusable en `frontend/src/modules/candidate/ProfileWizardLayout.jsx`.
- El sidebar de estado vive en `frontend/src/modules/candidate/ProfileSidebarStatus.jsx`:
  - sticky en desktop y debajo del formulario en mobile.
  - progreso de fase 1, checklist por estado y verificacion visual.
  - modo compacto cuando fase 1 esta completa.
  - resaltado de seccion actual en checklist.
- Las secciones y su estado se centralizan en `frontend/src/modules/candidate/profileSections.js`.
- Reglas de CTA en formularios:
  - seccion completa: `Actualizar informacion` + `Cancelar`.
  - seccion pendiente: `Guardar` + `Guardar y continuar`.
- Alertas contextuales no bloqueantes en sidebar:
  - aplican a cambios sensibles (email, telefono celular, documento) cuando corresponde.
- `ProfilePerfil` y `ProfileDatosBasicos` ya no muestran ni envian `estado_academico` al backend.
- Los servicios de API van en `src/services/`.
- Helpers y utilidades van en `src/utils/`.
- No commitear `.env`. Usar `.env.example` como referencia.
- Tailwind v4: usar `@import "tailwindcss";` en CSS global.
- Si usas `@apply`, hacerlo dentro de `@layer components` para evitar errores de compilación.
- Para contenedores, usar `.page-container` (centrado y con padding consistente).
- El header es fijo y se compensa con `padding-top` en `body` usando `--header-height`.
- Estilos del modulo empresa estan aislados en `frontend/src/modules/company/company.css` y se aplican con la clase `company-scope` en cada pagina de empresa.
- Estilos del modulo admin estan aislados en `frontend/src/modules/admin/admin.css` y se aplican con la clase `admin-scope`.

## Actualizaciones recientes (2026-02-24)
- Flujo empresa inactiva:
  - nueva ruta protegida `/app/company/inactiva` para cuentas empresa sin acceso activo.
  - al desactivar empresa se solicita encuesta obligatoria (multi-seleccion).
  - `Otro motivo` aparece solo cuando se marca `otro`.
  - confirmacion modal antes de ejecutar desactivacion.
- Reactivacion empresa (en cuenta inactiva):
  - encuesta de reactivacion con multi-seleccion y `Otro motivo` condicional.
  - envio unico de encuesta; despues de enviar se reemplaza por card `Revision solicitada`.
  - el usuario ya no ve el formulario si la solicitud existe.
- Admin:
  - `Solicitudes` ahora agrupa tabs para:
    - verificacion empresas
    - reactivacion empresas
    - solicitudes candidatos
  - admin/superadmin puede activar cuenta empresa desde frontend al aprobar reactivacion.
- Candidato, seccion documentos:
  - mini tutorial visual solo en movil con camara.
  - carrusel de 3 slides con swipe horizontal.
  - slide 1 muestra imagen de referencia en el mismo bloque (sin botones internos anverso/reverso).
  - en escritorio no se muestra bloque explicativo adicional del tutorial.
  - nuevo card de `Verificacion de cuenta` con estado y accion `Solicitar revision`.
