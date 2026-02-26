"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";
import { getFechaChile, sortByBloque } from "@/app/utils/constants";

export default function GodCupos({ cupos, setMessage, fetchCupos }) {
  const [bloque, setBloque] = useState("");
  const [sede, setSede] = useState("Vitacura");

  // Asistencia masiva
  const [bloqueAsis, setBloqueAsis] = useState("");
  const [sedeAsis, setSedeAsis] = useState("Vitacura");
  const [usuariosBloque, setUsuariosBloque] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Init selectores
  useEffect(() => {
    const keys = Object.keys(cupos || {});
    if (keys.length > 0) {
      const first = (cupos || {})[keys[0]];
      if (!bloque) { setBloque(first.bloque); setSede(first.sede); }
      if (!bloqueAsis) { setBloqueAsis(first.bloque); setSedeAsis(first.sede); }
    }
  }, [cupos]);

  // Cupos agrupados por sede
  const cuposData = cupos || {};
  const cuposPorSede = Object.values(cuposData).reduce((acc, c) => {
    if (!acc[c.sede]) acc[c.sede] = [];
    acc[c.sede].push(c);
    return acc;
  }, {});
  const cuposSede = (cuposPorSede[sede] || []).sort(sortByBloque);
  const cuposAsisSede = (cuposPorSede[sedeAsis] || []).sort(sortByBloque);

  const modificarCupos = async (cantidad) => {
    if (!bloque || !sede) { setMessage("Selecciona bloque y sede"); return; }
    try {
      const cupoActual = Object.values(cuposData).find(c => c.bloque === bloque && c.sede === sede);
      const nuevoTotal = (cupoActual?.total || 0) + cantidad;
      if (nuevoTotal < 0) { setMessage("No puedes tener cupos negativos"); return; }

      const { ok, data } = await ApiService.updateCupos(bloque, sede, nuevoTotal);
      if (ok) {
        await fetchCupos();
        setMessage(data?.message || "Cupos actualizados");
      } else {
        setMessage(String(data?.error || data?.message || "Error al actualizar"));
      }
    } catch {
      setMessage("Error de conexion");
    }
  };

  const cargarUsuariosBloque = async () => {
    if (!bloqueAsis || !sedeAsis) { setMessage("Selecciona bloque y sede"); return; }
    setLoadingUsuarios(true);
    setUsuariosBloque([]);
    try {
      const fecha = getFechaChile();
      const { ok, data } = await ApiService.getUsuariosBloque(bloqueAsis, sedeAsis, fecha);
      const lista = Array.isArray(data) ? data : (data?.usuarios || []);
      if (ok && lista.length > 0) {
        setUsuariosBloque(lista);
        const init = {};
        lista.forEach(u => { init[u.email] = u.asistio === null ? null : u.asistio === 1; });
        setAsistencias(init);
        setMessage(`${lista.length} alumno${lista.length !== 1 ? 's' : ''} cargado${lista.length !== 1 ? 's' : ''}`);
      } else {
        setUsuariosBloque([]);
        setAsistencias({});
        setMessage("Sin alumnos en este bloque hoy");
      }
    } catch {
      setMessage("Error al cargar alumnos");
      setUsuariosBloque([]);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const toggleAsistencia = (email) => {
    setAsistencias(prev => {
      const cur = prev[email];
      let next;
      if (cur === null) next = true;
      else if (cur === true) next = false;
      else next = null;
      return { ...prev, [email]: next };
    });
  };

  const marcarTodos = (estado) => {
    const nuevas = {};
    usuariosBloque.forEach(u => { nuevas[u.email] = estado; });
    setAsistencias(nuevas);
  };

  const guardarAsistencias = async () => {
    const hayPendientes = Object.values(asistencias).some(v => v === null);
    if (hayPendientes) {
      if (!window.confirm("Hay pendientes. Guardar de todas formas? Los pendientes NO se registraran.")) return;
    }
    setGuardando(true);
    try {
      const arr = Object.entries(asistencias)
        .filter(([, v]) => v !== null)
        .map(([email, asistio]) => ({ email, asistio }));
      if (arr.length === 0) { setMessage("Sin cambios para guardar"); setGuardando(false); return; }

      const fecha = getFechaChile();
      const { ok, data } = await ApiService.registrarAsistenciaMasiva(arr, bloqueAsis, sedeAsis, fecha);
      if (ok) {
        setMessage(data?.message || "Asistencias guardadas");
        setTimeout(() => cargarUsuariosBloque(), 1000);
      } else {
        setMessage(data?.error || data?.message || "Error al guardar");
      }
    } catch {
      setMessage("Error de conexion");
    } finally {
      setGuardando(false);
    }
  };

  const contadores = {
    presentes: Object.values(asistencias).filter(a => a === true).length,
    ausentes: Object.values(asistencias).filter(a => a === false).length,
    pendientes: Object.values(asistencias).filter(a => a === null).length,
    total: usuariosBloque.length,
  };

  // Sede toggle component
  const SedeToggle = ({ value, onChange }) => (
    <div className="flex gap-1">
      {["Vitacura", "San Joaquin"].map(s => {
        const val = s === "San Joaquin" ? "San Joaquín" : s;
        return (
          <button
            key={s}
            onClick={() => onChange(val)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono transition-colors ${
              value === val
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Modificar cupos */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-3">Gestion de cupos</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Sede</label>
              <SedeToggle value={sede} onChange={setSede} />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Bloque</label>
              <select
                value={bloque || ""}
                onChange={(e) => setBloque(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {cuposSede.map(c => (
                  <option key={`${c.bloque}-${c.sede}`} value={c.bloque}>
                    Bloque {c.bloque} — Total: {c.total} | Reservados: {c.reservados}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => modificarCupos(1)}
                className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono text-sm hover:bg-emerald-500/30 transition-colors"
              >
                + Sumar
              </button>
              <button
                onClick={() => modificarCupos(-1)}
                className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-mono text-sm hover:bg-red-500/30 transition-colors"
              >
                - Restar
              </button>
            </div>
          </div>
        </div>

        {/* Asistencia masiva */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-3">Asistencia masiva</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Sede</label>
              <SedeToggle value={sedeAsis} onChange={setSedeAsis} />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Bloque</label>
              <select
                value={bloqueAsis || ""}
                onChange={(e) => setBloqueAsis(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {cuposAsisSede.map(c => (
                  <option key={`${c.bloque}-${c.sede}`} value={c.bloque}>
                    Bloque {c.bloque} ({c.reservados} reservados)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={cargarUsuariosBloque}
              disabled={loadingUsuarios}
              className="w-full py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg font-mono text-sm hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {loadingUsuarios ? "Cargando..." : "Cargar alumnos"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista alumnos asistencia */}
      {usuariosBloque.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <div>
              <h3 className="text-sm font-mono text-white uppercase tracking-wider">
                Bloque {bloqueAsis} — {sedeAsis}
              </h3>
              <div className="flex gap-4 mt-1 text-xs font-mono">
                <span className="text-emerald-400">Presentes: {contadores.presentes}</span>
                <span className="text-red-400">Ausentes: {contadores.ausentes}</span>
                <span className="text-slate-500">Pendientes: {contadores.pendientes}</span>
                <span className="text-slate-400">Total: {contadores.total}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => marcarTodos(true)} className="px-2.5 py-1 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors">
                Todos presente
              </button>
              <button onClick={() => marcarTodos(false)} className="px-2.5 py-1 text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors">
                Todos ausente
              </button>
              <button onClick={() => marcarTodos(null)} className="px-2.5 py-1 text-[10px] font-mono bg-slate-700 text-slate-400 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors">
                Limpiar
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto mb-4 pr-1">
            {usuariosBloque.map(user => {
              const estado = asistencias[user.email];
              let cardCls, icon, label;
              if (estado === true) {
                cardCls = "bg-emerald-500/10 border-emerald-500/40";
                icon = <span className="text-emerald-400 font-bold">&#10003;</span>;
                label = "Presente";
              } else if (estado === false) {
                cardCls = "bg-red-500/10 border-red-500/40";
                icon = <span className="text-red-400 font-bold">&#10007;</span>;
                label = "Ausente";
              } else {
                cardCls = "bg-slate-800/50 border-slate-700";
                icon = <span className="text-slate-500">&#8943;</span>;
                label = "Pendiente";
              }

              return (
                <div
                  key={user.email}
                  onClick={() => toggleAsistencia(user.email)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg border cursor-pointer transition-all hover:brightness-110 ${cardCls}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{user.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                    {user.faltas > 0 && (
                      <p className="text-[10px] text-amber-400 font-mono mt-0.5">
                        {user.faltas} falta{user.faltas > 1 ? 's' : ''}
                        {user.baneado === 1 && " — BANNED"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono hidden sm:block">{label}</span>
                    <span className="text-xl">{icon}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={guardarAsistencias}
            disabled={guardando || contadores.total === 0}
            className="w-full py-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg font-mono text-sm hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {guardando ? "Guardando..." : `Guardar asistencia (${contadores.presentes + contadores.ausentes} de ${contadores.total})`}
          </button>
        </div>
      )}
    </div>
  );
}
