-- ============================================================
-- EMPLEOFACIL EMPLEADORES (sistema concentrado)
-- Version: 2026-02-11
-- ============================================================
DROP DATABASE IF EXISTS empleofacil_empresas;
CREATE DATABASE IF NOT EXISTS empleofacil_empresas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE empleofacil_empresas;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- -------------------------------------------------------------
-- SEGURIDAD Y ROLES
-- -------------------------------------------------------------
CREATE TABLE roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  tipo ENUM('estrategico','academico','administrativo','operativo',,'externo') DEFAULT 'operativo',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles base (MVP auth)
INSERT INTO roles (nombre, descripcion, tipo, activo)
VALUES
  ('Administrador', 'Acceso total al sistema y auditoria.', 'administrativo', 1),
  ('Empresa', 'Cuenta empresarial para publicar vacantes y gestionar candidatos.', 'operativo', 1),
  ('Candidato', 'Cuenta de estudiante/candidato para postular a vacantes.', 'operativo', 1);

CREATE TABLE permisos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(100) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion VARCHAR(255),
  modulo VARCHAR(100),
  submodulo VARCHAR(100),
  ruta VARCHAR(150),
  icon VARCHAR(100) DEFAULT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permisos base segun menu (Header)
INSERT INTO permisos (codigo, nombre, descripcion, modulo, submodulo, ruta, icon, activo)
VALUES
  -- Admin
  ('admin.home', 'Admin - Resumen', 'Acceso al resumen administrativo', 'admin', 'home', '/app/admin', NULL, 1),
  ('admin.roles', 'Admin - Roles', 'Gestion de roles y permisos', 'admin', 'roles', '/app/admin/roles', NULL, 1),
  ('admin.cuentas', 'Admin - Cuentas', 'Gestion de cuentas', 'admin', 'cuentas', '/app/admin/cuentas', NULL, 1),
  ('admin.auditoria', 'Admin - Auditoria', 'Auditoria y trazabilidad', 'admin', 'auditoria', '/app/admin/auditoria', NULL, 1),
  -- Company
  ('company.vacantes', 'Empresa - Vacantes', 'Gestion de vacantes', 'company', 'vacantes', '/app/company/vacantes', NULL, 1),
  ('company.candidatos', 'Empresa - Candidatos', 'Gestion de candidatos', 'company', 'candidatos', '/app/company/candidatos', NULL, 1),
  ('company.mensajes', 'Empresa - Mensajes', 'Mensajeria con candidatos', 'company', 'mensajes', '/app/company/mensajes', NULL, 1),
  ('company.perfil', 'Empresa - Perfil', 'Perfil y configuracion de empresa', 'company', 'perfil', '/app/company/empresa', NULL, 1),
  -- Candidate
  ('candidate.vacantes', 'Candidato - Vacantes', 'Explorar vacantes', 'candidate', 'vacantes', '/app/candidate/vacantes', NULL, 1),
  ('candidate.postulaciones', 'Candidato - Postulaciones', 'Seguimiento de postulaciones', 'candidate', 'postulaciones', '/app/candidate/postulaciones', NULL, 1),
  ('candidate.perfil', 'Candidato - Perfil', 'Perfil del candidato', 'candidate', 'perfil', '/app/candidate/perfil', NULL, 1);

