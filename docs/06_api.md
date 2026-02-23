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
- `403 COMPANY_ACCESS_REQUIRED`
- `403 COMPANY_ROLE_FORBIDDEN`

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
- Nota de flujo de clave temporal:
  - Si `user.must_change_password = true`, el cliente debe notificar al usuario que cambie su clave.
  - El backend devuelve el login exitoso si las credenciales son correctas y el usuario esta `activo`.
  - En frontend actual se muestra alerta no bloqueante y luego se redirige segun rol.

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
- Efecto adicional:
  - Al cambiar correctamente la clave, `usuarios.must_change_password` pasa a `0`.
- Consumo frontend actual:
  - Pantalla: `GET /app/change-password` (SPA).
  - Acceso desde dropdown de usuario (`Cambiar contrasena`) en desktop y mobile.
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
  },
  "educacion_general_items": [],
  "idiomas": [],
  "experiencia": [],
  "documentos": [],
  "formacion_detalle": []
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

### GET `/api/perfil/me/verificacion`
- Auth: requerido.
- Roles: `candidato`.
- Respuesta `200`:
```json
{
  "verificacion": {}
}
```
- Errores:
  - `404 CANDIDATO_NOT_FOUND`
  - `500 VERIFICATION_FETCH_FAILED`

### POST `/api/perfil/me/verificacion/solicitar`
- Auth: requerido.
- Roles: `candidato`.
- Body opcional:
```json
{
  "comentario": "Solicito revision de mi cuenta."
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "verificacion": {}
}
```
- Errores:
  - `404 CANDIDATO_NOT_FOUND`
  - `500 VERIFICATION_UPDATE_FAILED`

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
- Nota:
  - Actualiza el registro academico mas reciente del candidato.
  - Para multiples registros usar `/api/perfil/me/educacion-general`.

### GET `/api/perfil/me/educacion-general`
### POST `/api/perfil/me/educacion-general`
### PUT `/api/perfil/me/educacion-general/:educacionGeneralId`
### DELETE `/api/perfil/me/educacion-general/:educacionGeneralId`
- Auth: requerido.
- Roles: `candidato`.
- Body (`POST|PUT`) permitido:
  - `nivel_estudio` (`Educacion Basica|Bachillerato|Educacion Superior`)
  - `institucion`, `titulo_obtenido`
- Errores:
  - `400 INVALID_EDUCACION_GENERAL_ID`
  - `404 EDUCACION_GENERAL_NOT_FOUND`
  - `400 INVALID_PAYLOAD`

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
- Campos relevantes por item:
  - `empresa_id`: empresa local de EmpleoFacil (si existe vinculo).
  - `empresa_local_nombre`: nombre local resuelto desde `empresas` por `empresa_id`.
  - `empresa_origen`: origen externo (`ademy`) cuando la experiencia viene importada.
  - `empresa_origen_id`: id de empresa en origen externo.
  - `empresa_nombre`: snapshot del nombre de empresa (origen ADEMY o ingreso manual del candidato).
  - Importante: el importador no crea empresas ni usuarios de empresa automaticamente.

### POST `/api/perfil/me/experiencia`
- Auth: requerido.
- Roles: `candidato`.
- Body ejemplo:
```json
{
  "empresa_id": 8,
  "empresa_nombre": "Seguridad Ecuatoriana S.A.",
  "cargo": "Supervisor",
  "fecha_inicio": "2022-01-01",
  "fecha_fin": "2024-01-31",
  "actualmente_trabaja": 0,
  "tipo_contrato": "indefinido",
  "descripcion": "Gestion de equipos"
}
```
- Regla de validacion:
  - Se requiere al menos uno: `empresa_id` o `empresa_nombre`.
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

### GET `/api/perfil/me/experiencia/:experienciaId/certificado`
### POST `/api/perfil/me/experiencia/:experienciaId/certificado`
### PUT `/api/perfil/me/experiencia/:experienciaId/certificado`
### DELETE `/api/perfil/me/experiencia/:experienciaId/certificado`
- Auth: requerido.
- Roles: `candidato`.
- `POST|PUT`: `multipart/form-data` con campo `archivo` (pdf/jpg/png/webp) y metadata opcional:
  - `fecha_emision`, `descripcion`, `estado` (`pendiente|aprobado|rechazado|vencido`)
