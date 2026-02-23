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

## Migraciones BD (alineacion con `init.sql`)
1. Validar estructura minima:
```sql
SHOW COLUMNS FROM candidatos LIKE 'centro_id';
SHOW COLUMNS FROM candidatos LIKE 'interesado_id';
SHOW COLUMNS FROM candidatos LIKE 'referente_id';
SHOW COLUMNS FROM candidatos LIKE 'estado_academico';
SHOW COLUMNS FROM candidatos_formaciones LIKE 'centro_cliente_id';
SHOW TABLES LIKE 'centros_capacitacion';
SHOW TABLES LIKE 'integracion_ademy_promociones_institucion';
SHOW COLUMNS FROM candidatos_experiencia LIKE 'empresa_origen_id';
SHOW TABLES LIKE 'integracion_ademy_empresas_empleofacil';
SHOW TABLES LIKE 'candidatos_experiencia_certificados';
```
2. Si en un entorno viejo aun existen columnas legacy en `candidatos`, retirarlas:
```sql
ALTER TABLE candidatos
  DROP INDEX idx_estado_academico,
  DROP COLUMN centro_id,
  DROP COLUMN interesado_id,
  DROP COLUMN referente_id,
  DROP COLUMN estado_academico;
```
3. Verificar contrato final de la tabla `candidatos`:
```sql
SHOW COLUMNS FROM candidatos;
```
Debe quedar sin `centro_id`, `interesado_id`, `referente_id` y `estado_academico`.
4. Si falta `candidatos_experiencia_certificados`, crearla:
```sql
CREATE TABLE candidatos_experiencia_certificados (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  experiencia_id BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanio_kb INT NOT NULL,
  fecha_emision DATE NULL,
  descripcion TEXT NULL,
  estado ENUM('pendiente','aprobado','rechazado','vencido') DEFAULT 'pendiente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT uq_experiencia_certificado UNIQUE (experiencia_id),
  CONSTRAINT fk_experiencia_certificados_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_experiencia_certificados_experiencia FOREIGN KEY (experiencia_id) REFERENCES candidatos_experiencia(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
5. Si necesitas backfill de vinculo por nombre (experiencias manuales -> empresa local):
```sql
UPDATE candidatos_experiencia ce
JOIN empresas e
  ON LOWER(TRIM(ce.empresa_nombre)) = LOWER(TRIM(e.nombre))
SET ce.empresa_id = e.id,
    ce.updated_at = NOW()
WHERE ce.deleted_at IS NULL
  AND ce.empresa_id IS NULL
  AND ce.empresa_origen IS NULL
  AND ce.empresa_nombre IS NOT NULL
  AND e.deleted_at IS NULL;
```
6. Reiniciar backend despues de cambios de esquema:
```bash
docker compose restart backend
```

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
- Para resolver nombre de empresa en experiencia por `empresa_id`, ADEMY debe exponer `GET /api/empresas/s2s` con `verifyServiceToken`.
- El mapeo `/api/integraciones/ademy/empresas-mapeo` solo cubre origen ADEMY.

## Operacion de empresas en experiencia (manual + ADEMY)
- Captura manual de candidato:
  - si no existe empresa local, se guarda `empresa_nombre` (texto libre).
  - no crea usuario empresa automaticamente.
- Captura/importacion ADEMY:
  - usa `empresa_origen='ademy'` y `empresa_origen_id`.
  - vinculo local se controla desde mapeo ADEMY.
- Autovinculacion automatica de historicos (no ADEMY):
  - al crear empresa local por flujo de cuenta empresa,
  - al adjuntar cuenta empresa por email a empresa existente,
  - al cambiar nombre en `PUT /api/company/perfil/me/datos-generales`.

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
