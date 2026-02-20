USE empleof_db;

-- Crear/actualizar centros primero
INSERT INTO centros_capacitacion (nombre, origen, activo)
VALUES
  ('CENDCAP', 'ademy', 1),
  ('CENDCAP SUCURSAL', 'ademy', 1),
  ('CAPACITAREC', 'ademy', 1)
ON DUPLICATE KEY UPDATE
  origen = CASE
    WHEN centros_capacitacion.origen = VALUES(origen) THEN centros_capacitacion.origen
    WHEN centros_capacitacion.origen = 'mixto' THEN centros_capacitacion.origen
    ELSE 'mixto'
  END,
  activo = 1;

-- Mapear promocion_id de Ademy hacia centro_cliente_id (ajusta IDs reales)
INSERT INTO integracion_ademy_promociones_institucion (promocion_id, centro_cliente_id, activo, notas)
SELECT 1001, c.id, 1, 'CENDCAP principal'
FROM centros_capacitacion c
WHERE c.nombre = 'CENDCAP'
ON DUPLICATE KEY UPDATE
  centro_cliente_id = VALUES(centro_cliente_id),
  activo = VALUES(activo),
  notas = VALUES(notas);

INSERT INTO integracion_ademy_promociones_institucion (promocion_id, centro_cliente_id, activo, notas)
SELECT 1002, c.id, 1, 'CENDCAP sucursal'
FROM centros_capacitacion c
WHERE c.nombre = 'CENDCAP SUCURSAL'
ON DUPLICATE KEY UPDATE
  centro_cliente_id = VALUES(centro_cliente_id),
  activo = VALUES(activo),
  notas = VALUES(notas);

INSERT INTO integracion_ademy_promociones_institucion (promocion_id, centro_cliente_id, activo, notas)
SELECT 1003, c.id, 1, 'Cliente externo'
FROM centros_capacitacion c
WHERE c.nombre = 'CAPACITAREC'
ON DUPLICATE KEY UPDATE
  centro_cliente_id = VALUES(centro_cliente_id),
  activo = VALUES(activo),
  notas = VALUES(notas);
