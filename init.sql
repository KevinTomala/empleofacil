-- ============================================================
-- EmpleoFacil (dev) - Esquema minimo
-- ============================================================
CREATE DATABASE IF NOT EXISTS empleof_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE empleof_db;

-- -------------------------------------------------------------
-- USUARIOS (admin / empresa / candidato)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(200) NOT NULL,
  rol ENUM('candidato','empresa','administrador','superadmin') NOT NULL DEFAULT 'administrador',
  estado ENUM('activo','inactivo','bloqueado') DEFAULT 'activo',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario superadmin por defecto (dev)
INSERT INTO usuarios (email, password_hash, nombre_completo, rol, estado, activo)
VALUES (
  'admin@empleofacil.com',
  '$2b$10$u6NbnZiGxKoTyWf83nQ3Te1TrxbPhc.Edf5Zb9STIVJlenM0MTQaq',
  'Super Admin',
  'superadmin',
  'activo',
  1
)
ON DUPLICATE KEY UPDATE email = email;

-- -------------------------------------------------------------
-- ESTUDIANTES Y PERFIL (basado en init.sql)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estudiantes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NULL,
  centro_id BIGINT NULL,
  interesado_id BIGINT NULL,
  referente_id BIGINT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  documento_identidad VARCHAR(50),
  nacionalidad VARCHAR(100),
  fecha_nacimiento DATE,
  sexo ENUM('M','F','O') DEFAULT 'O',
  estado_civil ENUM('soltero','casado','viudo','divorciado','union_libre') DEFAULT 'soltero',
  estado_academico ENUM('preinscrito','inscrito','matriculado','rechazado') DEFAULT 'preinscrito',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_documento (documento_identidad),
  INDEX idx_estado_academico (estado_academico),
  UNIQUE KEY uk_documento_identidad (documento_identidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_contacto (
  estudiante_id BIGINT PRIMARY KEY,
  email VARCHAR(150),
  telefono_fijo VARCHAR(20),
  telefono_celular VARCHAR(20) NULL,
  contacto_emergencia_nombre VARCHAR(150),
  contacto_emergencia_telefono VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_domicilio (
  estudiante_id BIGINT PRIMARY KEY,
  pais VARCHAR(100),
  provincia VARCHAR(100),
  canton VARCHAR(100),
  parroquia VARCHAR(100),
  direccion VARCHAR(255),
  codigo_postal VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_salud (
  estudiante_id BIGINT PRIMARY KEY,
  tipo_sangre ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  estatura DECIMAL(5,2) NULL COMMENT 'Estatura en metros',
  peso DECIMAL(5,2) NULL COMMENT 'Peso en kilogramos',
  tatuaje ENUM('no','si_visible','si_no_visible') DEFAULT 'no',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_logistica (
  estudiante_id BIGINT PRIMARY KEY,
  movilizacion TINYINT(1) DEFAULT 0,
  tipo_vehiculo ENUM('automovil','bus','camion','camioneta','furgoneta','motocicleta','trailer','tricimoto') NULL,
  licencia ENUM('A','A1','B','C1','C','D1','D','E1','E','F','G') NULL,
  disp_viajar TINYINT(1) DEFAULT 0,
  disp_turnos TINYINT(1) DEFAULT 0,
  disp_fines_semana TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_documentos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id BIGINT NOT NULL,
  tipo_documento ENUM(
    'documento_identidad','carnet_tipo_sangre','libreta_militar','certificado_antecedentes',
    'certificado_consejo_judicatura','examen_toxicologico','examen_psicologico','registro_biometrico',
    'licencia_conducir','certificado_estudios','foto','carta_compromiso','otro'
  ) NOT NULL,
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
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  INDEX idx_tipo_documento (tipo_documento),
  INDEX idx_estado_doc (estado),
  UNIQUE KEY uk_estudiante_tipo_doc (estudiante_id, tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_educacion_general (
  estudiante_id BIGINT PRIMARY KEY,
  nivel_estudio ENUM('Educacion Basica','Bachillerato','Educacion Superior') DEFAULT 'Educacion Basica',
  institucion VARCHAR(150),
  titulo_obtenido VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_experiencia (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id BIGINT NOT NULL,
  empresa_id BIGINT NULL,
  cargo VARCHAR(150) NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  actualmente_trabaja TINYINT(1) DEFAULT 0,
  tipo_contrato ENUM('temporal','indefinido','practicante','otro') NULL,
  descripcion TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  INDEX idx_actualmente_trabaja (actualmente_trabaja)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estudiantes_formaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id BIGINT NOT NULL,
  matricula_id BIGINT NULL,
  nivel_id BIGINT NULL,
  curso_id BIGINT NULL,
  formacion_origen_id BIGINT NULL,
  estado ENUM('inscrito','cursando','egresado','acreditado','anulado','reprobado') DEFAULT 'inscrito',
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_aprobacion DATE NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  FOREIGN KEY (formacion_origen_id) REFERENCES estudiantes_formaciones(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- MAPEO DE ORIGEN (ademy)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estudiantes_origen (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id BIGINT NOT NULL,
  origen ENUM('ademy') NOT NULL,
  origen_estudiante_id BIGINT NULL,
  origen_updated_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_origen_estudiante (origen, origen_estudiante_id),
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formaciones_origen (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_formacion_id BIGINT NOT NULL,
  origen ENUM('ademy') NOT NULL,
  origen_formacion_id BIGINT NOT NULL,
  origen_estudiante_id BIGINT NULL,
  origen_updated_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_origen_formacion (origen, origen_formacion_id),
  FOREIGN KEY (estudiante_formacion_id) REFERENCES estudiantes_formaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- SYNC LOGS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integracion_sync_state (
  origen ENUM('ademy') PRIMARY KEY,
  last_sync_at DATETIME NULL,
  last_success_at DATETIME NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS integracion_sync_logs (
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
