"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ApiService from "@/services/api";
import { SEDES, getBloquesParaSedeFecha, HORARIOS_BLOQUE, sortBloques, getFechaChile } from "@/app/utils/constants";

export default function GodHerramientas({ setMessage }) {
  // --- Generar Cupos state ---
  const [fechaHasta, setFechaHasta] = useState("");
  const [generando, setGenerando] = useState(false);
  const [resultadoCupos, setResultadoCupos] = useState(null);

  // --- Reservar Alumno state ---
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [fechaReserva, setFechaReserva] = useState("");
  const [sedeReserva, setSedeReserva] = useState("Vitacura");
  const [bloqueReserva, setBloqueReserva] = useState("");
  const [bloquesDisponibles, setBloquesDisponibles] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [reservando, setReservando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef(null);

  // Date limits (Chile timezone — God Mode permite hoy)
  const hoyChile = getFechaChile();
  const hoyDate = new Date(hoyChile + 'T12:00:00');
  const maxDate = new Date(hoyDate);
  maxDate.setDate(maxDate.getDate() + 90);
  const minDateStr = hoyChile;
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // --- Búsqueda de alumnos con debounce ---
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!busqueda || busqueda.length < 2) {
      setResultados([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await ApiService.getUsuarios('todos', busqueda);
        if (res.ok && Array.isArray(res.data)) {
          setResultados(res.data.slice(0, 8));
        }
      } catch { /* ignore */ }
      setBuscando(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busqueda]);

  // --- Actualizar bloques cuando cambia sede o fecha ---
  useEffect(() => {
    if (fechaReserva && sedeReserva) {
      const bloques = getBloquesParaSedeFecha(sedeReserva, fechaReserva);
      setBloquesDisponibles(bloques.sort(sortBloques));
      setBloqueReserva("");
      setDisponibilidad(null);
    }
  }, [fechaReserva, sedeReserva]);

  // --- Cargar disponibilidad cuando cambia bloque ---
  const fetchDisponibilidad = useCallback(async () => {
    if (!fechaReserva || !sedeReserva) return;
    try {
      const res = await ApiService.getCuposFecha(fechaReserva, sedeReserva);
      if (res.ok) {
        setDisponibilidad(res.data);
      }
    } catch { /* ignore */ }
  }, [fechaReserva, sedeReserva]);

  useEffect(() => {
    if (fechaReserva && sedeReserva) {
      fetchDisponibilidad();
    }
  }, [fechaReserva, sedeReserva, fetchDisponibilidad]);

  // --- Generar cupos ---
  const handleGenerarCupos = async () => {
    if (!fechaHasta) { setMessage("Selecciona una fecha"); return; }
    setGenerando(true);
    setResultadoCupos(null);
    try {
      const res = await ApiService.generarCuposHastaFecha(fechaHasta);
      if (res.ok) {
        setResultadoCupos(res.data);
        setMessage(`Cupos generados: ${res.data.cuposCreados} nuevos en ${res.data.diasProcesados} días`);
      } else {
        setMessage("Error: " + (res.data?.error || "Error generando cupos"));
      }
    } catch {
      setMessage("Error critico generando cupos");
    }
    setGenerando(false);
  };

  // --- Reservar para alumno ---
  const handleReservar = async () => {
    if (!alumnoSeleccionado || !fechaReserva || !bloqueReserva || !sedeReserva) {
      setMessage("Completa todos los campos"); return;
    }
    if (!window.confirm(`Crear reserva para ${alumnoSeleccionado.name} (${alumnoSeleccionado.email})\n${bloqueReserva} en ${sedeReserva} el ${fechaReserva}?`)) return;

    setReservando(true);
    try {
      const res = await ApiService.reservarParaAlumno(alumnoSeleccionado.email, fechaReserva, bloqueReserva, sedeReserva);
      if (res.ok) {
        setMessage(res.data?.message || "Reserva creada");
        // Reset form
        setAlumnoSeleccionado(null);
        setBusqueda("");
        setFechaReserva("");
        setBloqueReserva("");
        setDisponibilidad(null);
      } else {
        setMessage("Error: " + (res.data?.error || "Error creando reserva"));
      }
    } catch {
      setMessage("Error critico al reservar");
    }
    setReservando(false);
  };

  const seleccionarAlumno = (alumno) => {
    setAlumnoSeleccionado(alumno);
    setBusqueda("");
    setResultados([]);
  };

  const getCupoInfo = (bloque) => {
    if (!disponibilidad) return null;
    const key = `${bloque}-${sedeReserva}`;
    return disponibilidad[key] || null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* === SECCIÓN 1: GENERAR CUPOS === */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <span className="bg-cyan-500/20 border border-cyan-500/40 rounded px-1.5 py-0.5 text-[10px]">GEN</span>
          Generar Cupos
        </h3>
        <p className="text-xs text-slate-500">
          Genera cupos desde hoy hasta la fecha seleccionada. Idempotente: no duplica cupos existentes.
        </p>

        <div>
          <label className="block text-xs text-slate-400 font-mono mb-1">Fecha hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            min={minDateStr}
            max={maxDateStr}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleGenerarCupos}
          disabled={generando || !fechaHasta}
          className={`w-full py-2.5 rounded-lg font-mono text-sm transition-colors ${
            generando || !fechaHasta
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
          }`}
        >
          {generando ? "Generando..." : "Generar cupos"}
        </button>

        {/* Resultado */}
        {resultadoCupos && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
            <p className="text-xs text-emerald-400 font-mono font-bold">Resultado:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-white font-mono">{resultadoCupos.diasProcesados}</p>
                <p className="text-[10px] text-slate-500 uppercase">Días</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400 font-mono">{resultadoCupos.cuposCreados}</p>
                <p className="text-[10px] text-slate-500 uppercase">Creados</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-400 font-mono">{resultadoCupos.cuposExistentes}</p>
                <p className="text-[10px] text-slate-500 uppercase">Ya existían</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === SECCIÓN 2: RESERVAR PARA ALUMNO === */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
          <span className="bg-emerald-500/20 border border-emerald-500/40 rounded px-1.5 py-0.5 text-[10px]">RES</span>
          Reservar para Alumno
        </h3>
        <p className="text-xs text-slate-500">
          Crea reservas sin restricciones de horario, ban o apertura.
        </p>

        {/* Búsqueda alumno */}
        <div className="relative">
          <label className="block text-xs text-slate-400 font-mono mb-1">Alumno</label>
          {alumnoSeleccionado ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              <span className="text-sm text-emerald-400 font-mono flex-1 truncate">
                {alumnoSeleccionado.name} — {alumnoSeleccionado.email}
              </span>
              <button
                onClick={() => { setAlumnoSeleccionado(null); setBusqueda(""); }}
                className="text-slate-400 hover:text-red-400 text-xs font-mono"
              >
                x
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
              {buscando && (
                <div className="absolute right-3 top-8 text-slate-500 text-xs font-mono">...</div>
              )}
              {resultados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                  {resultados.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => seleccionarAlumno(u)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      <p className="text-sm text-white font-mono truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{u.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-xs text-slate-400 font-mono mb-1">Fecha</label>
          <input
            type="date"
            value={fechaReserva}
            onChange={(e) => setFechaReserva(e.target.value)}
            min={minDateStr}
            max={maxDateStr}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Sede toggle */}
        <div>
          <label className="block text-xs text-slate-400 font-mono mb-1">Sede</label>
          <div className="flex gap-1">
            {["Vitacura", "San Joaquin"].map(s => {
              const val = s === "San Joaquin" ? "San Joaquín" : s;
              return (
                <button
                  key={s}
                  onClick={() => setSedeReserva(val)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-colors ${
                    sedeReserva === val
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector bloque */}
        {fechaReserva && (
          <div>
            <label className="block text-xs text-slate-400 font-mono mb-1">Bloque horario</label>
            <div className="grid grid-cols-2 gap-1.5">
              {bloquesDisponibles.map(bloque => {
                const horario = HORARIOS_BLOQUE[bloque];
                const cupoInfo = getCupoInfo(bloque);
                const disponibles = cupoInfo ? cupoInfo.total - cupoInfo.reservados : null;
                const lleno = disponibles !== null && disponibles <= 0;
                const selected = bloqueReserva === bloque;

                return (
                  <button
                    key={bloque}
                    onClick={() => setBloqueReserva(bloque)}
                    className={`py-2 px-2 rounded-lg text-xs font-mono transition-colors text-left ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : lleno
                          ? 'text-red-400/60 border border-slate-700 bg-slate-800/50'
                          : 'text-slate-400 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span className="block">{horario ? `${horario.inicio}-${horario.fin}` : bloque}</span>
                    {disponibles !== null && (
                      <span className={`text-[10px] ${lleno ? 'text-red-500' : 'text-slate-500'}`}>
                        {disponibles}/{cupoInfo.total} disp.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {bloquesDisponibles.length === 0 && (
              <p className="text-xs text-slate-600 font-mono text-center py-2">Sin bloques para esta sede/fecha</p>
            )}
          </div>
        )}

        {/* Botón reservar */}
        <button
          onClick={handleReservar}
          disabled={reservando || !alumnoSeleccionado || !fechaReserva || !bloqueReserva}
          className={`w-full py-2.5 rounded-lg font-mono text-sm transition-colors ${
            reservando || !alumnoSeleccionado || !fechaReserva || !bloqueReserva
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
        >
          {reservando ? "Reservando..." : "Crear reserva"}
        </button>
      </div>
    </div>
  );
}
