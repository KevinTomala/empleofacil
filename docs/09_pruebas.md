# Pruebas

## Estado actual
Actualmente no hay suite automatizada de tests en backend ni frontend. Este documento define una base de pruebas manuales y sugerencias de automatizacion.

## Pruebas manuales backend (minimas)

### 1) Salud del servicio
- `GET /healthz` debe responder `200` con `{ "status": "OK" }`.

### 2) Autenticacion
- `POST /auth/login` con credenciales validas devuelve `token`.
- `POST /auth/login` con password invalido devuelve `401 INVALID_CREDENTIALS`.
- `POST /auth/change-password` sin token devuelve `401 AUTH_REQUIRED`.
- `POST /auth/login` de usuario con clave temporal devuelve `user.must_change_password = true`.
- `POST /auth/change-password` exitoso debe permitir login posterior con nueva clave y devolver `must_change_password = false`.

### 3) Autorizacion por rol
- `GET /api/integraciones/ademy/convocatorias` con rol no admin debe devolver `403 FORBIDDEN`.
- `GET /api/candidatos` con rol permitido debe devolver `200`.

### 4) Hoja de vida
- `GET /api/hoja-vida/:id` con id invalido debe devolver `400 INVALID_ESTUDIANTE_ID`.
- `GET /api/hoja-vida/:id/pdf` con candidato existente debe devolver `application/pdf`.

### 5) Integraciones Ademy
- `POST /api/integraciones/ademy/acreditados/import` con token admin debe devolver resumen `{ ok, total, created, updated, skipped, errors }`.
- Lanzar dos imports simultaneos debe provocar `409 SYNC_ALREADY_RUNNING` en uno de ellos.

### 6) Perfil candidato Fase 2 (backend)
- `GET /api/perfil/me/idiomas` responde `200` con `{ items: [] }`.
- `POST /api/perfil/me/idiomas` crea idioma y devuelve `201`.
- `PUT/DELETE /api/perfil/me/idiomas/:idiomaId` validan ownership y responden `404` si no existe.
- `GET /api/perfil/me/experiencia` responde `200` con `{ items: [] }`.
- `GET /api/perfil/empresas-experiencia?search=aguapen` responde `200` con `items` (catalogo local activo).
- `POST /api/perfil/me/experiencia` crea experiencia y devuelve `201`.
- `POST /api/perfil/me/experiencia` sin `empresa_id` y sin `empresa_nombre` devuelve `400 INVALID_PAYLOAD`.
- `PUT/DELETE /api/perfil/me/experiencia/:experienciaId` validan ownership y responden `404` si no existe.
- En experiencia importada ADEMY:
  - `empresa_origen='ademy'` y `empresa_origen_id` deben persistirse.
  - `empresa_id` debe quedar `NULL` si no existe mapeo manual local.
  - no deben crearse empresas/usuarios locales automaticamente.
- Si existe mapeo en `integracion_ademy_empresas_empleofacil`, `empresa_id` debe llenarse en reimportacion.
- `POST /api/perfil/me/documentos` (multipart) crea metadata + archivo.
- `POST /api/perfil/me/documentos` sin archivo devuelve `400 FILE_REQUIRED`.
- `POST /api/perfil/me/documentos` con mime invalido devuelve `400 INVALID_FILE_TYPE`.
- `POST /api/perfil/me/documentos` con archivo grande devuelve `400 FILE_TOO_LARGE`.
- `GET|POST|PUT|DELETE /api/perfil/me/formacion*` validan CRUD por categoria/subtipo.
- `GET /api/perfil/centros-capacitacion` devuelve catalogo para autocomplete.
- `POST /api/perfil/me/formacion` con `institucion` solamente crea/usa centro y guarda `centro_cliente_id` + snapshot `institucion`.
- `POST /api/perfil/me/formacion` con `centro_cliente_id` solamente completa `institucion` desde catalogo.
- `POST /api/perfil/me/formacion` sin `institucion` y sin `centro_cliente_id` devuelve `422 FORMACION_INSTITUCION_REQUIRED`.
- `POST /api/perfil/me/formacion` con `centro_cliente_id` inexistente devuelve `400 CENTRO_CAPACITACION_NOT_FOUND`.
- `POST|PUT /api/perfil/me/formacion*` rechazan payload legacy (`estado`, `fecha_inicio`, `fecha_fin`, `matricula_id`, `nivel_id`, `curso_id`, `formacion_origen_id`) con `400 INVALID_PAYLOAD`.
- `GET|POST|PUT|DELETE /api/perfil/me/educacion-general*` permiten multiples registros academicos.
- `GET|POST|PUT|DELETE /api/perfil/me/formacion/:formacionId/certificado` permite upload/reemplazo/borrado de certificado de curso.
- `POST /api/perfil/me/formacion/:formacionId/certificado` en item no externa devuelve `FORMACION_CERTIFICADO_NOT_ALLOWED`.
- `GET|POST|PUT|DELETE /api/perfil/me/experiencia/:experienciaId/certificado` respetan ownership.
- `POST certificado` sin archivo devuelve `400 FILE_REQUIRED`.
- Empresa solo lectura en `/:candidatoId/formacion*` y `/:candidatoId/experiencia/:experienciaId/certificado`.

