import pool from "@/lib/db";
import { BLOQUES_HORARIOS, SEDES, HORARIOS_BLOQUE, HORARIO_CIERRE_SEDE, getBloquesParaSedeFecha } from "@/app/utils/constants";

// Cache en memoria (misma idea que rate-limit.js): evita pegarle a la BD
// en cada request de /api/cupos, que es de alto trafico.
const TTL_MS = 30 * 1000;
let cache = { data: null, expiresAt: 0 };

export function invalidarCacheConfigBloques() {
  cache = { data: null, expiresAt: 0 };
}

async function cargarConfig() {
  const [filasActivos] = await pool.execute(
    "SELECT sede, bloque, tipo_dia, activo FROM config_bloques_sede"
  );
  const [filasHorarios] = await pool.execute(
    "SELECT bloque, hora_inicio, hora_fin FROM config_horarios_bloque"
  );

  const activos = {};
  for (const fila of filasActivos) {
    activos[fila.sede] ??= {};
    activos[fila.sede][fila.tipo_dia] ??= {};
    activos[fila.sede][fila.tipo_dia][fila.bloque] = Number(fila.activo) === 1;
  }

  const horarios = {};
  for (const fila of filasHorarios) {
    horarios[fila.bloque] = {
      inicio: String(fila.hora_inicio).slice(0, 5),
      fin: String(fila.hora_fin).slice(0, 5),
    };
  }

  return { activos, horarios };
}

async function getConfig() {
  const ahora = Date.now();
  if (cache.data && ahora < cache.expiresAt) return cache.data;
  const data = await cargarConfig();
  cache = { data, expiresAt: ahora + TTL_MS };
  return data;
}

function esViernes(fechaStr) {
  return new Date(fechaStr + 'T12:00:00').getDay() === 5;
}

// Misma formula que getBloquesParaSedeFecha, pero por tipo_dia en vez de fecha
// (para armar la grilla de admin, que no tiene una fecha concreta por fila).
function fallbackActivo(sede, tipoDia, bloque) {
  const restricciones = HORARIO_CIERRE_SEDE[sede];
  if (!restricciones) return true;
  const limite = tipoDia === 'viernes' ? restricciones.viernes : restricciones.default;
  return parseInt(bloque.split('-')[0]) <= limite;
}

// Reemplazo async de getBloquesParaSedeFecha. Si falta la sede o un bloque
// puntual en BD, cae de vuelta a la constante hardcodeada (fallback seguro
// fila por fila, no todo-o-nada).
export async function getBloquesActivosAsync(sede, fechaStr) {
  const config = await getConfig();
  const tipoDia = esViernes(fechaStr) ? 'viernes' : 'normal';
  const sedeConfig = config.activos?.[sede]?.[tipoDia];
  const fallback = new Set(getBloquesParaSedeFecha(sede, fechaStr));

  return BLOQUES_HORARIOS.filter((bloque) => {
    const activo = sedeConfig?.[bloque];
    return activo !== undefined ? activo : fallback.has(bloque);
  });
}

export async function getHorariosBloqueAsync() {
  const config = await getConfig();
  const merged = {};
  for (const bloque of BLOQUES_HORARIOS) {
    merged[bloque] = config.horarios?.[bloque] || HORARIOS_BLOQUE[bloque];
  }
  return merged;
}

function sumarMinutos(horaHHMM, minutos) {
  const [h, m] = horaHHMM.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

export async function getHorariosLimiteAsync() {
  const horarios = await getHorariosBloqueAsync();
  const out = {};
  for (const bloque of BLOQUES_HORARIOS) out[bloque] = sumarMinutos(horarios[bloque].inicio, 15);
  return out;
}

export async function getHorariosCierreAsync() {
  const horarios = await getHorariosBloqueAsync();
  const out = {};
  for (const bloque of BLOQUES_HORARIOS) out[bloque] = sumarMinutos(horarios[bloque].inicio, 25);
  return out;
}

// Config completa para el panel admin: siempre devuelve los 8 bloques x 2
// sedes x 2 tipos de dia, rellenando huecos con el fallback hardcodeado.
// Lectura fresca (sin cache) para que el admin vea siempre el estado real.
export async function getConfigCompletaAdmin() {
  const data = await cargarConfig();

  const activos = {};
  for (const sede of SEDES) {
    activos[sede] = {};
    for (const tipoDia of ['normal', 'viernes']) {
      activos[sede][tipoDia] = {};
      for (const bloque of BLOQUES_HORARIOS) {
        const guardado = data.activos?.[sede]?.[tipoDia]?.[bloque];
        activos[sede][tipoDia][bloque] = guardado !== undefined ? guardado : fallbackActivo(sede, tipoDia, bloque);
      }
    }
  }

  const horarios = {};
  for (const bloque of BLOQUES_HORARIOS) {
    horarios[bloque] = data.horarios?.[bloque] || HORARIOS_BLOQUE[bloque];
  }

  return { activos, horarios };
}
