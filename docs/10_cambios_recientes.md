# Cambios recientes (cuentas, verificacion y reactivacion)

## Fecha de corte
- 2026-02-24

## Resumen funcional
- Se implemento flujo completo de desactivacion y reactivacion para cuentas empresa.
- Se habilito solicitud de verificacion para candidato desde frontend (antes solo empresa).
- Se mejoro la captura documental en candidato con mini tutorial movil (3 slides + swipe).
- Se consolido la operacion de solicitudes en admin (verificacion empresas, reactivacion empresas, solicitudes candidatos).

## Frontend

### Empresa
- `CompanyPerfil`:
  - Encuesta obligatoria al desactivar cuenta.
  - Motivos en seleccion multiple.
  - Campo `Otro motivo` solo visible cuando se marca `otro`.
  - Confirmacion modal antes de ejecutar desactivacion.
  - Encuesta de desactivacion de envio unico.
- `CompanyAccountInactive` (`/app/company/inactiva`):
  - Vista de cuenta inactiva con bloque "Antes de desactivar".
  - Encuesta de reactivacion "Despues de desactivar" (seleccion multiple, obligatoria).
  - Campo `Otro motivo` condicional.
  - Envio unico de encuesta de reactivacion.
  - Una vez enviada, ya no se muestra formulario: se reemplaza por card `Revision solicitada`.

### Candidato
- `ProfileDocumentos`:
  - Mini tutorial visual solo en movil con camara disponible.
  - Carrusel reducido a 3 slides.
  - Slide 1 integra texto + imagen de referencia (sin botones internos anverso/reverso).
  - Soporte de swipe horizontal en movil para navegar slides.
  - En escritorio no se muestra bloque informativo extra del tutorial.
  - Nuevo card `Verificacion de cuenta`:
    - Muestra estado (`pendiente`, `en_revision`, `verificada`, `rechazada`, etc.).
    - Muestra checklist de elegibilidad documental.
    - Boton `Solicitar revision` con bloqueo por estado o por falta de documentos.

### Admin
- `AdminSolicitudes`:
  - Tabs operativas:
    - Verificacion empresas
    - Reactivacion empresas
    - Solicitudes candidatos
  - Desde frontend admin/superadmin puede aprobar/rechazar reactivaciones de empresa.

## Backend y reglas de negocio

### Reactivacion/desactivacion de empresa
- La desactivacion (`DELETE /api/company/perfil/me`) ahora exige payload con encuesta valida.
- Validaciones:
  - `motivos_codigos` obligatorio.
  - Si incluye `otro`, `motivo_detalle` es obligatorio.
  - Encuesta de desactivacion solo puede enviarse una vez (`DEACTIVATION_SURVEY_ALREADY_SUBMITTED`).
- Al desactivar:
  - Empresa pasa a inactiva.
  - Se inactivan todos los usuarios de la empresa.
  - Se guarda snapshot de usuarios activos previos en `usuarios_activos_json`.

- Reactivacion:
  - `GET /api/company/reactivacion/me` devuelve ultima solicitud + ultima desactivacion.
  - `POST /api/company/reactivacion/me/solicitar` crea solicitud con encuesta.
  - Encuesta de reactivacion solo puede enviarse una vez (`REACTIVATION_SURVEY_ALREADY_SUBMITTED`).
  - Si admin aprueba (`PUT /api/verificaciones/reactivaciones/empresas/:reactivacionId/estado`):
    - La empresa vuelve a estado activo.
    - Se reactivan solo los usuarios que estaban activos al momento de desactivar (snapshot).
    - Fallback legacy: si no hay snapshot, se activa al menos el/los `admin`.

### Verificacion de candidato
- Endpoint ya existente y ahora integrado en frontend:
  - `GET /api/perfil/me/verificacion`
  - `POST /api/perfil/me/verificacion/solicitar`
- Regla documental para solicitar/aprobar:
  - Cedula por ambos lados (anverso + reverso) o
  - Licencia de conducir valida.
- Si no cumple, backend responde `422 CANDIDATE_VERIFICATION_DOCUMENTS_REQUIRED`.

### Reapertura de solicitudes de verificacion
- Cuando una cuenta esta `rechazada`, `vencida` o `suspendida`, puede volver a solicitar.
- El backend restablece estado a `pendiente` y registra evento de solicitud.

## Base de datos

### Nuevas tablas/columnas usadas
- `empresas_desactivaciones`:
  - `motivos_codigos_json`
  - `usuarios_activos_json`
  - `motivo_detalle`
  - `requiere_soporte`
- `empresas_reactivaciones`:
  - `estado`
  - `motivos_codigos_json`
  - `motivo_detalle`
  - `acciones_realizadas`
  - `comentario_admin`
  - `reviewed_by`, `reviewed_at`

### Ajustes de documentos candidato
- `candidatos_documentos` ahora maneja `lado_documento` (`anverso`/`reverso`) para cedula.
- Ya no se usa unicidad global por `(candidato_id, tipo_documento)` para soportar ambos lados.
- Se utiliza indice `idx_candidatos_documentos_lado`.

## Impacto operativo
- Si el backend no expone rutas nuevas de reactivacion, el frontend muestra mensaje de endpoint no disponible.
- Para ambientes existentes, ejecutar ajustes SQL de `init.sql` (o migracion equivalente) antes de probar los flujos.
