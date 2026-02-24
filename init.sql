-- ============================================================
-- EmpleoFacil (dev) - Esquema base candidatos
-- ============================================================
CREATE DATABASE IF NOT EXISTS empleof_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE empleof_db;

-- -------------------------------------------------------------
-- USUARIOS (admin / empresa / candidato)
-- -------------------------------------------------------------
CREATE TABLE usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(200) NOT NULL,
  rol ENUM('candidato','empresa','administrador','superadmin') NOT NULL DEFAULT 'administrador',
  estado ENUM('activo','inactivo','bloqueado') DEFAULT 'activo',
  activo TINYINT UNSIGNED DEFAULT 1,
  must_change_password TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (email, password_hash, nombre_completo, rol, estado, activo)
VALUES ('admin@empleofacil.com', '$2b$10$u6NbnZiGxKoTyWf83nQ3Te1TrxbPhc.Edf5Zb9STIVJlenM0MTQaq', 'Super Admin', 'superadmin', 'activo', 1),
       ('guardia@empleofacil.com', '$2b$10$YKgk0K2lsM/pFBf.nz1Axe6dD4.2yBSZi5lELiSDTpCuMOyCiZPWC', 'Agente N2', 'candidato', 'activo', 1),
       ('ademy@empleofacil.com', '$2b$10$YKgk0K2lsM/pFBf.nz1Axe6dD4.2yBSZi5lELiSDTpCuMOyCiZPWC', 'Ademy Cia', 'empresa', 'activo', 1);

