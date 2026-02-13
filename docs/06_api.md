# API EmpleoFacil

## Hoja de vida

### GET `/api/hoja-vida/:estudianteId`

Obtiene el formato consolidado de hoja de vida de un estudiante a partir de las tablas:

- `estudiantes`
- `estudiantes_contacto`
- `estudiantes_domicilio`
- `estudiantes_salud`
- `estudiantes_logistica`
- `estudiantes_educacion_general`
- `estudiantes_experiencia`
- `estudiantes_formaciones`
- `estudiantes_documentos`

Roles permitidos:

- `administrador`
- `superadmin`
- `empresa`

Headers:

- `Authorization: Bearer <token>`

Respuesta `200` (ejemplo):

```json
{
  "perfil": {
    "estudiante_id": 10,
    "usuario_id": null,
    "nombres": "Juan",
    "apellidos": "Perez",
    "nombre_completo": "Juan Perez",
    "documento_identidad": "1234567890",
    "nacionalidad": "Ecuatoriana",
    "fecha_nacimiento": "2000-01-01",
    "edad": 26,
    "sexo": "M",
    "estado_civil": "soltero",
    "estado_academico": "matriculado",
    "activo": true
  },
  "contacto": {
    "email": "juan@correo.com",
    "telefono_fijo": null,
    "telefono_celular": "0999999999",
    "contacto_emergencia_nombre": "Maria Perez",
    "contacto_emergencia_telefono": "0988888888"
  },
  "domicilio": {
    "pais": "Ecuador",
    "provincia": "Pichincha",
    "canton": "Quito",
    "parroquia": "Centro",
    "direccion": "Av. Ejemplo 123",
    "codigo_postal": "170101"
  },
  "salud": {
    "tipo_sangre": "O+",
    "estatura": "1.75",
    "peso": "72.00",
    "tatuaje": "no"
  },
  "logistica": {
    "movilizacion": true,
    "tipo_vehiculo": "motocicleta",
    "licencia": "A",
    "disp_viajar": true,
    "disp_turnos": true,
    "disp_fines_semana": false
  },
  "educacion_general": {
    "nivel_estudio": "Bachillerato",
    "institucion": "Unidad Educativa X",
    "titulo_obtenido": "Bachiller Tecnico"
  },
  "experiencia_laboral": [],
  "formaciones": [],
  "documentos": [],
  "metadata": {
    "created_at": "2026-01-20 08:00:00",
    "updated_at": "2026-02-01 12:30:00"
  }
}
```

Errores:

- `400 INVALID_ESTUDIANTE_ID`
- `404 ESTUDIANTE_NOT_FOUND`
- `500 HOJA_VIDA_FETCH_FAILED`

### GET `/api/hoja-vida/:estudianteId/pdf`

Genera y retorna la hoja de vida en formato PDF (contenido generado en backend service).

Roles permitidos:

- `administrador`
- `superadmin`
- `empresa`

Headers:

- `Authorization: Bearer <token>`

Respuesta `200`:

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="hoja_vida_<nombre>.pdf"`

Errores:

- `400 INVALID_ESTUDIANTE_ID`
- `404 ESTUDIANTE_NOT_FOUND`
- `500 HOJA_VIDA_PDF_FAILED`
