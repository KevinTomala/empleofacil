# Documentacion backend (Node.js + Express + MySQL)

## Objetivo
Este documento explica como esta construido el backend hoy y como mantener consistencia al agregar o modificar modulos.
No reemplaza:
- `docs/05_arquitectura.md` (vista macro del sistema).
- `docs/06_api.md` (contratos HTTP).
- `docs/07_bd.md` (modelo de datos).

## Requisitos
- Node.js LTS (si ejecutas fuera de Docker).
- MySQL 8.
- Variables de entorno definidas en `.env` (partiendo de `.env.example`).

## Estructura real en `backend/`
- `index.js`: bootstrap de Express, CORS, parseo JSON/form-data y registro de rutas.
- `db.js`: pool `mysql2/promise` + `waitForConnection`.
- `routes/`: endpoints por modulo.
- `controllers/`: validacion de request, manejo `req/res`, mapeo de errores HTTP.
- `services/`: logica de negocio e integraciones externas.
- `middlewares/auth.middleware.js`: JWT y control de rol.
- `jobs/ademySync.job.js`: job cron para sincronizacion incremental.

Rutas registradas actualmente:
- `/auth`
- `/api/candidatos`
- `/api/vacantes`
- `/api/postulaciones`
- `/api/perfil`
- `/api/hoja-vida`
- `/api/integraciones`
- `/api/company`
- `/api/verificaciones`

## Flujo backend (request lifecycle)
1. Request entra a `index.js`.
2. Middleware global aplica CORS, `express.json` y `express.urlencoded`.
3. Ruta aplica `authRequired` y `requireRole([...])` cuando corresponde.
4. Controller valida payload/params y delega a service.
5. Service ejecuta queries o integra con proveedor externo.
6. Controller responde con contrato consistente:
   - exito: `{ ok: true }`, `{ items: [] }` o payload consolidado.
   - error: `{ error: 'ERROR_CODE', details?: '...' }`.

## Modulos actuales

### Auth
- Login por email o documento de candidato.
- Cambio de password con validaciones basicas.
- JWT con expiracion configurable (`JWT_EXPIRES_IN`).

### Candidatos
- Listado paginado de candidatos acreditados.
- Filtros por nombre, apellido, documento o email.
- Contrato actual de `/api/candidatos`:
  - acepta `page`, `page_size`, `q`.
  - responde `items`, `page`, `page_size`.
  - no incluye `total`, `estado_proceso` ni `match_porcentaje`.

### Vacantes (MVP)
- Endpoints base:
  - `GET /api/vacantes` (vacantes activas para usuarios autenticados).
  - `GET /api/vacantes/mias` (vacantes de la empresa autenticada).
  - `POST /api/vacantes` (crear vacante, rol empresa/admin).
  - `PUT /api/vacantes/:vacanteId` (editar vacante propia).
  - `PUT /api/vacantes/:vacanteId/estado` (activar/pausar/cerrar).
- Filtros soportados:
  - `page`, `page_size`, `q`, `provincia`, `modalidad`, `tipo_contrato`.
- Regla clave:
  - soft delete respetado (`deleted_at IS NULL`) y solo `estado='activa'` para listado publico.

### Postulaciones (MVP)
- Endpoints base:
  - `POST /api/postulaciones` (crear postulacion, solo candidato).
  - `GET /api/postulaciones/mias` (postulaciones del candidato autenticado).
  - `GET /api/postulaciones/empresa` (postulaciones de vacantes de la empresa autenticada).
- Reglas clave:
  - solo se puede postular a vacantes `activa`,
  - no se permite postulacion duplicada (`vacante_id + candidato_id` unico),
  - empresa no ve postulaciones fuera de sus vacantes.

### Perfil candidato
- Lectura/escritura por secciones (`datos_basicos`, `contacto`, `domicilio`, `salud`, `logistica`, `educacion`).
- `datos_basicos` vigente (sin campos legacy): `nombres`, `apellidos`, `documento_identidad`, `nacionalidad`, `fecha_nacimiento`, `sexo`, `estado_civil`, `activo`.
- Campos retirados del contrato y del modelo operativo: `centro_id`, `interesado_id`, `referente_id`, `estado_academico`.
- Fase 2 activa en el mismo modulo:
  - `idiomas` (CRUD)
  - `experiencia` (CRUD)
  - `empresas-experiencia` (catalogo para autocomplete en experiencia)
  - `experiencia/:experienciaId/certificado` (CRUD 1:1 + upload multipart)
  - `formacion` (CRUD relacional por item)
  - `formacion/:formacionId/certificado` (CRUD 1:1 + upload multipart)
  - `documentos` (CRUD + upload multipart con `multer`)
- Regla de experiencia:
  - para crear experiencia se exige al menos `empresa_id` o `empresa_nombre`.
  - cuando llega `empresa_id`, backend persiste snapshot consistente en `empresa_nombre`.
- Contrato actual de `formacion` (externa):
  - columnas legacy removidas en dominio (`matricula_id`, `nivel_id`, `curso_id`, `formacion_origen_id`, `estado`, `fecha_inicio`, `fecha_fin`).
  - fechas vigentes: `fecha_aprobacion`, `fecha_emision`, `fecha_vencimiento`.
- Archivos de documentos:
  - destino local: `backend/uploads/candidatos/`
  - acceso publico interno: `/uploads/*` (servido por Express)
- `GET/PUT /api/perfil/me/*` para rol `candidato`.
- `GET /api/perfil/:candidatoId` para `empresa|administrador|superadmin`.
- `PUT /api/perfil/:candidatoId/*` para `administrador|superadmin`.
- Estrategia de persistencia:
  - `UPDATE` para tabla principal `candidatos`.
  - `INSERT ... ON DUPLICATE KEY UPDATE` para tablas 1:1.

