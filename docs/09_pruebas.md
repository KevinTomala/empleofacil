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
- `GET /api/hoja-vida/:id` no debe incluir `perfil.estado_academico`.
- `GET /api/hoja-vida/:id/pdf` no debe renderizar la linea `Estado academico`.

### 5) Integraciones Ademy
- `POST /api/integraciones/ademy/acreditados/import` con token admin debe devolver resumen `{ ok, total, created, updated, skipped, errors }`.
- Lanzar dos imports simultaneos debe provocar `409 SYNC_ALREADY_RUNNING` en uno de ellos.

### 6) Perfil candidato Fase 2 (backend)
- `GET /api/perfil/me` no debe incluir en `datos_basicos`: `centro_id`, `interesado_id`, `referente_id`, `estado_academico`.
- `PUT /api/perfil/me/datos-basicos` con payload valido sin campos legacy responde `200`.
- `PUT /api/perfil/me/datos-basicos` enviando `centro_id|interesado_id|referente_id|estado_academico` debe responder `400 INVALID_PAYLOAD`.
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

### 8) Vacantes + postulaciones MVP (backend)
- `POST /api/vacantes` con empresa valida debe responder `201` y `id`.
- `GET /api/vacantes` debe responder `200` con `items`, `page`, `page_size`, `total` y solo vacantes activas.
- `GET /api/vacantes/mias` debe responder `200` para empresa y `403 COMPANY_ACCESS_REQUIRED` si no hay scope de empresa.
- `PUT /api/vacantes/:vacanteId` de vacante ajena debe devolver `403 FORBIDDEN`.
- `PUT /api/vacantes/:vacanteId/estado` debe aceptar `borrador|activa|pausada|cerrada`.
- `POST /api/postulaciones` sobre vacante activa debe responder `201`.
- Repetir `POST /api/postulaciones` con mismo `vacante_id` debe devolver `409 POSTULACION_DUPLICADA`.
- `POST /api/postulaciones` sobre vacante `pausada|cerrada` debe devolver `400 VACANTE_NOT_ACTIVE`.
- `GET /api/postulaciones/mias` debe devolver historial del candidato autenticado.
- `GET /api/postulaciones/empresa` debe devolver solo postulaciones de vacantes de su empresa.

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
- `ProfilePerfil` y `ProfileDatosBasicos` no deben mostrar ni enviar `estado_academico`.

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

### 8) CompanyCandidatos Fase 1 (frontend)
- La vista `/app/company/candidatos` debe consultar `/api/candidatos` con `page`, `page_size` y `q`.
- Escribir en buscador debe reiniciar a pagina 1 y refrescar resultados.
- Boton `Limpiar` debe vaciar `q` y volver a pagina 1.
- Paginacion:
  - `Anterior` deshabilitado en pagina 1.
  - `Siguiente` habilitado solo cuando la respuesta trae `items.length === page_size`.
- Debe existir estado de carga, estado de error y estado vacio (general y por busqueda).
- Cards:
  - no deben mostrar separadores `?`.
  - deben mostrar datos legibles (documento, contacto, nacionalidad, nacimiento).
- Acciones por card:
  - solo visible `Ver perfil`.
  - no deben mostrarse `Cambiar estado`, `Enviar mensaje`, `Destacar`.
- Drawer de candidato:
  - debe mostrarse por secciones legibles.
  - no debe usar dump generico por `Object.entries` + `JSON.stringify`.

### 9) Vacantes + postulaciones MVP (frontend)
- `/app/company/vacantes`:
  - carga vacantes reales de `/api/vacantes/mias`,
  - crea vacante y la muestra en listado,
  - edita vacante existente,
  - cambia estado (activar/pausar/cerrar),
  - maneja estado vacio, error y paginacion,
  - boton `Ver postulados` abre subvista por vacante en la misma ruta,
  - subvista de postulados permite filtrar por `q` y paginar,
  - boton `Volver a vacantes` retorna al listado sin romper flujo,
  - en postulados, `Ver perfil` abre drawer real y botones `Copiar email` / `Copiar telefono` muestran feedback.
- `/app/candidate/vacantes`:
  - carga vacantes reales de `/api/vacantes`,
  - aplica filtros `q`, `provincia`, `modalidad`, `tipo_contrato`,
  - boton `Postular ahora` crea postulacion real,
  - maneja feedback para duplicado y vacante no activa.
- `/app/candidate/postulaciones`:
  - carga datos de `/api/postulaciones/mias`,
  - muestra vacante, empresa, fecha y estado de proceso,
  - maneja estado vacio, error y paginacion.
- `/app/company/postulaciones`:
  - se mantiene como vista legacy de transicion (no flujo principal).
- Validacion final:
  - `npm run build` en frontend termina sin errores.

## Recomendacion de automatizacion
1. Backend: incorporar `jest` + `supertest` para rutas criticas (`auth`, `candidatos`, `hoja-vida`, `integraciones`).
2. Frontend: pruebas de UI con `vitest` + `@testing-library/react`.
3. E2E: flujo login + consulta hoja de vida con Playwright.
