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
  activo TINYINT(1) DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (email, password_hash, nombre_completo, rol, estado, activo)
VALUES ('admin@empleofacil.com', '$2b$10$u6NbnZiGxKoTyWf83nQ3Te1TrxbPhc.Edf5Zb9STIVJlenM0MTQaq', 'Super Admin', 'superadmin', 'activo', 1),
       ('guardia@empleofacil.com', '$2b$10$YKgk0K2lsM/pFBf.nz1Axe6dD4.2yBSZi5lELiSDTpCuMOyCiZPWC', 'Agente N2', 'candidato', 'activo', 1),
       ('ademy@empleofacil.com', '$2b$10$YKgk0K2lsM/pFBf.nz1Axe6dD4.2yBSZi5lELiSDTpCuMOyCiZPWC', 'Ademy Cia', 'empresa', 'activo', 1)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- -------------------------------------------------------------
-- CANDIDATOS Y PERFIL
-- -------------------------------------------------------------
CREATE TABLE candidatos (
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
  INDEX idx_candidato_usuario_id (usuario_id),
  INDEX idx_documento (documento_identidad),
  INDEX idx_estado_academico (estado_academico),
  UNIQUE KEY uk_documento_identidad (documento_identidad),
  CONSTRAINT fk_candidatos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  movilizacion TINYINT(1) DEFAULT 0,
  tipo_vehiculo ENUM('automovil','bus','camion','camioneta','furgoneta','motocicleta','trailer','tricimoto') NULL,
  licencia ENUM('A','A1','B','C1','C','D1','D','E1','E','F','G') NULL,
  disp_viajar TINYINT(1) DEFAULT 0,
  disp_turnos TINYINT(1) DEFAULT 0,
  disp_fines_semana TINYINT(1) DEFAULT 0,
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
  UNIQUE KEY uk_candidato_tipo_doc (candidato_id, tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_educacion_general (
  candidato_id BIGINT PRIMARY KEY,
  nivel_estudio ENUM('Educacion Basica','Bachillerato','Educacion Superior') DEFAULT 'Educacion Basica',
  institucion VARCHAR(150),
  titulo_obtenido VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_educacion_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE
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
  cargo VARCHAR(150) NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  actualmente_trabaja TINYINT(1) DEFAULT 0,
  tipo_contrato ENUM('temporal','indefinido','practicante','otro') NULL,
  descripcion TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_candidatos_experiencia_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  INDEX idx_candidatos_experiencia_actual (actualmente_trabaja)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidatos_formaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidato_id BIGINT NOT NULL,
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
  CONSTRAINT fk_candidatos_formaciones_candidato FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
  CONSTRAINT fk_candidatos_formaciones_self FOREIGN KEY (formacion_origen_id) REFERENCES candidatos_formaciones(id) ON DELETE SET NULL
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
  origen_candidato_id BIGINT NULL,
  origen_updated_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_origen_formacion (origen, origen_formacion_id),
  CONSTRAINT fk_candidatos_formaciones_origen_formacion FOREIGN KEY (candidato_formacion_id) REFERENCES candidatos_formaciones(id) ON DELETE CASCADE
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
