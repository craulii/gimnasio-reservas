-- Migration: Config editable de bloques por sede/dia (ejecutar en Supabase SQL Editor)
-- Fecha: 2026-08-10
-- Ejecutar ANTES de deployar el codigo que lee estas tablas (src/lib/config-bloques.js).
-- Aditivo: no toca users/reservas/cupos, seguro de correr en cualquier momento.

-- ============================================================
-- 1. Crear tablas
-- ============================================================
CREATE TABLE config_bloques_sede (
  id SERIAL PRIMARY KEY,
  sede VARCHAR(50) NOT NULL,
  bloque VARCHAR(10) NOT NULL,
  tipo_dia VARCHAR(10) NOT NULL CHECK (tipo_dia IN ('normal', 'viernes')),
  activo INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);
ALTER TABLE config_bloques_sede ADD CONSTRAINT config_bloques_sede_unique
UNIQUE (sede, bloque, tipo_dia);

CREATE TABLE config_horarios_bloque (
  bloque VARCHAR(10) PRIMARY KEY,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- ============================================================
-- 2. Seed: replica el comportamiento vigente de HORARIO_CIERRE_SEDE
--    (src/app/utils/constants.js, ya corregido: Vitacura viernes = 7)
--    IMPORTANTE: si constants.js cambio despues de esta fecha, actualizar
--    los valores de "limite" abajo antes de correr este script.
-- ============================================================
WITH bloques AS (
  SELECT * FROM (VALUES
    ('1-2',1),('3-4',3),('5-6',5),('7-8',7),('9-10',9),
    ('11-12',11),('13-14',13),('15-16',15)
  ) AS b(bloque, numero)
),
limites AS (
  SELECT * FROM (VALUES
    ('Vitacura',    'normal',  13),
    ('Vitacura',    'viernes',  7),
    ('San Joaquín', 'normal',  15),
    ('San Joaquín', 'viernes', 13)
  ) AS l(sede, tipo_dia, limite)
)
INSERT INTO config_bloques_sede (sede, bloque, tipo_dia, activo)
SELECT l.sede, b.bloque, l.tipo_dia, CASE WHEN b.numero <= l.limite THEN 1 ELSE 0 END
FROM limites l CROSS JOIN bloques b;

-- ============================================================
-- 3. Seed: replica HORARIOS_BLOQUE tal cual (constants.js)
-- ============================================================
INSERT INTO config_horarios_bloque (bloque, hora_inicio, hora_fin) VALUES
  ('1-2',   '08:15', '09:25'),
  ('3-4',   '09:40', '10:50'),
  ('5-6',   '11:05', '12:15'),
  ('7-8',   '12:30', '13:40'),
  ('9-10',  '14:40', '15:50'),
  ('11-12', '16:05', '17:15'),
  ('13-14', '17:30', '18:40'),
  ('15-16', '18:55', '20:05');

-- ============================================================
-- Verificación post-migración
-- ============================================================
-- SELECT * FROM config_bloques_sede ORDER BY sede, tipo_dia, bloque;
-- (debe haber 32 filas: 2 sedes x 2 tipo_dia x 8 bloques)
-- SELECT * FROM config_horarios_bloque ORDER BY bloque;
-- (debe haber 8 filas)
