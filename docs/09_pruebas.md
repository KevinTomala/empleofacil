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

## Checklist de regresion rapida
- Login funciona por email.
- Login funciona por documento de candidato.
- Cambio de password limpia `must_change_password`.
- Cron no corre cuando `ADEMY_SYNC_ENABLED=false`.

## Recomendacion de automatizacion
1. Backend: incorporar `jest` + `supertest` para rutas criticas (`auth`, `candidatos`, `hoja-vida`, `integraciones`).
2. Frontend: pruebas de UI con `vitest` + `@testing-library/react`.
3. E2E: flujo login + consulta hoja de vida con Playwright.
