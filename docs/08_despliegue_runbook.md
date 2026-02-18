# Runbook de despliegue

## Objetivo
Levantar y operar EmpleoFacil en entorno Docker con verificacion basica de salud.

## Prerrequisitos
- Docker Desktop instalado.
- Archivo `.env` creado desde `.env.example`.

## Levantar entorno (desarrollo)
```bash
docker compose up -d --build
```

## Levantar con herramientas adicionales
```bash
docker compose --profile tools up -d --build
```

## Verificacion rapida
1. Ver servicios:
```bash
docker compose ps
```
2. Salud backend:
```bash
curl http://localhost:3000/healthz
```
3. Frontend:
- Abrir `http://localhost:3001`.

## Logs utiles
- Backend:
```bash
docker compose logs -f backend
```
- MySQL:
```bash
docker compose logs -f mysql
```
- Frontend:
```bash
docker compose logs -f frontend
```

## Variables sensibles
- Cambiar en produccion: `JWT_SECRET`, `DB_PASSWORD`, `ADEMY_JWT_SECRET`.
- No commitear `.env`.

## Scheduler de Ademy
- Habilitar: `ADEMY_SYNC_ENABLED=true`.
- Cron: `ADEMY_SYNC_CRON` (default `*/10 * * * *`).
- Zona horaria: `ADEMY_SYNC_TZ`.
- Ejecucion al inicio: `ADEMY_SYNC_RUN_ON_START=true|false`.

## Reinicio y parada
- Reiniciar backend:
```bash
docker compose restart backend
```
- Bajar todo:
```bash
docker compose down
```

## Recuperacion basica ante falla
1. Revisar `docker compose ps` y logs del servicio fallando.
2. Validar conexion DB (`DB_*`) y estado de MySQL.
3. Validar que `JWT_SECRET` y variables de Ademy existan.
4. Si falla PDF, revisar instalacion de Chrome/Puppeteer en contenedor backend.
