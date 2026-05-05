"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";
import { sortBloques } from "@/app/utils/constants";
import { formatearRut } from "@/lib/rut";

export default function GodReservas({ setMessage, fetchCupos }) {
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState({});
  const [expandido, setExpandido] = useState({});
  const [sede, setSede] = useState("Vitacura");

  useEffect(() => {
    cargarReservas();
  }, [sede]);

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getReservasPorBloque(sede);
      if (ok) {
        const datos = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
        setReservas(datos);
        const total = Object.values(datos).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
        setMessage(`${total} reservas en ${Object.keys(datos).length} bloques`);
      } else {
        setReservas({});
        setMessage("Error al cargar reservas");
      }
    } catch {
      setReservas({});
      setMessage("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  const cancelarReserva = async (email, bloqueHorario, sedeReserva, fecha) => {
    if (!confirm(`Cancelar reserva de ${email}?`)) return;
    try {
      const fechaCancel = fecha || new Date().toISOString().split('T')[0];
      const { ok, data } = await ApiService.cancelarReserva(email, bloqueHorario, sedeReserva, fechaCancel);
      if (ok) {
        setMessage(data?.message || "Reserva cancelada");
        await cargarReservas();
        if (fetchCupos) await fetchCupos();
      } else {
        setMessage(data?.error || data?.message || "Error al cancelar");
      }
    } catch {
      setMessage("Error de conexion");
    }
  };

  const toggleBloque = (key) => {
    setExpandido(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalReservas = Object.values(reservas || {}).reduce((acc, u) => acc + (Array.isArray(u) ? u.length : 0), 0);

  function asistenciaBadge(asistio) {
    if (asistio === 1) return { cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Presente" };
    if (asistio === 0) return { cls: "bg-red-500/20 text-red-400 border-red-500/30", label: "Ausente" };
    return { cls: "bg-slate-700 text-slate-400 border-slate-600", label: "Pendiente" };
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-mono text-white uppercase tracking-wider">Reservas de Hoy</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {totalReservas} reserva{totalReservas !== 1 ? 's' : ''} en {Object.keys(reservas || {}).length} bloque{Object.keys(reservas || {}).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {["Vitacura", "San Joaquin"].map(s => {
                const val = s === "San Joaquin" ? "San Joaquín" : s;
                return (
                  <button
                    key={s}
                    onClick={() => setSede(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      sede === val
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <button
              onClick={cargarReservas}
              disabled={loading}
              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-mono hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {loading ? "Cargando..." : "Refrescar"}
            </button>
          </div>
        </div>
      </div>

      {/* Bloques */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-mono">Cargando reservas...</p>
        </div>
      ) : Object.keys(reservas || {}).length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-500 font-mono text-sm">Sin reservas para hoy en {sede}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(reservas).sort(([a], [b]) => sortBloques(a, b)).map(([bloqueKey, usuarios]) => {
            if (!Array.isArray(usuarios)) return null;
            const abierto = expandido[bloqueKey];

            return (
              <div key={bloqueKey} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Header bloque */}
                <div
                  onClick={() => toggleBloque(bloqueKey)}
                  className="flex justify-between items-center px-4 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors select-none"
                >
                  <div>
                    <span className="text-white font-mono text-sm font-bold">Bloque {bloqueKey}</span>
                    <span className="text-slate-500 text-xs font-mono ml-3">
                      {usuarios.length} alumno{usuarios.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-lg">{abierto ? '−' : '+'}</span>
                </div>

                {/* Lista usuarios */}
                {abierto && (
                  <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                    {usuarios.map((user, idx) => {
                      const badge = asistenciaBadge(user.asistio);
                      return (
                        <div key={`${bloqueKey}-${idx}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{user.nombre || "Sin Nombre"}</p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              {user.rut ? formatearRut(user.rut) : "Sin RUT"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500 font-mono">{user.email}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelarReserva(user.email, bloqueKey, user.sede, user.fecha); }}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
                            title="Cancelar reserva"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