- Errores:
  - `400 INVALID_EXPERIENCIA_ID`
  - `404 EXPERIENCIA_NOT_FOUND`
  - `404 CERTIFICADO_NOT_FOUND`
  - `400 FILE_REQUIRED`
  - `400 INVALID_FILE_TYPE`
  - `400 FILE_TOO_LARGE`

### GET `/api/perfil/me/formacion`
### POST `/api/perfil/me/formacion`
### PUT `/api/perfil/me/formacion/:formacionId`
### DELETE `/api/perfil/me/formacion/:formacionId`
- Auth: requerido.
- Roles: `candidato`.
- Uso funcional:
  - Formacion academica principal se guarda con `PUT /api/perfil/me/educacion`.
  - Este CRUD de `formacion` se usa para formacion externa.
- Body formacion (externa):
  - `categoria_formacion` (`externa`)
  - `subtipo_formacion`: `curso|ministerio|ministerio_i|chofer_profesional`
  - `centro_cliente_id` (opcional)
  - `institucion`, `nombre_programa`, `titulo_obtenido`
  - Regla de integracion Ademy:
    - `institucion` debe representar empresa/sucursal cliente contratante (ej: `CENDCAP`, `CENDCAP SUCURSAL`, `CAPACITAREC`).
    - si llega `centro_cliente_id`, backend completa `institucion` con el nombre del catalogo.
  - Regla de validacion:
    - para `categoria_formacion=externa` se requiere al menos uno: `institucion` o `centro_cliente_id`.
  - `entidad_emisora`, `numero_registro`, `fecha_aprobacion`, `fecha_emision`, `fecha_vencimiento`
- Breaking change:
  - Ya no se aceptan ni se devuelven: `estado`, `fecha_inicio`, `fecha_fin`, `matricula_id`, `nivel_id`, `curso_id`, `formacion_origen_id`.
- Errores:
  - `400 INVALID_FORMACION_ID`
  - `400 CENTRO_CAPACITACION_NOT_FOUND`
  - `404 FORMACION_NOT_FOUND`
  - `422 FORMACION_INSTITUCION_REQUIRED`
  - `400 INVALID_PAYLOAD`

### GET `/api/perfil/centros-capacitacion`
- Auth: requerido.
- Roles: `candidato`, `administrador`, `superadmin`.
- Query opcional:
  - `search` (texto parcial por nombre)
  - `limit` (default `20`, max `100`)
- Respuesta `200`:
```json
{
  "items": [
    {
      "id": 1,
      "nombre": "CENDCAP",
      "origen": "ademy",
      "activo": 1
    }
  ]
}
```
### GET `/api/perfil/me/formacion/:formacionId/certificado`
### POST `/api/perfil/me/formacion/:formacionId/certificado`
### PUT `/api/perfil/me/formacion/:formacionId/certificado`
### DELETE `/api/perfil/me/formacion/:formacionId/certificado`
- Auth: requerido.
- Roles: `candidato`.
- `POST|PUT`: `multipart/form-data` con campo `archivo` (pdf/jpg/png/webp) y metadata opcional:
  - `fecha_emision`, `descripcion`, `estado` (`pendiente|aprobado|rechazado|vencido`)
- Errores:
  - `400 INVALID_FORMACION_ID`
  - `404 FORMACION_NOT_FOUND`
  - `400 FORMACION_CERTIFICADO_NOT_ALLOWED`
  - `404 CERTIFICADO_NOT_FOUND`
  - `400 FILE_REQUIRED`
  - `400 INVALID_FILE_TYPE`
  - `400 FILE_TOO_LARGE`
- Equivalentes por `:candidatoId`:
  - `GET /api/perfil/:candidatoId/formacion/:formacionId/certificado` (empresa|administrador|superadmin lectura)
  - `POST|PUT|DELETE /api/perfil/:candidatoId/formacion/:formacionId/certificado` (administrador|superadmin edicion)
  
### GET `/api/perfil/empresas-experiencia`
- Auth: requerido.
- Roles: `candidato`, `administrador`, `superadmin`.
- Query opcional:
  - `search` (texto parcial por nombre/ruc/email)
  - `limit` (default `30`, max `100`)
