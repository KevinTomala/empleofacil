# API EmpleoFacil

## Base URL
- Local: `http://localhost:3000`

## Autenticacion y permisos
- El backend usa JWT en header `Authorization: Bearer <token>`.
- Endpoints publicos: `GET /`, `GET /healthz`, `POST /auth/bootstrap`, `POST /auth/login`.
- Endpoints protegidos usan `authRequired`.
- Endpoints con rol usan `requireRole`.

Errores comunes:
- `401 AUTH_REQUIRED`
- `401 INVALID_TOKEN`
- `403 FORBIDDEN`

## Health

### GET `/healthz`
- Respuesta `200`:
```json
{ "status": "OK" }
```

### GET `/`
- Respuesta `200` (texto plano):
```txt
EmpleoFacil API
```

## Auth

### POST `/auth/bootstrap`
- Descripcion: crea usuario inicial `superadmin` si `usuarios` esta vacia.
- Body:
```json
{
  "email": "admin@empleofacil.com",
  "password": "secret123",
  "nombre_completo": "Super Admin"
}
```
- Respuesta `200`:
```json
{ "ok": true }
```
- Errores:
  - `400 MISSING_FIELDS`
  - `409 BOOTSTRAP_ALREADY_DONE`

### POST `/auth/login`
- Descripcion: login por `email` o por documento de candidato.
- Body:
```json
{
  "identifier": "admin@empleofacil.com",
  "password": "secret123"
}
```
- Respuesta `200`:
```json
{
  "token": "jwt",
  "user": {
    "id": 1,
    "email": "admin@empleofacil.com",
    "rol": "superadmin",
    "nombre_completo": "Super Admin",
    "must_change_password": false
  }
}
```
- Errores:
  - `400 MISSING_FIELDS`
  - `401 INVALID_CREDENTIALS`
  - `403 USER_INACTIVE`

### POST `/auth/change-password`
- Auth: requerido.
- Body:
```json
{
  "current_password": "old123456",
  "new_password": "new123456"
}
```
- Respuesta `200`:
```json
{ "ok": true }
```
- Errores:
  - `400 MISSING_FIELDS`
  - `400 WEAK_PASSWORD`
  - `400 PASSWORD_REUSE_NOT_ALLOWED`
  - `401 INVALID_CURRENT_PASSWORD`
  - `403 USER_INACTIVE`
  - `404 USER_NOT_FOUND`

## Candidatos

### GET `/api/candidatos`
- Auth: requerido.
- Roles: `administrador`, `superadmin`, `empresa`.
- Query params:
  - `page` (default `1`)
  - `page_size` (default `20`, max `100`)
  - `q` (filtro por nombre, apellido, documento o email)
- Respuesta `200`:
```json
{
  "items": [
    {
      "id": 10,
      "nombres": "Juan",
      "apellidos": "Perez",
      "documento_identidad": "1234567890",
      "nacionalidad": "Ecuatoriana",
      "fecha_nacimiento": "2000-01-01",
      "email": "juan@correo.com",
      "telefono_celular": "0999999999"
    }
  ],
  "page": 1,
  "page_size": 20
}
```

## Perfil de candidato

Base: `/api/perfil`

Respuesta `GET` exitosa:
```json
{
  "datos_basicos": {
    "id": 10,
    "usuario_id": 25,
    "centro_id": null,
    "interesado_id": null,
    "referente_id": null,
    "nombres": "Juan",
    "apellidos": "Perez",
    "documento_identidad": "1234567890",
    "nacionalidad": "Ecuatoriana",
    "fecha_nacimiento": "2000-01-01",
    "sexo": "M",
    "estado_civil": "soltero",
    "estado_academico": "inscrito",
    "activo": 1
  },
  "contacto": {
    "email": "juan@correo.com",
    "telefono_fijo": null,
    "telefono_celular": "0999999999",
    "contacto_emergencia_nombre": null,
    "contacto_emergencia_telefono": null
  },
  "domicilio": {
    "pais": null,
    "provincia": null,
    "canton": null,
    "parroquia": null,
    "direccion": null,
    "codigo_postal": null
  },
  "salud": {
    "tipo_sangre": null,
    "estatura": null,
    "peso": null,
    "tatuaje": null
  },
  "logistica": {
    "movilizacion": null,
    "tipo_vehiculo": null,
    "licencia": null,
    "disp_viajar": null,
    "disp_turnos": null,
    "disp_fines_semana": null
  },
  "educacion": {
    "nivel_estudio": null,
    "institucion": null,
    "titulo_obtenido": null
  }
}
```

Respuesta `PUT` exitosa:
```json
{ "ok": true }
```

Errores esperados:
- `400 INVALID_PAYLOAD`
- `400 INVALID_CANDIDATO_ID`
- `404 CANDIDATO_NOT_FOUND`
- `403 FORBIDDEN`
- `500 PROFILE_FETCH_FAILED`
- `500 PROFILE_UPDATE_FAILED`