### Hoja de vida
- Consolidado de perfil por estudiante.
- Generacion PDF (Puppeteer).

### Perfil empresa
- Perfil general:
  - `GET /api/company/perfil/me`
  - `PUT /api/company/perfil/me/datos-generales`
  - `POST|DELETE /api/company/perfil/me/logo`
- Usuarios/reclutadores:
  - `GET|POST /api/company/perfil/me/usuarios`
  - `PUT|DELETE /api/company/perfil/me/usuarios/:empresaUsuarioId`
- Preferencias de contratacion:
  - `GET|PUT /api/company/perfil/me/preferencias`
- Baja logica de empresa:
  - `DELETE /api/company/perfil/me`
- Vinculacion automatica de experiencia historica:
  - al crear/adjuntar/renombrar empresa, backend intenta llenar `candidatos_experiencia.empresa_id`
    para filas manuales con `empresa_origen IS NULL` cuyo `empresa_nombre` coincide con `empresas.nombre` (normalizado).
  - no aplica a experiencias de origen ADEMY.

### Verificaciones
- Empresa/candidato:
  - `GET /api/company/perfil/me/verificacion`
  - `POST /api/company/perfil/me/verificacion/solicitar`
  - `GET /api/perfil/me/verificacion`
  - `POST /api/perfil/me/verificacion/solicitar`
- Admin:
  - `GET /api/verificaciones/cuentas`
  - `GET /api/verificaciones/cuentas/:verificacionId`
  - `PUT /api/verificaciones/cuentas/:verificacionId/estado`
  - `GET /api/verificaciones/reactivaciones/empresas`
  - `PUT /api/verificaciones/reactivaciones/empresas/:reactivacionId/estado`

### Reactivacion empresa
- Empresa inactiva puede consultar y solicitar reactivacion:
  - `GET /api/company/reactivacion/me`
  - `POST /api/company/reactivacion/me/solicitar`
- Desactivacion de empresa (`DELETE /api/company/perfil/me`) ahora requiere encuesta valida.
- Restricciones de envio unico:
  - `DEACTIVATION_SURVEY_ALREADY_SUBMITTED`
  - `REACTIVATION_SURVEY_ALREADY_SUBMITTED`
- Regla de reactivacion aprobada:
  - la empresa se activa,
  - se reactivan solo usuarios previamente activos (snapshot `usuarios_activos_json`).

### Integraciones (Ademy)
- Catalogos y sync de acreditados.
- Sync protegido con lock MySQL (`GET_LOCK`) para evitar ejecuciones concurrentes.
- Registro de estado y logs en tablas de integracion.

## Convenciones de desarrollo backend

### Por capa
- `routes/`: declarar endpoint + middleware + handler.
- `controllers/`: validar entrada y mapear errores HTTP.
- `services/`: logica de negocio, SQL e integraciones.

### Validacion y errores
- Validar al inicio del controller.
- Usar codigos de error estables (`INVALID_PAYLOAD`, `FORBIDDEN`, etc).
- Evitar mensajes ambiguos o cambiar codigos sin actualizar `docs/06_api.md`.

### SQL y datos
- Preferir queries parametrizadas.
- Usar transacciones en operaciones multi-tabla.
- Respetar `deleted_at` cuando aplique.
- Para tablas 1:1, usar upsert con PK `candidato_id`.
- Para tablas 1:N de perfil (`idiomas`, `experiencia`, `documentos`), usar CRUD por item con soft delete.
- Para relaciones 1:1 anidadas (`experiencia_certificado`), validar ownership del padre antes de operar.

## Jobs y operacion
- Job actual: `jobs/ademySync.job.js`.
- Configuracion:
  - `ADEMY_SYNC_ENABLED`
  - `ADEMY_SYNC_CRON`
  - `ADEMY_SYNC_TZ`
  - `ADEMY_SYNC_RUN_ON_START`
  - `ADEMY_SYNC_PAGE_SIZE`
- El job ejecuta import incremental por `updated_since` basado en `integracion_sync_state.last_success_at`.

## Variables de entorno backend (clave)
- API y servidor:
  - `BACKEND_PORT`
  - `FRONTEND_URL`
- DB:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Auth:
  - `JWT_SECRET`, `JWT_EXPIRES_IN`
- Integracion Ademy:
  - `ADEMY_API_URL`
  - `ADEMY_JWT_SECRET`, `ADEMY_JWT_ISS`, `ADEMY_JWT_AUD`, `ADEMY_JWT_SCOPE`
- Scheduler:
  - `ADEMY_SYNC_ENABLED`, `ADEMY_SYNC_CRON`, `ADEMY_SYNC_TZ`, `ADEMY_SYNC_RUN_ON_START`, `ADEMY_SYNC_PAGE_SIZE`

## Checklist para nuevos modulos backend
1. Crear `routes/<modulo>.routes.js`.
2. Crear `controllers/<modulo>.controller.js`.
3. Crear `services/<modulo>.service.js`.
4. Registrar ruta en `backend/index.js`.
5. Proteger endpoints con `authRequired`/`requireRole` segun necesidad.
6. Documentar endpoints en `docs/06_api.md`.
7. Si cambia estructura de datos, actualizar `docs/07_bd.md`.

## Referencias cruzadas
- Arquitectura general: `docs/05_arquitectura.md`
- Contratos HTTP: `docs/06_api.md`
- Base de datos: `docs/07_bd.md`
- Operacion/despliegue: `docs/08_despliegue_runbook.md`
- Pruebas: `docs/09_pruebas.md`