-- -------------------------------------------------------------
-- EMPRESAS Y PERFIL EMPLEADOR
-- -------------------------------------------------------------
CREATE TABLE empresas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  ruc VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  telefono VARCHAR(20) NULL,
  tipo ENUM('interna','externa','proveedor') DEFAULT 'externa',
  activo TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_empresas_ruc (ruc),
  INDEX idx_empresas_nombre (nombre),
  INDEX idx_empresas_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  usuario_id BIGINT NOT NULL,
  rol_empresa ENUM('admin','reclutador','visor') DEFAULT 'admin',
  principal TINYINT UNSIGNED NOT NULL DEFAULT 1,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_empresas_usuarios_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_empresas_usuarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uq_empresas_usuarios (empresa_id, usuario_id),
  INDEX idx_empresas_usuarios_usuario (usuario_id),
  INDEX idx_empresas_usuarios_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_perfil (
  empresa_id BIGINT PRIMARY KEY,
  industria VARCHAR(120) NULL,
  ubicacion_principal VARCHAR(120) NULL,
  tamano_empleados INT NULL,
  descripcion TEXT NULL,
  cultura TEXT NULL,
  beneficios JSON NULL,
  sitio_web VARCHAR(255) NULL,
  linkedin_url VARCHAR(255) NULL,
  instagram_url VARCHAR(255) NULL,
  facebook_url VARCHAR(255) NULL,
  logo_url VARCHAR(500) NULL,
  porcentaje_completitud TINYINT UNSIGNED DEFAULT 0,
  campos_pendientes JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_empresas_perfil_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  INDEX idx_empresas_perfil_completitud (porcentaje_completitud)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_preferencias (
  empresa_id BIGINT PRIMARY KEY,
  modalidades_permitidas JSON NULL,
  niveles_experiencia JSON NULL,
  observaciones TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_empresas_preferencias_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_desactivaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  usuario_id BIGINT NULL,
  usuarios_activos_json JSON NULL,
  motivo_codigo VARCHAR(50) NOT NULL,
  motivos_codigos_json JSON NULL,
  motivo_detalle TEXT NULL,
  requiere_soporte TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_empresas_desactivaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_empresas_desactivaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_empresas_desactivaciones_empresa (empresa_id),
  INDEX idx_empresas_desactivaciones_motivo (motivo_codigo),
  INDEX idx_empresas_desactivaciones_soporte (requiere_soporte),
  INDEX idx_empresas_desactivaciones_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_reactivaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  usuario_id BIGINT NULL,
  estado ENUM('pendiente','en_revision','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  motivo_codigo VARCHAR(50) NOT NULL,
  motivos_codigos_json JSON NULL,
  motivo_detalle TEXT NULL,
  acciones_realizadas TEXT NULL,
  requiere_soporte TINYINT UNSIGNED NOT NULL DEFAULT 0,
  comentario_admin TEXT NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_empresas_reactivaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_empresas_reactivaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_empresas_reactivaciones_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_empresas_reactivaciones_empresa (empresa_id),
  INDEX idx_empresas_reactivaciones_estado (estado),
  INDEX idx_empresas_reactivaciones_motivo (motivo_codigo),
  INDEX idx_empresas_reactivaciones_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO empresas (nombre, email, tipo, activo)
VALUES ('ADEMY S.A.S.', 'ademy@empleofacil.com', 'externa', 1);

INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol_empresa, principal, estado)
SELECT e.id, u.id, 'admin', 1, 'activo'
FROM empresas e
JOIN usuarios u ON u.email = 'ademy@empleofacil.com'
WHERE e.email = 'ademy@empleofacil.com'
LIMIT 1;

INSERT INTO empresas_perfil (
  empresa_id,
  industria,
  ubicacion_principal,
  tamano_empleados,
  descripcion,
  sitio_web,
  porcentaje_completitud,
  campos_pendientes
)
SELECT
  e.id,
  'Servicios',
  'La Libertad, Santa Elena',
  120,
  'Empresa especializada en soluciones tecnológicas academicas.',
  'https://ademy.com',
  70,
  JSON_ARRAY('Beneficios', 'Cultura', 'Redes sociales')
FROM empresas e
WHERE e.email = 'ademy@empleofacil.com'
LIMIT 1;

-- -------------------------------------------------------------
-- CANDIDATOS Y PERFIL
-- -------------------------------------------------------------
CREATE TABLE candidatos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  documento_identidad VARCHAR(50),
  nacionalidad VARCHAR(100),
  fecha_nacimiento DATE,
  sexo ENUM('M','F','O') DEFAULT 'O',
  estado_civil ENUM('soltero','casado','viudo','divorciado','union_libre') DEFAULT 'soltero',
  activo TINYINT UNSIGNED DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_candidato_usuario_id (usuario_id),
  INDEX idx_documento (documento_identidad),
  UNIQUE KEY uk_documento_identidad (documento_identidad),
  CONSTRAINT fk_candidatos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verificaciones_cuenta (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cuenta_tipo ENUM('empresa','candidato') NOT NULL,
  empresa_id BIGINT NULL,
  candidato_id BIGINT NULL,
  estado ENUM('pendiente','en_revision','aprobada','rechazada','vencida','suspendida') NOT NULL DEFAULT 'pendiente',
  nivel ENUM('basico','completo') NOT NULL DEFAULT 'basico',
  motivo_rechazo TEXT NULL,
  notas_admin TEXT NULL,
  fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_verificaciones_cuenta_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_verificaciones_cuenta_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_verificaciones_cuenta_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE KEY uq_verificacion_empresa (empresa_id),
  UNIQUE KEY uq_verificacion_candidato (candidato_id),
  INDEX idx_verificaciones_tipo_estado (cuenta_tipo, estado),
  INDEX idx_verificaciones_reviewed_at (reviewed_at),
  INDEX idx_verificaciones_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verificaciones_cuenta_eventos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  verificacion_id BIGINT NOT NULL,
  accion ENUM('solicitada','en_revision','aprobada','rechazada','suspendida','reabierta','vencida') NOT NULL,
  estado_anterior ENUM('pendiente','en_revision','aprobada','rechazada','vencida','suspendida') NULL,
  estado_nuevo ENUM('pendiente','en_revision','aprobada','rechazada','vencida','suspendida') NULL,
  actor_usuario_id BIGINT NULL,
  actor_rol ENUM('candidato','empresa','administrador','superadmin','system') DEFAULT 'system',
  comentario TEXT NULL,
  metadata JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verificaciones_eventos_verificacion FOREIGN KEY (verificacion_id) REFERENCES verificaciones_cuenta(id) ON DELETE CASCADE,
  CONSTRAINT fk_verificaciones_eventos_actor FOREIGN KEY (actor_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_verificaciones_eventos_verificacion (verificacion_id),
  INDEX idx_verificaciones_eventos_accion (accion),
  INDEX idx_verificaciones_eventos_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO verificaciones_cuenta (
  cuenta_tipo,
  empresa_id,
  estado,
  nivel,
  reviewed_by,
  reviewed_at
)
SELECT
  'empresa',
  e.id,
  'aprobada',
  'completo',
  admin_u.id,
  NOW()
FROM empresas e
JOIN usuarios admin_u ON admin_u.email = 'admin@empleofacil.com'
WHERE e.email = 'ademy@empleofacil.com'
LIMIT 1;

INSERT INTO verificaciones_cuenta_eventos (
  verificacion_id,
  accion,
  estado_anterior,
  estado_nuevo,
  actor_usuario_id,
  actor_rol,
  comentario
)
SELECT
  v.id,
  'aprobada',
  NULL,
  'aprobada',
  admin_u.id,
  admin_u.rol,
  'Semilla inicial de verificacion para empresa demo.'
FROM verificaciones_cuenta v
JOIN empresas e ON e.id = v.empresa_id
JOIN usuarios admin_u ON admin_u.email = 'admin@empleofacil.com'
WHERE v.cuenta_tipo = 'empresa'
  AND e.email = 'ademy@empleofacil.com'
LIMIT 1;

CREATE TABLE candidatos_contacto (
  candidato_id BIGINT PRIMARY KEY,
  email VARCHAR(150),
  telefono_fijo VARCHAR(20),
  telefono_celular VARCHAR(20) NULL,
  contacto_emergencia_nombre VARCHAR(150),
  contacto_emergencia_telefono VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_contacto_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  INDEX idx_contacto_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_domicilio (
  candidato_id BIGINT PRIMARY KEY,
  pais VARCHAR(100),
  provincia VARCHAR(100),
  canton VARCHAR(100),
  parroquia VARCHAR(100),
  direccion VARCHAR(255),
  codigo_postal VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_domicilio_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_salud (
  candidato_id BIGINT PRIMARY KEY,
  tipo_sangre ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  estatura DECIMAL(5,2) NULL COMMENT 'Estatura en metros',
  peso DECIMAL(5,2) NULL COMMENT 'Peso en kilogramos',
  tatuaje ENUM('no','si_visible','si_no_visible') DEFAULT 'no',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_salud_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_logistica (
  candidato_id BIGINT PRIMARY KEY,
  movilizacion TINYINT UNSIGNED DEFAULT 0,
  tipo_vehiculo ENUM('automovil','bus','camion','camioneta','furgoneta','motocicleta','trailer','tricimoto') NULL,
  licencia ENUM('A','A1','B','C1','C','D1','D','E1','E','F','G') NULL,
  disp_viajar TINYINT UNSIGNED DEFAULT 0,
  disp_turnos TINYINT UNSIGNED DEFAULT 0,
  disp_fines_semana TINYINT UNSIGNED DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_logistica_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_documentos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  tipo_documento ENUM(
    'documento_identidad','carnet_tipo_sangre','libreta_militar','certificado_antecedentes',
    'certificado_consejo_judicatura','examen_toxicologico','examen_psicologico','registro_biometrico',
    'licencia_conducir','certificado_estudios','foto','carta_compromiso','otro'
  ) NOT NULL,
  lado_documento ENUM('anverso','reverso') NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanio_kb INT NOT NULL,
  fecha_emision DATE NULL,
  fecha_vencimiento DATE NULL,
  numero_documento VARCHAR(100) NULL,
  descripcion TEXT NULL,
  estado ENUM('pendiente','aprobado','rechazado','vencido') DEFAULT 'pendiente',
  observaciones TEXT NULL,
  subido_por BIGINT NULL,
  verificado_por BIGINT NULL,
  fecha_verificacion DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_documentos_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  INDEX idx_candidatos_documentos_tipo (tipo_documento),
  INDEX idx_candidatos_documentos_estado (estado),
  INDEX idx_candidatos_documentos_lado (lado_documento),
  INDEX idx_candidatos_documentos_candidato_estado (candidato_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_documentos_verificaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  documento_id BIGINT NOT NULL,
  candidato_id BIGINT NOT NULL,
  accion ENUM('subido','auto_precheck','aprobado','rechazado','vencido','reabierto') NOT NULL,
  estado_anterior ENUM('pendiente','aprobado','rechazado','vencido') NULL,
  estado_nuevo ENUM('pendiente','aprobado','rechazado','vencido') NULL,
  actor_usuario_id BIGINT NULL,
  actor_rol ENUM('candidato','administrador','superadmin','system') NOT NULL DEFAULT 'system',
  comentario TEXT NULL,
  origen ENUM('manual','automatico','mixto') NOT NULL DEFAULT 'manual',
  metadata JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidatos_docs_verif_documento FOREIGN KEY (documento_id) REFERENCES candidatos_documentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_candidatos_docs_verif_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_candidatos_docs_verif_actor FOREIGN KEY (actor_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_candidatos_docs_verif_documento (documento_id),
  INDEX idx_candidatos_docs_verif_candidato (candidato_id),
  INDEX idx_candidatos_docs_verif_accion (accion),
  INDEX idx_candidatos_docs_verif_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_educacion_general (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  nivel_estudio ENUM('Educacion Basica','Bachillerato','Educacion Superior') DEFAULT 'Educacion Basica',
  institucion VARCHAR(150),
  titulo_obtenido VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_educacion_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  INDEX idx_candidatos_educacion_candidato_id (candidato_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_idiomas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  idioma VARCHAR(100) NOT NULL,
  nivel ENUM('Basico','Intermedio','Avanzado','Nativo') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_idiomas_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  INDEX idx_candidato_idiomas_candidato_id (candidato_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_experiencia (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  empresa_id BIGINT NULL,
  empresa_origen ENUM('ademy') NULL,
  empresa_origen_id BIGINT NULL,
  empresa_nombre VARCHAR(200) NULL,
  cargo VARCHAR(150) NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  actualmente_trabaja TINYINT UNSIGNED DEFAULT 0,
  tipo_contrato ENUM('temporal','indefinido','practicante','otro') NULL,
  descripcion TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_experiencia_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  INDEX idx_candidatos_experiencia_actual (actualmente_trabaja),
  INDEX idx_candidatos_experiencia_empresa_origen (empresa_origen, empresa_origen_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE centros_capacitacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  origen ENUM('ademy','externo','mixto') NOT NULL DEFAULT 'externo',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_centros_capacitacion_nombre (nombre),
  INDEX idx_centros_capacitacion_origen_activo (origen, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exportar de ademy con nuevos campos, tabla limpia
CREATE TABLE candidatos_formaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  categoria_formacion ENUM('externa') NULL,
  subtipo_formacion ENUM('curso','ministerio','ministerio_i','chofer_profesional') NULL,
  centro_cliente_id BIGINT NULL,
  institucion VARCHAR(200) NULL,
  nombre_programa VARCHAR(200) NULL,
  titulo_obtenido VARCHAR(200) NULL,
  entidad_emisora VARCHAR(200) NULL,
  numero_registro VARCHAR(120) NULL,
  fecha_emision DATE NULL,
  fecha_vencimiento DATE NULL,
  fecha_aprobacion DATE NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  INDEX idx_candidatos_formaciones_centro_cliente_id (centro_cliente_id),
  CONSTRAINT fk_candidatos_formaciones_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_candidatos_formaciones_centro FOREIGN KEY (centro_cliente_id) REFERENCES centros_capacitacion(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_formacion_certificados (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  candidato_formacion_id BIGINT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanio_kb INT NOT NULL,
  fecha_emision DATE NULL,
  descripcion TEXT NULL,
  estado ENUM('pendiente','aprobado','rechazado','vencido') DEFAULT 'pendiente',
  estado_extraccion ENUM('pendiente','procesado','error') DEFAULT 'pendiente',
  datos_extraidos_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT uq_formacion_certificado UNIQUE (candidato_formacion_id),
  CONSTRAINT fk_formacion_certificados_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_formacion_certificados_formacion FOREIGN KEY (candidato_formacion_id) REFERENCES candidatos_formaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- -------------------------------------------------------------
-- MAPEO DE ORIGEN (ademy)
-- -------------------------------------------------------------
CREATE TABLE candidatos_origen (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
  origen ENUM('ademy') NOT NULL,
  origen_candidato_id BIGINT NULL,
  origen_updated_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_origen_candidato (origen, origen_candidato_id),
  CONSTRAINT fk_candidatos_origen_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_formaciones_origen (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_formacion_id BIGINT NOT NULL,
  origen ENUM('ademy') NOT NULL,
  origen_formacion_id BIGINT NOT NULL,
  origen_updated_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_origen_formacion (origen, origen_formacion_id),
  CONSTRAINT fk_candidatos_formaciones_origen_formacion FOREIGN KEY (candidato_formacion_id) REFERENCES candidatos_formaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE integracion_ademy_promociones_institucion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  promocion_id BIGINT NOT NULL,
  centro_cliente_id BIGINT NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  notas VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_integracion_ademy_promocion (promocion_id),
  INDEX idx_integracion_ademy_promocion_activo (promocion_id, activo),
  CONSTRAINT fk_integracion_ademy_promocion_centro FOREIGN KEY (centro_cliente_id) REFERENCES centros_capacitacion(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE integracion_ademy_empresas_empleofacil (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  origen ENUM('ademy') NOT NULL DEFAULT 'ademy',
  origen_empresa_id BIGINT NOT NULL,
  empresa_id BIGINT NULL,
  nombre_origen VARCHAR(200) NULL,
  estado ENUM('pendiente','vinculada','descartada') NOT NULL DEFAULT 'pendiente',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_integracion_ademy_empresa_origen (origen, origen_empresa_id),
  INDEX idx_integracion_ademy_empresa_local (empresa_id, activo),
  CONSTRAINT fk_integracion_ademy_empresa_local FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- VACANTES Y POSTULACIONES (MVP)
-- -------------------------------------------------------------
CREATE TABLE vacantes_publicadas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  publicado_por BIGINT NULL,
  titulo VARCHAR(180) NOT NULL,
  area VARCHAR(120) NULL,
  provincia VARCHAR(100) NULL,
  ciudad VARCHAR(100) NULL,
  modalidad ENUM('presencial','remoto','hibrido') DEFAULT 'presencial',
  tipo_contrato ENUM('tiempo_completo','medio_tiempo','por_horas','temporal','indefinido','otro') DEFAULT 'tiempo_completo',
  descripcion TEXT NULL,
  requisitos TEXT NULL,
  estado ENUM('borrador','activa','pausada','cerrada') DEFAULT 'borrador',
  fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre DATE NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_vacantes_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacantes_publicado_por FOREIGN KEY (publicado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_vacantes_empresa_estado (empresa_id, estado),
  INDEX idx_vacantes_estado_publicacion (estado, fecha_publicacion),
  INDEX idx_vacantes_busqueda (titulo, area, provincia, ciudad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE postulaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  vacante_id BIGINT NOT NULL,
  candidato_id BIGINT NOT NULL,
  empresa_id BIGINT NOT NULL,
  estado_proceso ENUM('nuevo','en_revision','contactado','entrevista','seleccionado','descartado','finalizado','rechazado') DEFAULT 'nuevo',
  fecha_postulacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultima_actividad DATETIME NULL,
  origen ENUM('portal_empleo','importado') DEFAULT 'portal_empleo',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_postulaciones_vacante FOREIGN KEY (vacante_id) REFERENCES vacantes_publicadas(id) ON DELETE CASCADE,
  CONSTRAINT fk_postulaciones_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_postulaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_postulacion_vacante_candidato (vacante_id, candidato_id),
  INDEX idx_postulaciones_empresa_estado (empresa_id, estado_proceso),
  INDEX idx_postulaciones_candidato_fecha (candidato_id, fecha_postulacion),
  INDEX idx_postulaciones_vacante_fecha (vacante_id, fecha_postulacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- SYNC LOGS
-- -------------------------------------------------------------
CREATE TABLE integracion_sync_state (
  origen ENUM('ademy') PRIMARY KEY,
  last_sync_at DATETIME NULL,
  last_success_at DATETIME NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE integracion_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  origen ENUM('ademy') NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  status ENUM('running','success','partial','failed') DEFAULT 'running',
  total INT DEFAULT 0,
  created_count INT DEFAULT 0,
  updated_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  message TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