### GET `/api/perfil/me`
- Auth: requerido.
- Roles: `candidato`.

### PUT `/api/perfil/me/datos-basicos`
- Auth: requerido.
- Roles: `candidato`.
- Body permitido (parcial):
  - `centro_id`, `interesado_id`, `referente_id`
  - `nombres`, `apellidos`, `documento_identidad`, `nacionalidad`, `fecha_nacimiento`
  - `sexo` (`M|F|O`)
  - `estado_civil` (`soltero|casado|viudo|divorciado|union_libre`)
  - `estado_academico` (`preinscrito|inscrito|matriculado|rechazado`)
  - `activo` (`0|1|false|true`)

### PUT `/api/perfil/me/contacto`
- Auth: requerido.
- Roles: `candidato`.
- Body permitido (parcial):
  - `email`, `telefono_fijo`, `telefono_celular`
  - `contacto_emergencia_nombre`, `contacto_emergencia_telefono`

### PUT `/api/perfil/me/domicilio`
- Auth: requerido.
- Roles: `candidato`.
- Body permitido (parcial):
  - `pais`, `provincia`, `canton`, `parroquia`, `direccion`, `codigo_postal`

### PUT `/api/perfil/me/salud`
- Auth: requerido.
- Roles: `candidato`.
- Body permitido (parcial):
  - `tipo_sangre` (`A+|A-|B+|B-|AB+|AB-|O+|O-`)
  - `estatura`, `peso`
  - `tatuaje` (`no|si_visible|si_no_visible`)

### PUT `/api/perfil/me/logistica`
- Auth: requerido.
- Roles: `candidato`.
- Body permitido (parcial):
  - `movilizacion`, `disp_viajar`, `disp_turnos`, `disp_fines_semana` (`0|1|false|true`)
  - `tipo_vehiculo` (`automovil|bus|camion|camioneta|furgoneta|motocicleta|trailer|tricimoto`)
  - `licencia` (`A|A1|B|C1|C|D1|D|E1|E|F|G`)

### PUT `/api/perfil/me/educacion`
- Auth: requerido.
- Roles: `candidato`.
- Body permitido (parcial):
  - `nivel_estudio` (`Educacion Basica|Bachillerato|Educacion Superior`)
  - `institucion`, `titulo_obtenido`

### GET `/api/perfil/me/idiomas`
- Auth: requerido.
- Roles: `candidato`.
- Respuesta `200`:
```json
{ "items": [] }
```

### POST `/api/perfil/me/idiomas`
- Auth: requerido.
- Roles: `candidato`.
- Body:
```json
{ "idioma": "Ingles", "nivel": "Intermedio" }
```
- Respuesta `201`:
```json
{ "ok": true, "id": 1 }
```
- Errores:
  - `400 INVALID_PAYLOAD`

### PUT `/api/perfil/me/idiomas/:idiomaId`
### DELETE `/api/perfil/me/idiomas/:idiomaId`
- Auth: requerido.
- Roles: `candidato`.
- Errores:
  - `400 INVALID_IDIOMA_ID`
  - `404 IDIOMA_NOT_FOUND`

### GET `/api/perfil/me/experiencia`
- Auth: requerido.
- Roles: `candidato`.
- Respuesta `200`:
```json
{ "items": [] }
```

### POST `/api/perfil/me/experiencia`
- Auth: requerido.
- Roles: `candidato`.
- Body ejemplo:
```json
{
  "cargo": "Supervisor",
  "fecha_inicio": "2022-01-01",
  "fecha_fin": "2024-01-31",
  "actualmente_trabaja": 0,
  "tipo_contrato": "indefinido",
  "descripcion": "Gestion de equipos"
}
```
- Respuesta `201`:
```json
{ "ok": true, "id": 10 }
```

### PUT `/api/perfil/me/experiencia/:experienciaId`
### DELETE `/api/perfil/me/experiencia/:experienciaId`
- Auth: requerido.
- Roles: `candidato`.
- Errores:
  - `400 INVALID_EXPERIENCIA_ID`
  - `404 EXPERIENCIA_NOT_FOUND`

### GET `/api/perfil/me/documentos`
- Auth: requerido.
- Roles: `candidato`.
- Respuesta `200`:
```json
{ "items": [] }
```

### POST `/api/perfil/me/documentos`
- Auth: requerido.
- Roles: `candidato`.
- Tipo: `multipart/form-data`.
- Campos:
  - `archivo` (requerido)
  - `tipo_documento` (requerido)
  - `fecha_emision`, `fecha_vencimiento`, `numero_documento`, `descripcion`, `observaciones` (opcionales)
- Errores:
  - `400 FILE_REQUIRED`
  - `400 INVALID_TIPO_DOCUMENTO`
  - `400 INVALID_FILE_TYPE`
  - `400 FILE_TOO_LARGE`

