-- Gimnasio Reservas - Supabase Schema (PostgreSQL)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(20),
  rut VARCHAR(20) UNIQUE,
  is_admin INTEGER DEFAULT 0,
  baneado INTEGER DEFAULT 0,
  faltas INTEGER DEFAULT 0,
  ultimo_reset_faltas TIMESTAMP
);

CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL REFERENCES users(email) ON UPDATE CASCADE,
  fecha DATE NOT NULL,
  bloque_horario VARCHAR(10) NOT NULL,
  sede VARCHAR(50) NOT NULL,
  asistio INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cupos (
  id SERIAL PRIMARY KEY,
  bloque VARCHAR(10) NOT NULL,
  sede VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  total INTEGER DEFAULT 15,
  reservados INTEGER DEFAULT 0
);

-- Unique constraints to prevent race conditions
ALTER TABLE cupos ADD CONSTRAINT cupos_bloque_sede_fecha_unique UNIQUE (bloque, sede, fecha);
ALTER TABLE reservas ADD CONSTRAINT reservas_email_fecha_unique UNIQUE (email, fecha);

-- Indexes for performance
CREATE INDEX idx_reservas_email ON reservas(email);
CREATE INDEX idx_reservas_fecha ON reservas(fecha);
CREATE INDEX idx_reservas_bloque_fecha ON reservas(bloque_horario, fecha, sede);
CREATE INDEX idx_cupos_fecha ON cupos(fecha);
CREATE INDEX idx_cupos_bloque_sede_fecha ON cupos(bloque, sede, fecha);

-- Admin user (change password hash as needed)
-- Password: admin123 (bcrypt cost 12)
-- INSERT INTO users (email, name, password, is_admin) VALUES ('admin@usm.cl', 'Administrador', '$2a$12$...', 1);
