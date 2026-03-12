-- Migration: Fix Race Conditions (ejecutar en Supabase SQL Editor)
-- Fecha: 2026-03-12
-- Ejecutar DESPUÉS de deployar los fixes de código

-- ============================================================
-- 1. Eliminar cupos duplicados (mantener el de menor id)
-- ============================================================
DELETE FROM cupos a USING cupos b
WHERE a.bloque = b.bloque AND a.sede = b.sede AND a.fecha = b.fecha
AND a.id > b.id;

-- ============================================================
-- 2. Agregar UNIQUE constraint en cupos
-- ============================================================
ALTER TABLE cupos ADD CONSTRAINT cupos_bloque_sede_fecha_unique
UNIQUE (bloque, sede, fecha);

-- ============================================================
-- 3. Agregar UNIQUE constraint en reservas (1 reserva por alumno por día)
-- ============================================================
ALTER TABLE reservas ADD CONSTRAINT reservas_email_fecha_unique
UNIQUE (email, fecha);

-- ============================================================
-- 4. Sincronizar contadores de reservados
-- ============================================================
UPDATE cupos c SET reservados = (
  SELECT COUNT(*) FROM reservas r
  WHERE r.bloque_horario = c.bloque AND r.fecha = c.fecha AND r.sede = c.sede
);

-- ============================================================
-- 5. Recalcular faltas REALES de todos los usuarios
--    basado en ausencias reales (asistio IN (0, 2)) posteriores a ultimo_reset_faltas
-- ============================================================
UPDATE users u SET faltas = (
  SELECT COUNT(*)
  FROM reservas r
  WHERE r.email = u.email
  AND r.asistio IN (0, 2)
  AND r.created_at > COALESCE(u.ultimo_reset_faltas, '2000-01-01')
);

-- ============================================================
-- 6. Desbanear usuarios que ahora tienen < 3 faltas
-- ============================================================
UPDATE users SET baneado = 0 WHERE faltas < 3 AND baneado = 1;

-- ============================================================
-- 7. Banear usuarios que realmente tienen >= 3 faltas
-- ============================================================
UPDATE users SET baneado = 1 WHERE faltas >= 3 AND baneado = 0;

-- ============================================================
-- Verificación post-migración
-- ============================================================
-- SELECT bloque, sede, fecha, COUNT(*) FROM cupos GROUP BY 1,2,3 HAVING COUNT(*) > 1;
-- (debe retornar 0 filas)
-- SELECT email, faltas, baneado FROM users WHERE faltas > 0 OR baneado = 1;
-- (verificar que faltas coinciden con realidad)