### 7) Perfil empresa (backend)
- Usuario `candidato` con membresia activa en `empresas_usuarios` puede consumir `/api/company/perfil/me` (`200`).
- Usuario autenticado sin membresia activa recibe `403 COMPANY_ACCESS_REQUIRED` en `/api/company/*`.
- `GET /api/company/perfil/me/usuarios` responde `200` con lista de vinculaciones.
- `POST /api/company/perfil/me/usuarios` con email no existente devuelve `404 USER_NOT_FOUND`.
- `POST /api/company/perfil/me/usuarios` con email ya vinculado devuelve `409 USER_ALREADY_LINKED`.
- `PUT /api/company/perfil/me/usuarios/:empresaUsuarioId` permite cambiar `rol_empresa`, `estado`, `principal`.
- Intentar desactivar o degradar el ultimo admin activo devuelve `400 LAST_ADMIN_REQUIRED`.
- Usuario `rol_empresa=visor` obtiene `403 COMPANY_ROLE_FORBIDDEN` en escrituras (`PUT datos-generales`, `POST logo`, `PUT preferencias`, etc.).
- Usuario `rol_empresa=reclutador` obtiene `403 COMPANY_ROLE_FORBIDDEN` al gestionar usuarios o desactivar empresa.
- `GET /api/company/perfil/me/preferencias` responde `200` con preferencias 1:1.
- `PUT /api/company/perfil/me/preferencias` persiste arrays normalizados.
- `DELETE /api/company/perfil/me` aplica soft delete y luego `GET /api/company/perfil/me` devuelve `404 EMPRESA_NOT_FOUND`.
- Autovinculacion historica no ADEMY:
  - crear o renombrar empresa con nombre igual a `candidatos_experiencia.empresa_nombre` debe llenar `empresa_id` en esas experiencias.
  - experiencias con `empresa_origen='ademy'` no deben autovincularse por este mecanismo.

## Checklist de regresion rapida
- Login funciona por email.
- Login funciona por documento de candidato.
- Cambio de password limpia `must_change_password`.
- Usuario creado por import Ademy inicia `activo` y con `must_change_password=1`.
- Cron no corre cuando `ADEMY_SYNC_ENABLED=false`.

## Pruebas manuales frontend (auth y seguridad)
- Usuario autenticado visualiza `Cambiar contrasena` arriba de `Salir` en dropdown desktop.
- Usuario autenticado visualiza `Cambiar contrasena` arriba de `Salir` en menu mobile.
- Navegar a `/app/change-password` con sesion activa renderiza formulario.
- Navegar a `/app/change-password` sin sesion redirige a `/login`.
- Formulario bloquea submit cuando faltan campos.
- Formulario muestra error cuando nueva contrasena tiene menos de 8 caracteres.
- Formulario muestra error cuando nueva contrasena es igual a la actual.
- Formulario muestra error cuando confirmacion no coincide.
- Cambio exitoso muestra toast de exito y limpia los campos.

## Pruebas manuales frontend (perfil candidato wizard)