CREATE TABLE rol_permiso (
  rol_id BIGINT NOT NULL,
  permiso_id BIGINT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Asignacion de permisos base por rol
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.codigo IN ('admin.home','admin.roles','admin.cuentas','admin.auditoria')
WHERE r.nombre = 'Administrador';

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.codigo IN ('company.vacantes','company.candidatos','company.mensajes','company.perfil')
WHERE r.nombre = 'Empresa';

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.codigo IN ('candidate.vacantes','candidate.postulaciones','candidate.perfil')
WHERE r.nombre = 'Candidato';

-- -------------------------------------------------------------
-- USUARIOS, CONEXIONES Y CENTROS
-- -------------------------------------------------------------
CREATE TABLE usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('interno','externo','egresado') NOT NULL DEFAULT 'interno',
  rol_id BIGINT NULL,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(200) NOT NULL,
  documento_identidad VARCHAR(50),
  telefono VARCHAR(50),
  estado ENUM('activo','inactivo','bloqueado') DEFAULT 'activo',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email VARCHAR(150) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expiracion DATETIME NOT NULL,
  usado TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_email_token (email, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE centros_educativos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  alias VARCHAR(100) NULL,
  ruc VARCHAR(20),
  ciudad VARCHAR(100) NULL,
  direccion VARCHAR(255),
  telefono VARCHAR(50),
  email VARCHAR(150),
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios_centros (
  usuario_id BIGINT NOT NULL,
  centro_id BIGINT NOT NULL,
  PRIMARY KEY (usuario_id, centro_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (centro_id) REFERENCES centros_educativos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- EMPRESAS + DOCUMENTOS PARA EL ROL EMPLEADOR
-- -------------------------------------------------------------
CREATE TABLE empresas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  ruc VARCHAR(20),
  email VARCHAR(150),
  telefono VARCHAR(50),
  tipo ENUM('interna','externa','proveedor') DEFAULT 'externa',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- PERFIL DE EMPRESA
-- -------------------------------------------------------------
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
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  INDEX idx_empresas_perfil_completitud (porcentaje_completitud)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  usuario_id BIGINT NOT NULL,
  rol_empresa ENUM('admin','reclutador','visor') DEFAULT 'reclutador',
  principal TINYINT(1) DEFAULT 0,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uq_empresa_usuario (empresa_id, usuario_id),
  INDEX idx_empresa_usuarios_estado (empresa_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_preferencias (
  empresa_id BIGINT PRIMARY KEY,
  modalidades_permitidas JSON NULL COMMENT 'Ej: [\"presencial\",\"hibrido\"]',
  niveles_experiencia JSON NULL COMMENT 'Ej: [\"junior\",\"semi_senior\"]',
  observaciones TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_verificacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  estado ENUM('pendiente','en_revision','verificado','rechazado','suspendido') DEFAULT 'pendiente',
  detalle_estado VARCHAR(255) NULL,
  documentos JSON NULL,
  verificado_por BIGINT NULL,
  verificado_en DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (verificado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE KEY uq_empresas_verificacion_empresa (empresa_id),
  INDEX idx_empresas_verificacion_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE empresas_facturacion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  ruc_facturacion VARCHAR(20) NULL,
  razon_social VARCHAR(200) NULL,
  direccion_fiscal VARCHAR(255) NULL,
  plan ENUM('free','basic','pro','enterprise') DEFAULT 'free',
  estado_suscripcion ENUM('activa','pendiente','suspendida','cancelada') DEFAULT 'activa',
  metodo_pago ENUM('tarjeta','transferencia','otro') DEFAULT 'otro',
  proxima_renovacion DATE NULL,
  observaciones TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_empresas_facturacion_empresa (empresa_id),
  INDEX idx_empresas_facturacion_estado (estado_suscripcion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- VACANTES (ROL EMPRESA)
-- -------------------------------------------------------------
CREATE TABLE vacantes_publicadas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  publicado_por BIGINT NULL,
  codigo_externo VARCHAR(80) NULL COMMENT 'ID o codigo en sistema origen',
  titulo VARCHAR(180) NOT NULL,
  area VARCHAR(120) NULL,
  provincia VARCHAR(100) NULL,
  ciudad VARCHAR(100) NULL,
  modalidad ENUM('presencial','remoto','hibrido') DEFAULT 'presencial',
  tipo_contrato ENUM('tiempo_completo','medio_tiempo','por_horas','temporal','indefinido','otro') DEFAULT 'tiempo_completo',
  descripcion TEXT NULL,
  requisitos TEXT NULL,
  estado ENUM('borrador','activa','pausada','cerrada','expirada') DEFAULT 'activa',
  fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre DATETIME NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (publicado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_vacantes_empresa_estado (empresa_id, estado),
  INDEX idx_vacantes_fecha_publicacion (fecha_publicacion),
  INDEX idx_vacantes_area (area),
  UNIQUE KEY uq_vacantes_codigo_externo (codigo_externo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- CURSOS, PROMOCIONES Y HORARIOS DE REFERENCIA
-- -------------------------------------------------------------
CREATE TABLE niveles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo TINYINT(1) DEFAULT 1,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE especialidades (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  nivel_requerido_id BIGINT NULL,
  activo TINYINT(1) DEFAULT 1,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (nivel_requerido_id) REFERENCES niveles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cursos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  centro_id BIGINT NOT NULL,
  especialidad_id BIGINT NULL,
  nivel_id BIGINT NULL,
  nombre VARCHAR(200) NOT NULL,
  codigo_curso VARCHAR(20) NOT NULL,
  duracion_horas INT NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (centro_id) REFERENCES centros_educativos(id) ON DELETE CASCADE,
  FOREIGN KEY (especialidad_id) REFERENCES especialidades(id) ON DELETE SET NULL,
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE SET NULL,
  UNIQUE KEY uq_cursos_codigo (codigo_curso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- ESTUDIANTES Y PERFILES BÁSICOS
-- -------------------------------------------------------------
CREATE TABLE estudiantes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NULL,
  centro_id BIGINT NULL,
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
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (centro_id) REFERENCES centros_educativos(id) ON DELETE SET NULL,
  INDEX idx_documento (documento_identidad),
  INDEX idx_estado_academico (estado_academico),
  UNIQUE KEY uk_documento_identidad (documento_identidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estudiantes_contacto (
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

CREATE TABLE estudiantes_domicilio (
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

CREATE TABLE estudiantes_documentos (
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
  FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (verificado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_tipo_documento (tipo_documento),
  INDEX idx_estado_doc (estado),
  UNIQUE KEY uk_estudiante_tipo_doc (estudiante_id, tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estudiantes_experiencia (
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
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL,
  INDEX idx_actualmente_trabaja (actualmente_trabaja)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- PREFERENCIAS E IDIOMAS (ROL CANDIDATO)
-- -------------------------------------------------------------
CREATE TABLE candidato_preferencias (
  estudiante_id BIGINT PRIMARY KEY,
  cargo_deseado VARCHAR(150) NULL,
  area_interes VARCHAR(120) NULL,
  modalidad_preferida ENUM('presencial','remoto','hibrido') NULL,
  disponibilidad ENUM('tiempo_completo','medio_tiempo','por_horas','otro') NULL,
  puede_viajar TINYINT(1) DEFAULT 0,
  entrevistas_en_linea TINYINT(1) DEFAULT 1,
  observaciones TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidato_idiomas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id BIGINT NOT NULL,
  idioma VARCHAR(80) NOT NULL,
  nivel ENUM('basico','intermedio','avanzado','nativo') DEFAULT 'basico',
  certificado VARCHAR(120) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_estudiante_idioma (estudiante_id, idioma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- POSTULACIONES (ROL EMPRESA + CANDIDATO)
-- -------------------------------------------------------------
CREATE TABLE postulaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  vacante_id BIGINT NOT NULL,
  estudiante_id BIGINT NOT NULL,
  empresa_id BIGINT NULL COMMENT 'Desnormalizado para consultas rapidas por empresa',
  estado_proceso ENUM(
    'nuevo','en_revision','contactado','entrevista',
    'seleccionado','descartado','finalizado','rechazado'
  ) DEFAULT 'nuevo',
  match_porcentaje DECIMAL(5,2) NULL,
  fecha_postulacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultima_actividad DATETIME NULL,
  origen ENUM('portal_empleo','importado') DEFAULT 'portal_empleo',
  notas_internas TEXT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY (vacante_id) REFERENCES vacantes_publicadas(id) ON DELETE CASCADE,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL,
  INDEX idx_postulaciones_estado (estado_proceso),
  INDEX idx_postulaciones_fecha (fecha_postulacion),
  INDEX idx_postulaciones_empresa (empresa_id),
  UNIQUE KEY uq_postulacion_vacante_estudiante (vacante_id, estudiante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE postulaciones_historial (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  postulacion_id BIGINT NOT NULL,
  estado_anterior ENUM(
    'nuevo','en_revision','contactado','entrevista',
    'seleccionado','descartado','finalizado','rechazado'
  ) NULL,
  estado_nuevo ENUM(
    'nuevo','en_revision','contactado','entrevista',
    'seleccionado','descartado','finalizado','rechazado'
  ) NOT NULL,
  comentario VARCHAR(255) NULL,
  metadata JSON NULL,
  cambiado_por BIGINT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (postulacion_id) REFERENCES postulaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (cambiado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_post_hist_postulacion_fecha (postulacion_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- MENSAJERIA (EMPRESA <-> CANDIDATO)
-- -------------------------------------------------------------
CREATE TABLE conversaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  estudiante_id BIGINT NOT NULL,
  vacante_id BIGINT NULL,
  postulacion_id BIGINT NULL,
  estado ENUM('abierta','cerrada','archivada','bloqueada') DEFAULT 'abierta',
  ultima_actividad DATETIME NULL,
  ultimo_mensaje_id BIGINT NULL,
  creado_por BIGINT NULL COMMENT 'Usuario que inicio la conversacion',
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  FOREIGN KEY (vacante_id) REFERENCES vacantes_publicadas(id) ON DELETE SET NULL,
  FOREIGN KEY (postulacion_id) REFERENCES postulaciones(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_conv_empresa_estado (empresa_id, estado),
  INDEX idx_conv_estudiante_estado (estudiante_id, estado),
  INDEX idx_conv_actividad (ultima_actividad),
  UNIQUE KEY uq_conv_postulacion (postulacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mensajes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversacion_id BIGINT NOT NULL,
  remitente_usuario_id BIGINT NULL,
  remitente_tipo ENUM('empresa','candidato','sistema') NOT NULL,
  tipo ENUM('texto','archivo','plantilla','sistema') DEFAULT 'texto',
  contenido TEXT NULL,
  archivo_url VARCHAR(500) NULL,
  metadata JSON NULL,
  enviado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  editado_en DATETIME NULL,
  eliminado_en DATETIME NULL,
  FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (remitente_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_msg_conversacion_fecha (conversacion_id, enviado_en),
  INDEX idx_msg_remitente_fecha (remitente_usuario_id, enviado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mensaje_lecturas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  mensaje_id BIGINT NOT NULL,
  usuario_id BIGINT NOT NULL,
  leido_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mensaje_id) REFERENCES mensajes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uq_lectura_mensaje_usuario (mensaje_id, usuario_id),
  INDEX idx_lecturas_usuario_fecha (usuario_id, leido_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE conversaciones
  ADD CONSTRAINT fk_conversacion_ultimo_mensaje
  FOREIGN KEY (ultimo_mensaje_id) REFERENCES mensajes(id) ON DELETE SET NULL;

-- -------------------------------------------------------------
-- PROMOCIONES Y FORMACIONES PENDIENTES
-- -------------------------------------------------------------
CREATE TABLE estudiantes_formaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id BIGINT NOT NULL,
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
  FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE SET NULL,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE SET NULL,
  FOREIGN KEY (formacion_origen_id) REFERENCES estudiantes_formaciones(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE formacion_resultados (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  estudiante_formacion_id BIGINT NOT NULL,
  resultado_curso ENUM('aprobado','reprobado','pendiente') NOT NULL DEFAULT 'pendiente',
  nota_curso DECIMAL(5,2) NULL,
  fuente_curso ENUM('classroom','manual','externo') NOT NULL DEFAULT 'classroom',
  fecha_cierre_curso DATE NULL,
  examen_estado ENUM('no_presentado','primera_oportunidad','segunda_oportunidad') NOT NULL DEFAULT 'no_presentado',
  nota_examen DECIMAL(5,2) NULL,
  acreditado TINYINT(1) NOT NULL DEFAULT 0,
  fecha_examen DATE NULL,
  documento_url VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_formacion_resultado UNIQUE (estudiante_formacion_id),
  FOREIGN KEY (estudiante_formacion_id) REFERENCES estudiantes_formaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- LOGS Y AUDITORÍA
-- -------------------------------------------------------------
CREATE TABLE logs_frontend (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NULL,
  nivel ENUM('error','warning') NOT NULL,
  mensaje TEXT NOT NULL,
  stack TEXT NULL,
  ruta VARCHAR(255) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_logs_frontend_created ON logs_frontend (created_at);
CREATE INDEX idx_logs_frontend_level ON logs_frontend (nivel);

CREATE TABLE log_actividad (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NULL,
  accion VARCHAR(200) NOT NULL,
  tabla_afectada VARCHAR(100) NULL,
  registro_afectado_id VARCHAR(50) NULL,
  detalles JSON NULL,
  ip_origen VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
