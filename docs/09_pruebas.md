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
- `POST /api/perfil/me/experiencia` crea experiencia y devuelve `201`.
- `PUT/DELETE /api/perfil/me/experiencia/:experienciaId` validan ownership y responden `404` si no existe.
- `POST /api/perfil/me/documentos` (multipart) crea metadata + archivo.
- `POST /api/perfil/me/documentos` sin archivo devuelve `400 FILE_REQUIRED`.
- `POST /api/perfil/me/documentos` con mime invalido devuelve `400 INVALID_FILE_TYPE`.
- `POST /api/perfil/me/documentos` con archivo grande devuelve `400 FILE_TOO_LARGE`.

## Checklist de regresion rapida
- Login funciona por email.
- Login funciona por documento de candidato.
- Cambio de password limpia `must_change_password`.
- Cron no corre cuando `ADEMY_SYNC_ENABLED=false`.

## Pruebas manuales frontend (perfil candidato wizard)

### 1) Layout y navegacion
- Entrar a `/perfil/datos-basicos` y verificar layout 2 columnas en desktop (form + sidebar).
- Verificar que en mobile el sidebar aparece debajo del formulario.
- Verificar tabs visibles: `Informacion basica`, `Datos personales`, `Preferencias`, `Formacion`, `Idiomas`, `Experiencia`, `Documentos`.

### 2) Sidebar de estado
- Confirmar barra de progreso y checklist por estado (`Completo`, `Pendiente`, `Fase 2`).
- Confirmar que la seccion actual aparece resaltada y marcada como `Actual`.
- Cuando Fase 1 llegue a 100%, validar mensaje compacto: `Perfil base completo. Puedes avanzar a Fase 2.`

### 3) CTAs contextuales por completitud
- En seccion completa: botones `Actualizar informacion` (primario) y `Cancelar` (secundario).
- En seccion pendiente: botones `Guardar` y `Guardar y continuar`.
- `Cancelar` debe volver a `/app/candidate/perfil` sin guardar cambios.

### 4) Alertas contextuales de edicion
- En `datos-basicos`, cambiar `email`, `telefono celular` o `documento` y validar alertas en sidebar.
- En `datos-personales`, cambiar `email` o `telefono celular` y validar alertas en sidebar.
- Revertir el valor original debe ocultar la alerta correspondiente.

### 5) Integridad de flujo
- `Guardar` mantiene comportamiento de persistencia actual.
- `Guardar y continuar` mantiene navegacion esperada entre tabs.
- Ejecutar build frontend sin errores.

### 6) Perfil candidato Fase 2 (frontend)
- `ProfileIdiomas` permite crear, editar y eliminar items.
- `ProfileExperiencia` permite crear, editar y eliminar items.
- `ProfileDocumentos` permite subir archivo y actualizar metadatos.
- El dashboard de perfil actualiza progreso total al completar secciones de Fase 2.
- El drawer de empresa muestra `idiomas`, `experiencia` y `documentos` del candidato.

## Recomendacion de automatizacion
1. Backend: incorporar `jest` + `supertest` para rutas criticas (`auth`, `candidatos`, `hoja-vida`, `integraciones`).
2. Frontend: pruebas de UI con `vitest` + `@testing-library/react`.
3. E2E: flujo login + consulta hoja de vida con Playwright.