- Respuesta `200`:
```json
{
  "items": [
    {
      "id": 8,
      "nombre": "Seguridad Ecuatoriana S.A.",
      "ruc": "099...",
      "email": "rrhh@empresa.com",
      "tipo": "externa"
    }
  ]
}
```
- Uso operativo:
  - alimenta autocomplete del formulario de experiencia.
  - si no hay coincidencia, la experiencia puede guardarse solo con `empresa_nombre` (texto libre).

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
### GET `/api/perfil/:candidatoId/educacion-general`
### GET `/api/perfil/:candidatoId/experiencia`
### GET `/api/perfil/:candidatoId/experiencia/:experienciaId/certificado`
### GET `/api/perfil/:candidatoId/formacion`
### GET `/api/perfil/:candidatoId/documentos`
- Auth: requerido.
- Roles: `empresa`, `administrador`, `superadmin`.

### POST|PUT|DELETE `/api/perfil/:candidatoId/idiomas*`
### POST|PUT|DELETE `/api/perfil/:candidatoId/educacion-general*`
### POST|PUT|DELETE `/api/perfil/:candidatoId/experiencia*`
### POST|PUT|DELETE `/api/perfil/:candidatoId/experiencia/:experienciaId/certificado`
### POST|PUT|DELETE `/api/perfil/:candidatoId/formacion*`
### POST|PUT|DELETE `/api/perfil/:candidatoId/documentos*`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.

## Perfil de empresa

Base: `/api/company/perfil`

Nota:
- En el alcance actual no hay modulo de facturacion en frontend ni endpoints publicos de facturacion para empresa.

### GET `/api/company/perfil/me`
- Auth: requerido.
- Acceso: membresia activa en `empresas_usuarios`.
- Respuesta `200`:
```json
{
  "empresa": {},
  "perfil": {},
  "resumen": {
    "porcentaje_completitud": 0,
    "campos_pendientes": []
  },
  "verificacion": {}
}
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_FETCH_FAILED`

### PUT `/api/company/perfil/me/datos-generales`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin|reclutador`.
- Body permitido (parcial):
  - `nombre`, `ruc`, `email`, `telefono`
  - `industria`, `ubicacion_principal`, `tamano_empleados`, `descripcion`
  - `sitio_web`, `linkedin_url`, `instagram_url`, `facebook_url`
- Regla de completitud:
  - Obligatorios para el porcentaje: `nombre`, `industria`, `ubicacion_principal`, `tamano_empleados`, `descripcion`, `sitio_web`, `instagram_url`, `facebook_url`, `logo_url`.
  - Opcional para el porcentaje: `linkedin_url`.
- Regla operativa adicional:
  - si cambia `nombre`, backend intenta autovincular experiencias historicas donde `candidatos_experiencia.empresa_nombre` coincide exactamente (normalizado) y `empresa_id` aun es `NULL`.
- Respuesta `200`:
```json
{
  "ok": true,
  "empresa": {},
  "perfil": {},
  "resumen": {}
}
```
- Errores:
  - `400 INVALID_PAYLOAD`
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_UPDATE_FAILED`

### POST `/api/company/perfil/me/logo`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin|reclutador`.
- Tipo: `multipart/form-data`.
- Campos:
  - `logo` (requerido, `image/jpeg|image/png|image/webp`, max 5 MB)
- Respuesta `200`:
```json
{
  "ok": true,
  "logo_url": "/uploads/empresas/logos/archivo.png",
  "empresa": {},
  "perfil": {},
  "resumen": {}
}
```
- Errores:
  - `400 FILE_REQUIRED`
  - `400 INVALID_FILE_TYPE`
  - `400 FILE_TOO_LARGE`
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_UPDATE_FAILED`

### DELETE `/api/company/perfil/me/logo`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin|reclutador`.
- Respuesta `200`:
```json
{
  "ok": true,
  "logo_url": null,
  "empresa": {},
  "perfil": {},
  "resumen": {}
}
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_UPDATE_FAILED`

### GET `/api/company/perfil/me/usuarios`
- Auth: requerido.
- Acceso: membresia activa en `empresas_usuarios`.
- Respuesta `200`:
```json
{
  "items": [
    {
      "id": 1,
      "empresa_id": 1,
      "usuario_id": 2,
      "rol_empresa": "admin",
      "principal": true,
      "estado": "activo",
      "nombre": "Usuario Empresa",
      "email": "empresa@correo.com"
    }
  ]
}
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_FETCH_FAILED`

### POST `/api/company/perfil/me/usuarios`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin`.
- Body:
```json
{
  "email": "reclutador@correo.com",
  "rol_empresa": "reclutador",
  "principal": false
}
```
- Respuesta `201`:
```json
{
  "ok": true,
  "items": []
}
```
- Errores:
  - `400 INVALID_PAYLOAD`
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `404 USER_NOT_FOUND`
  - `409 USER_ALREADY_LINKED`
  - `500 PROFILE_UPDATE_FAILED`

