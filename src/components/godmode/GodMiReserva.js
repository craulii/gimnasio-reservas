"use client";
import { useState, useEffect } from "react";
import ApiService from "@/services/api";
import { HORARIOS_BLOQUE, HORARIOS_CIERRE, HORA_APERTURA_RESERVAS, getHoraChile, sortByBloque } from "@/app/utils/constants";

export default function GodMiReserva({ user, cupos, loading, setMessage, fetchCupos }) {
  const [sede, setSede] = useState("Vitacura");
  const [misReservas, setMisReservas] = useState([]);
  const [horaActual, setHoraActual] = useState(getHoraChile());

  useEffect(() => {
    obtenerMisReservas();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setHoraActual(getHoraChile()), 30000);
    return () => clearInterval(interval);
  }, []);

  const obtenerMisReservas = async () => {
    try {
      const { ok, data } = await ApiService.getMisReservas();
      if (ok && data.reservas) setMisReservas(data.reservas);
    } catch (error) {
      console.error("Error obteniendo reservas:", error);
    }
  };

  const hacerReserva = async (bloque, sedeCupo) => {
    if (!bloque || !sedeCupo) { setMessage("Selecciona bloque y sede"); return; }
    setMessage("Reservando...");
    try {
      const { ok, data } = await ApiService.makeReserva(bloque, sedeCupo);
      if (ok) {
        setMessage(String(data?.message || "Reserva realizada"));
        if (typeof fetchCupos === 'function') await fetchCupos();
        await obtenerMisReservas();
      } else {
        setMessage(String(data?.error || data?.message || "Error al reservar"));
      }
    } catch {
      setMessage("Error critico al reservar");
    }
  };

  const cancelarReserva = async (bloque, sedeCupo) => {
    if (!window.confirm(`Cancelar reserva bloque ${bloque} en ${sedeCupo}?`)) return;
    setMessage("Cancelando...");
    try {
      const { ok, data } = await ApiService.cancelarMiReserva(bloque, sedeCupo);
      if (ok) {
        setMessage("Reserva cancelada");
        if (typeof fetchCupos === 'function') await fetchCupos();
        await obtenerMisReservas();
      } else {
        setMessage(data?.error || data?.message || "Error al cancelar");
      }
    } catch {
      setMessage("Error al cancelar");
    }
  };

  const tieneReservaEn = (bloque, sedeCupo) => misReservas.some(r => r.bloque_horario === bloque && r.sede === sedeCupo);

  const bloqueExpirado = (bloque) => {
    const limite = HORARIOS_CIERRE[bloque];
    if (!limite) return false;
    return horaActual >= limite;
  };

  const antesDeApertura = horaActual < HORA_APERTURA_RESERVAS;

  const cuposData = cupos || {};
  const cuposFiltrados = Object.entries(cuposData)
    .filter(([, info]) => info.sede === sede)
    .sort(([, a], [, b]) => sortByBloque(a, b));

  return (
    <div className="space-y-4">
      {/* Header + Sede selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-mono text-white uppercase tracking-wider">Mi Reserva</h3>
          <span className="text-[10px] font-mono text-slate-600">{horaActual}</span>
        </div>
        <div className="flex gap-1">
          {["Vitacura", "San Joaquin"].map(s => {
            const val = s === "San Joaquin" ? "San Joaquín" : s;
            return (
              <button
                key={s}
                onClick={() => setSede(val)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-colors ${
                  sede === val
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:bg-slate-800 border border-slate-700'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner apertura */}
      {antesDeApertura && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 text-center">
          <p className="text-cyan-400 font-mono text-sm">Reservas abren 06:30 AM</p>
          <p className="text-slate-500 font-mono text-xs mt-1">Cupos visibles, reservas bloqueadas</p>
        </div>
      )}

      {/* Bloques */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-mono">Cargando cupos...</p>
        </div>
      ) : cuposFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-500 font-mono text-sm">Sin cupos en {sede}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cuposFiltrados.map(([key, info]) => {
            const disponibles = info.total - info.reservados;
            const yaReservado = tieneReservaEn(info.bloque, info.sede);
            const horario = HORARIOS_BLOQUE[info.bloque];
            const pctOcupado = info.total > 0 ? (info.reservados / info.total) * 100 : 0;
            const expirado = bloqueExpirado(info.bloque);

            let barColor = "bg-emerald-500";
            if (pctOcupado > 85) barColor = "bg-red-500";
            else if (pctOcupado >= 60) barColor = "bg-amber-500";

            return (
              <div
                key={key}
                className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                  yaReservado
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : expirado
                      ? 'border-slate-800 opacity-50'
                      : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-lg font-bold text-white font-mono">
                      {horario ? `${horario.inicio} - ${horario.fin}` : `Bloque ${info.bloque}`}
                    </p>
                    {horario && (
                      <p className="text-xs text-slate-500 font-mono">Bloque {info.bloque}</p>
                    )}
                  </div>
                  {yaReservado ? (
                    <button
                      onClick={() => cancelarReserva(info.bloque, info.sede)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg font-mono text-xs hover:bg-red-500/30 transition-colors"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      disabled={disponibles <= 0 || expirado || antesDeApertura}
                      onClick={() => hacerReserva(info.bloque, info.sede)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors ${
                        expirado || disponibles <= 0 || antesDeApertura
                          ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
                      }`}
                    >
                      {antesDeApertura ? "06:30" : expirado ? "Cerrado" : disponibles <= 0 ? "Lleno" : "Reservar"}
                    </button>
                  )}
                </div>

                {/* Barra progreso */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pctOcupado, 100)}%` }}
                  />
                </div>
                <p className={`text-xs font-mono ${disponibles > 0 ? 'text-slate-400' : 'text-red-400'}`}>
                  {disponibles > 0 ? `${disponibles} cupos disponibles` : "Sin cupos"}
                  <span className="text-slate-600 ml-2">({info.reservados}/{info.total})</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
