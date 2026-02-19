# Modelado (MVP inicial)

Fecha: 2026-02-11

## 1) Alcance decidido

- Prioridad: `auth` (Login, Register, RequestPassword).
- Pais: Ecuador (mapa interactivo y filtros por provincias/cantones).
- `estudiantes` provienen de sistema externo (solo lectura en el portal).
- La base `initNew.sql` se mantiene para auth salvo cambio obligado por el UI.

## 2) Auth: entidades y relaciones

Tablas actuales en `initNew.sql`:
- `roles` -> define roles del sistema.
- `permisos` -> define permisos por modulo/ruta.
- `rol_permiso` -> relacion N:N entre `roles` y `permisos`.
- `usuarios` -> cuentas de acceso, enlaza a `roles`.
- `password_resets` -> solicitudes de recuperacion de clave.

Relaciones clave:
- `usuarios.rol_id` -> `roles.id` (FK, ON DELETE SET NULL).
- `rol_permiso.rol_id` -> `roles.id` (FK, ON DELETE CASCADE).
- `rol_permiso.permiso_id` -> `permisos.id` (FK, ON DELETE CASCADE).
- `password_resets.user_id` -> `usuarios.id` (FK, ON DELETE CASCADE).

## 3) Mapeo con frontend (auth)

Pantallas y destino de datos:
- Login: valida `usuarios.email` + `usuarios.password_hash`.
- Register: crea `usuarios` con `rol_id` segun tipo de cuenta.
- RequestPassword: crea fila en `password_resets`.

Rutas UI:
- `/login`
- `/register`
- `/request-password`

## 4) Menu / Header y permisos

La navegacion en `Header` cambia segun rol.
Sugerencia de codigos de permiso (no implementado aun, solo catalogo):
- `auth.login`, `auth.register`, `auth.password_reset`
- `company.home`, `company.vacantes`, `company.candidatos`, `company.mensajes`, `company.perfil`
- `candidate.vacantes`, `candidate.postulaciones`, `candidate.perfil`
- `admin.home`, `admin.roles`, `admin.cuentas`, `admin.auditoria`

Campos sugeridos en `permisos`:
- `modulo`: `auth`, `company`, `candidate`, `admin`
- `submodulo`: `home`, `vacantes`, `perfil`, etc.
- `ruta`: ruta del frontend (por ejemplo `/app/company/vacantes`).

## 5) Notas de integracion

- El frontend sigue en modo mock; no hay consumo de API.
- Para la integracion se requieren DTOs por pantalla antes de tocar UI.
- Estados (por ejemplo `en_revision`, `activa`, `hibrido`) deben unificarse entre UI y DB.

## 6) Cambios pendientes (auth)

- No se requieren cambios en `initNew.sql` para auth en esta fase.
- Si el UI exige otra semantica de roles, se ajusta `roles` y `permisos` sin tocar el resto.

## 7) Admin (mapeo inicial)

Pantallas:
- `AdminHome`: contadores y actividad critica (fuente: `usuarios`, `empresas_verificacion`, `log_actividad`).
- `AdminRolesPermisos`: `roles`, `permisos`, `rol_permiso`.
- `AdminCuentas`: `empresas`, `empresas_verificacion`, `usuarios`/`estudiantes`.
- `AdminAuditoria`: `log_actividad`, `logs_frontend`.

Pendientes:
- Definir como persistir historial de cambios de permisos (usar `log_actividad` o tabla dedicada).
- Definir owner/responsable de empresa (campo o relacion).

## 8) Candidate (mapeo inicial)

Pantallas:
- `CandidateVacantes`: `vacantes_publicadas`.
- `CandidatePostulaciones`: `postulaciones`, `postulaciones_historial`.
- `CandidateProfile`: `estudiantes` + `estudiantes_contacto` + `estudiantes_domicilio` + `estudiantes_experiencia` + `estudiantes_documentos` + `estudiantes_formaciones`.
- `ProfilePreferencias`: `candidato_preferencias`.
- `ProfileIdiomas`: `candidato_idiomas`.

Pendientes:
- Ninguno para candidate (tablas creadas).


## 9) Company (mapeo inicial)

Pantallas:
- `CompanyHome`: `vacantes_publicadas`, `postulaciones`, `conversaciones` (resumen).
- `CompanyVacantes`: `vacantes_publicadas` + métricas (pendiente).
- `CompanyCandidatos`: `postulaciones` + `estudiantes` + `estudiantes_experiencia` + `estudiantes_formaciones`.
- `CompanyMensajes`: `conversaciones`, `mensajes`, `mensaje_lecturas`.
- `CompanyPerfil`: `empresas_perfil`, `empresas_verificacion`, `empresas_preferencias`, `empresas_usuarios`.

Pendientes:
- Métricas de vacantes (vistas) si se requiere en UI.
- Plantillas de mensajes si se desea persistencia.