### 1) Layout y navegacion
- Entrar a `/perfil/perfil` y verificar layout 2 columnas en desktop (form + sidebar).
- Verificar que en mobile el sidebar aparece debajo del formulario.
- Verificar tabs visibles: `Perfil`, `Domicilio`, `Movilidad`, `Salud`, `Formacion`, `Idiomas`, `Experiencia`, `Documentos`.

### 2) Sidebar de estado
- Confirmar barra de progreso y checklist por estado (`Completo`, `Pendiente`, `Fase 2`).
- Confirmar que la seccion actual aparece resaltada y marcada como `Actual`.
- Cuando Fase 1 llegue a 100%, validar mensaje compacto: `Perfil base completo. Puedes avanzar a Fase 2.`

### 3) CTAs contextuales por completitud
- En seccion completa: botones `Actualizar informacion` (primario) y `Cancelar` (secundario).
- En seccion pendiente: botones `Guardar` y `Guardar y continuar`.
- `Cancelar` debe volver a `/app/candidate/perfil` sin guardar cambios.

### 4) Reorganizacion de secciones
- `/perfil/datos-basicos` redirige a `/perfil/perfil`.
- `/perfil/datos-personales` redirige a `/perfil/perfil`.
- `/perfil/preferencias` redirige a `/perfil/movilidad`.
- `ProfilePerfil` guarda datos basicos + contacto sin romper contratos.

### 5) Integridad de flujo
- `Guardar` mantiene comportamiento de persistencia actual.
- `Guardar y continuar` mantiene navegacion esperada entre tabs.
- Ejecutar build frontend sin errores.

### 6) Perfil candidato Fase 2 (frontend)
- `ProfileIdiomas` permite crear, editar y eliminar items.
- `ProfileExperiencia` permite crear, editar y eliminar items.
- `ProfileExperiencia` usa un solo input de empresa con autocomplete (`datalist`) contra `/api/perfil/empresas-experiencia`.
- Si el texto coincide con una empresa existente, debe seleccionar/vincular `empresa_id`.
- Si no coincide, debe guardar como texto libre en `empresa_nombre`.
- `ProfileExperiencia` permite crear/actualizar/eliminar certificado laboral por experiencia.
- `ProfileDocumentos` permite subir archivo y actualizar metadatos.
- `ProfileFormacion` usa tabs:
  - `Academica` permite CRUD multiple en `candidatos_educacion_general`.
  - `Externa` usa CRUD de `/api/perfil/me/formacion`.
  - `Externa` permite subir/reemplazar/eliminar certificado de curso (pdf/imagen) por cada formacion.
  - `Certificacion` redirige operacion a `ProfileExperiencia` (certificado laboral por experiencia).
- En `Externa`, solo se muestran campos del contrato limpio (`categoria_formacion`, `subtipo_formacion`, `institucion`, `nombre_programa`, `titulo_obtenido`, `fecha_aprobacion`, `fecha_emision`, `fecha_vencimiento`).
- En `Externa`, el campo `Institucion` muestra sugerencias del catalogo (`/api/perfil/centros-capacitacion`) y permite texto libre.
- El dashboard de perfil actualiza progreso total al completar secciones de Fase 2.
- El drawer de empresa muestra `idiomas`, `experiencia`, `formacion` y `documentos` del candidato.

### 7) Perfil empresa (frontend)
- Candidato con membresia activa en empresa puede abrir rutas `/app/company/*`.
- `/app/company/empresa` no muestra bloque de facturacion.
- El porcentaje y campos pendientes se leen desde `resumen` de backend (sin recalculo local).
- Bloque de usuarios permite: vincular por email, cambiar rol, marcar principal y activar/desactivar.
- Bloque de preferencias permite guardar modalidades, niveles y observaciones.
- Boton `Desactivar empresa` ejecuta baja logica y redirige a login cuando responde `200`.
- Usuario sin membresia activa no accede a `/app/company/*` y es redirigido.

## Recomendacion de automatizacion
1. Backend: incorporar `jest` + `supertest` para rutas criticas (`auth`, `candidatos`, `hoja-vida`, `integraciones`).
2. Frontend: pruebas de UI con `vitest` + `@testing-library/react`.
3. E2E: flujo login + consulta hoja de vida con Playwright.