### PUT `/api/company/perfil/me/usuarios/:empresaUsuarioId`
### DELETE `/api/company/perfil/me/usuarios/:empresaUsuarioId`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin`.
- Body (`PUT`) permitido (parcial):
  - `rol_empresa` (`admin|reclutador|visor`)
  - `estado` (`activo|inactivo`)
  - `principal` (`0|1|false|true`)
- Respuesta `200`:
```json
{
  "ok": true,
  "items": []
}
```
- Errores:
  - `400 INVALID_EMPRESA_USUARIO_ID`
  - `400 INVALID_PAYLOAD`
  - `400 LAST_ADMIN_REQUIRED`
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `404 LINK_NOT_FOUND`
  - `500 PROFILE_UPDATE_FAILED`

### GET `/api/company/perfil/me/preferencias`
- Auth: requerido.
- Acceso: membresia activa en `empresas_usuarios`.
- Respuesta `200`:
```json
{
  "preferencias": {
    "empresa_id": 1,
    "modalidades_permitidas": ["presencial", "hibrido"],
    "niveles_experiencia": ["junior", "semi_senior"],
    "observaciones": null
  }
}
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_FETCH_FAILED`

### PUT `/api/company/perfil/me/preferencias`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin|reclutador`.
- Body:
```json
{
  "modalidades_permitidas": ["presencial", "hibrido"],
  "niveles_experiencia": ["junior", "semi_senior"],
  "observaciones": "Priorizamos perfil operativo."
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "preferencias": {}
}
```
- Errores:
  - `400 INVALID_PAYLOAD`
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_UPDATE_FAILED`

### DELETE `/api/company/perfil/me`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin`.
- Efecto:
  - soft delete en `empresas` (`activo=0`, `deleted_at=NOW()`),
  - desactiva (`estado=inactivo`) los registros de `empresas_usuarios`.
- Respuesta `200`:
```json
{ "ok": true }
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `500 PROFILE_DELETE_FAILED`

### GET `/api/company/perfil/me/verificacion`
- Auth: requerido.
- Acceso: membresia activa en `empresas_usuarios`.
- Respuesta `200`:
```json
{
  "verificacion": {}
}
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `404 EMPRESA_NOT_FOUND`
  - `500 VERIFICATION_FETCH_FAILED`

### POST `/api/company/perfil/me/verificacion/solicitar`
- Auth: requerido.
- Acceso: `rol_empresa` en `admin|reclutador`.
- Body opcional:
```json
{
  "comentario": "Solicito revision de mi cuenta."
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "verificacion": {}
}
```
- Errores:
  - `403 COMPANY_ACCESS_REQUIRED`
  - `403 COMPANY_ROLE_FORBIDDEN`
  - `404 EMPRESA_NOT_FOUND`
  - `500 VERIFICATION_UPDATE_FAILED`

## Verificaciones (admin)

Base: `/api/verificaciones`

### GET `/api/verificaciones/cuentas`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Query opcional:
  - `tipo` (`empresa|candidato`)
  - `estado` (`pendiente|en_revision|aprobada|rechazada|vencida|suspendida`)
  - `q`, `page`, `page_size`
- Respuesta `200`:
```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0
}
```

### GET `/api/verificaciones/cuentas/:verificacionId`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Respuesta `200`:
```json
{
  "verificacion": {},
  "eventos": []
}
```
- Errores:
  - `400 INVALID_VERIFICACION_ID`
  - `404 VERIFICACION_NOT_FOUND`
  - `500 VERIFICATION_FETCH_FAILED`

### PUT `/api/verificaciones/cuentas/:verificacionId/estado`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Body:
```json
{
  "estado": "aprobada",
  "nivel": "completo",
  "motivo_rechazo": null,
  "notas_admin": "Revision documental correcta.",
  "comentario": "Aprobada por admin.",
  "expires_at": "2027-01-01T00:00:00.000Z"
}
```
- Reglas:
  - `motivo_rechazo` es requerido cuando `estado = rechazada`.
  - `administrador` no puede usar `estado = suspendida` (`SUPERADMIN_REQUIRED`).
- Errores:
  - `400 INVALID_VERIFICACION_ID`
  - `400 INVALID_ESTADO`
  - `400 INVALID_NIVEL`
  - `400 MOTIVO_RECHAZO_REQUIRED`
  - `400 INVALID_EXPIRES_AT`
  - `403 SUPERADMIN_REQUIRED`
  - `404 VERIFICACION_NOT_FOUND`
  - `500 VERIFICATION_UPDATE_FAILED`

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

