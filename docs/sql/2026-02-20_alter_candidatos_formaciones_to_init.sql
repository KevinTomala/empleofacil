USE empleof_db;

-- 1) Catalogo de centros de capacitacion
CREATE TABLE IF NOT EXISTS centros_capacitacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  origen ENUM('ademy','externo','mixto') NOT NULL DEFAULT 'externo',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_centros_capacitacion_nombre (nombre),
  INDEX idx_centros_capacitacion_origen_activo (origen, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) candidatos_formaciones.centro_cliente_id (sin usar IF NOT EXISTS en ALTER)
SET @schema_name := DATABASE();

SELECT COUNT(*) INTO @has_centro_col
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'candidatos_formaciones'
  AND column_name = 'centro_cliente_id';

SET @sql := IF(
  @has_centro_col = 0,
  'ALTER TABLE candidatos_formaciones ADD COLUMN centro_cliente_id BIGINT NULL AFTER subtipo_formacion',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_centro_idx
FROM information_schema.statistics
WHERE table_schema = @schema_name
  AND table_name = 'candidatos_formaciones'
  AND index_name = 'idx_candidatos_formaciones_centro_cliente_id';

SET @sql := IF(
  @has_centro_idx = 0,
  'ALTER TABLE candidatos_formaciones ADD INDEX idx_candidatos_formaciones_centro_cliente_id (centro_cliente_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_centro_fk
FROM information_schema.table_constraints
WHERE table_schema = @schema_name
  AND table_name = 'candidatos_formaciones'
  AND constraint_name = 'fk_candidatos_formaciones_centro';

SET @sql := IF(
  @has_centro_fk = 0,
  'ALTER TABLE candidatos_formaciones ADD CONSTRAINT fk_candidatos_formaciones_centro FOREIGN KEY (centro_cliente_id) REFERENCES centros_capacitacion(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Backfill inicial desde institucion texto
INSERT INTO centros_capacitacion (nombre, origen, activo)
SELECT DISTINCT TRIM(cf.institucion) AS nombre, 'mixto' AS origen, 1 AS activo
FROM candidatos_formaciones cf
WHERE cf.institucion IS NOT NULL
  AND TRIM(cf.institucion) <> ''
ON DUPLICATE KEY UPDATE
  origen = CASE
    WHEN centros_capacitacion.origen = VALUES(origen) THEN centros_capacitacion.origen
    WHEN centros_capacitacion.origen = 'mixto' THEN centros_capacitacion.origen
    ELSE 'mixto'
  END,
  activo = 1;

UPDATE candidatos_formaciones cf
INNER JOIN centros_capacitacion cc
  ON cc.nombre = TRIM(cf.institucion)
SET cf.centro_cliente_id = cc.id
WHERE cf.centro_cliente_id IS NULL
  AND cf.institucion IS NOT NULL
  AND TRIM(cf.institucion) <> '';

UPDATE candidatos_formaciones cf
INNER JOIN centros_capacitacion cc
  ON cc.id = cf.centro_cliente_id
SET cf.institucion = cc.nombre
WHERE (cf.institucion IS NULL OR TRIM(cf.institucion) = '');

-- 4) Tabla de mapeo promocion_id -> centro_cliente_id
CREATE TABLE IF NOT EXISTS integracion_ademy_promociones_institucion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  promocion_id BIGINT NOT NULL,
  centro_cliente_id BIGINT NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  notas VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_integracion_ademy_promocion (promocion_id),
  INDEX idx_integracion_ademy_promocion_activo (promocion_id, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si existe tabla legacy con columna institucion, se migra al nuevo FK.
SELECT COUNT(*) INTO @has_map_centro_col
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'integracion_ademy_promociones_institucion'
  AND column_name = 'centro_cliente_id';

SET @sql := IF(
  @has_map_centro_col = 0,
  'ALTER TABLE integracion_ademy_promociones_institucion ADD COLUMN centro_cliente_id BIGINT NULL AFTER promocion_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_map_institucion_col
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'integracion_ademy_promociones_institucion'
  AND column_name = 'institucion';

SET @sql := IF(
  @has_map_institucion_col = 1,
  'UPDATE integracion_ademy_promociones_institucion m INNER JOIN centros_capacitacion c ON c.nombre = TRIM(m.institucion) SET m.centro_cliente_id = c.id WHERE m.centro_cliente_id IS NULL AND m.institucion IS NOT NULL AND CHAR_LENGTH(TRIM(m.institucion)) > 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ajuste final a NOT NULL si ya no quedan nulos.
SELECT COUNT(*) INTO @map_null_centros
FROM integracion_ademy_promociones_institucion
WHERE centro_cliente_id IS NULL;

SET @sql := IF(
  @map_null_centros = 0,
  'ALTER TABLE integracion_ademy_promociones_institucion MODIFY COLUMN centro_cliente_id BIGINT NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_map_fk
FROM information_schema.table_constraints
WHERE table_schema = @schema_name
  AND table_name = 'integracion_ademy_promociones_institucion'
  AND constraint_name = 'fk_integracion_ademy_promocion_centro';

SET @sql := IF(
  @has_map_fk = 0,
  'ALTER TABLE integracion_ademy_promociones_institucion ADD CONSTRAINT fk_integracion_ademy_promocion_centro FOREIGN KEY (centro_cliente_id) REFERENCES centros_capacitacion(id) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