### PUT `/api/perfil/me/documentos/:documentoId`
### DELETE `/api/perfil/me/documentos/:documentoId`
- Auth: requerido.
- Roles: `candidato`.
- Errores:
  - `400 INVALID_DOCUMENTO_ID`
  - `404 DOCUMENTO_NOT_FOUND`

### GET `/api/perfil/:candidatoId`
- Auth: requerido.
- Roles: `empresa`, `administrador`, `superadmin`.

### PUT `/api/perfil/:candidatoId/datos-basicos`
### PUT `/api/perfil/:candidatoId/contacto`
### PUT `/api/perfil/:candidatoId/domicilio`
### PUT `/api/perfil/:candidatoId/salud`
### PUT `/api/perfil/:candidatoId/logistica`
### PUT `/api/perfil/:candidatoId/educacion`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.

### GET `/api/perfil/:candidatoId/idiomas`
### GET `/api/perfil/:candidatoId/experiencia`
### GET `/api/perfil/:candidatoId/documentos`
- Auth: requerido.
- Roles: `empresa`, `administrador`, `superadmin`.

### POST|PUT|DELETE `/api/perfil/:candidatoId/idiomas*`
### POST|PUT|DELETE `/api/perfil/:candidatoId/experiencia*`
### POST|PUT|DELETE `/api/perfil/:candidatoId/documentos*`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.

## Hoja de vida

### GET `/api/hoja-vida/:estudianteId`
- Auth: requerido.
- Roles: `administrador`, `superadmin`, `empresa`.
- Respuesta `200`: consolidado de perfil, contacto, domicilio, salud, logistica, educacion, experiencia, formaciones, documentos.
- Errores:
  - `400 INVALID_ESTUDIANTE_ID`
  - `404 ESTUDIANTE_NOT_FOUND`
  - `500 HOJA_VIDA_FETCH_FAILED`

### GET `/api/hoja-vida/:estudianteId/pdf`
- Auth: requerido.
- Roles: `administrador`, `superadmin`, `empresa`.
- Respuesta `200`:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="hoja_vida_<nombre>.pdf"`
- Errores:
  - `400 INVALID_ESTUDIANTE_ID`
  - `404 ESTUDIANTE_NOT_FOUND`
  - `500 HOJA_VIDA_PDF_FAILED`

## Integraciones (Ademy)

### POST `/api/integraciones/ademy/acreditados/import`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Body opcional:
```json
{
  "promocion_id": 123,
  "curso_id": 45,
  "fecha_desde": "2026-01-01",
  "fecha_hasta": "2026-01-31",
  "updated_since": "2026-02-01T00:00:00.000Z",
  "page_size": 100
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "total": 120,
  "created": 10,
  "updated": 95,
  "skipped": 10,
  "errors": 5
}
```
- Errores:
  - `409 SYNC_ALREADY_RUNNING`
  - `500 SYNC_FAILED`

### GET `/api/integraciones/ademy/convocatorias`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Respuesta `200`:
```json
{ "items": [] }
```
- Error `500 CATALOGO_ERROR`.

### GET `/api/integraciones/ademy/convocatorias/:id/cursos`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Respuesta `200`:
```json
{ "items": [] }
```
- Error `500 CATALOGO_ERROR`.

### GET `/api/integraciones/ademy/convocatorias/:id/promociones?curso_id=<id>`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Respuesta `200`:
```json
{ "items": [] }
```
- Errores:
  - `400 CURSO_ID_REQUIRED`
  - `500 CATALOGO_ERROR`

## Lineamiento de archivos (R2 dual bucket)
- EmpleoFacil opera con 2 buckets R2:
  - `ademy` como origen de archivos heredados.
  - `empleofacil` como destino de archivos nuevos/subidos localmente.
- Para archivos de Ademy no se debe duplicar por defecto. La API debe resolver acceso por referencia usando puntero en BD (`origen`, `bucket`, `object_key`).
- El backend debe exponer descarga/visualizacion mediante URL firmada temporal o proxy seguro.
- Si el objeto vive en bucket de Ademy, el backend puede:
  - Firmar lectura directa si tiene credenciales de ese bucket.
  - O solicitar a Ademy una URL firmada y reenviarla al cliente.
- Solo se copia fisicamente a bucket `empleofacil` cuando aplique politica de copia (legal, continuidad operativa o copy-on-write).
- Regla al actualizar documentos heredados:
  - Si un documento con `origen=ademy` es reemplazado por el usuario en EmpleoFacil, el backend debe guardar la nueva version en bucket `empleofacil`.
  - El registro vigente debe quedar con `origen=empleofacil` y puntero al nuevo `object_key`.
  - La referencia anterior de Ademy debe conservarse como historial (trazabilidad/auditoria).