Nota operativa:
- El importador de acreditados intenta enriquecer `experiencia.empresa_id` con nombre de empresa via `GET /api/empresas/s2s` en ADEMY.
- Si ese endpoint S2S no existe/no autoriza, se usa fallback `Empresa ADEMY #<id>` hasta mapear nombre manual o habilitar el endpoint.
- El modulo `empresas-mapeo` de esta seccion solo aplica a origen `ademy`.
- Empresas digitadas manualmente por candidatos en EmpleoFacil (`empresa_origen IS NULL`) no aparecen en este mapeo.

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
- Efecto adicional al crear cuenta de candidato en import:
  - Se crea usuario con `estado='activo'`, `activo=1`, `rol='candidato'`, `must_change_password=1`.
  - Clave inicial temporal: `documento_identidad`; si no existe, usa `email`.
  - Luego del primer login, el sistema debe forzar operativamente el cambio via `POST /auth/change-password`.
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

### GET `/api/integraciones/ademy/empresas-mapeo`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Query params:
  - `estado` (`pendiente|vinculada|descartada`, opcional)
  - `q` (busqueda por nombre origen, empresa local o id origen)
  - `page` (default `1`)
  - `page_size` (default `20`, max `100`)
- Respuesta `200`:
```json
{
  "items": [
    {
      "id": 1,
      "origen": "ademy",
      "origen_empresa_id": 120001,
      "nombre_origen": "Seguridad Ecuatoriana S.A.",
      "empresa_id": 8,
      "estado": "vinculada",
      "empresa_local_nombre": "Seguridad Ecuatoriana S.A.",
      "experiencias_total": 30,
      "experiencias_sin_vinculo": 0
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```
- Errores:
  - `409 MAPPING_TABLE_NOT_FOUND`
  - `409 MAPPING_SCHEMA_OUTDATED`
  - `500 MAPPING_LIST_FAILED`

### GET `/api/integraciones/ademy/empresas-locales?q=<texto>&limit=20`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Respuesta `200`:
```json
{
  "items": [
    { "id": 8, "nombre": "Seguridad Ecuatoriana S.A.", "ruc": "099...", "email": "rrhh@empresa.com", "tipo": "externa" }
  ]
}
```
- Error `500 EMPRESAS_SEARCH_FAILED`.

### PUT `/api/integraciones/ademy/empresas-mapeo/:origenEmpresaId/vincular`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Body:
```json
{
  "empresa_id": 8,
  "nombre_origen": "Seguridad Ecuatoriana S.A."
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "mapping": {},
  "experiencias_actualizadas": 30
}
```
- Errores:
  - `400 INVALID_ORIGEN_EMPRESA_ID`
  - `400 EMPRESA_ID_REQUIRED`
  - `404 EMPRESA_NOT_FOUND`
  - `409 MAPPING_TABLE_NOT_FOUND`
  - `409 MAPPING_SCHEMA_OUTDATED`
  - `500 MAPPING_UPDATE_FAILED`

### PUT `/api/integraciones/ademy/empresas-mapeo/:origenEmpresaId/nombre`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Body:
```json
{
  "nombre_origen": "Sesep Cia. Ltda."
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "mapping": {},
  "experiencias_actualizadas": 1
}
```
- Errores:
  - `400 INVALID_ORIGEN_EMPRESA_ID`
  - `400 NOMBRE_ORIGEN_REQUIRED`
  - `409 MAPPING_TABLE_NOT_FOUND`
  - `409 MAPPING_SCHEMA_OUTDATED`
  - `500 MAPPING_NAME_UPDATE_FAILED`

### PUT `/api/integraciones/ademy/empresas-mapeo/:origenEmpresaId/descartar`
- Auth: requerido.
- Roles: `administrador`, `superadmin`.
- Body opcional:
```json
{
  "nombre_origen": "Empresa desconocida"
}
```
- Respuesta `200`:
```json
{
  "ok": true,
  "mapping": {},
  "experiencias_actualizadas": 30
}
```
- Errores:
  - `400 INVALID_ORIGEN_EMPRESA_ID`
  - `409 MAPPING_TABLE_NOT_FOUND`
  - `409 MAPPING_SCHEMA_OUTDATED`
  - `500 MAPPING_DISCARD_FAILED`

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
