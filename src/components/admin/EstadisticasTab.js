"use client";
import { useState } from "react";
import { getFechaChile } from "../../app/utils/constants";
import EstadisticasGeneral from "./estadisticas/EstadisticasGeneral";
import EstadisticasAlumno from "./estadisticas/EstadisticasAlumno";
import EstadisticasBloque from "./estadisticas/EstadisticasBloque";
import ExportarDatos from "./estadisticas/ExportarDatos";

function calcularFechaInicio() {
  const hoy = getFechaChile();
  const [y, m, d] = hoy.split('-').map(Number);
  const fecha = new Date(y, m - 1, d - 30);
  return fecha.toLocaleDateString('en-CA');
}

export default function EstadisticasTab({ cupos = {}, setMessage }) {
  const [tipoEstadistica, setTipoEstadistica] = useState("general");
  const [loading, setLoading] = useState(false);

  const [fechaInicio, setFechaInicio] = useState(calcularFechaInicio);
  const [fechaFin, setFechaFin] = useState(getFechaChile);

  const tabs = [
    { id: "general", label: "General", desc: "Vista global del gimnasio" },
    { id: "alumno", label: "Por Alumno", desc: "Estadísticas individuales" },
    { id: "bloque", label: "Por Bloque", desc: "Análisis de horarios" },
    { id: "exportar", label: "Exportar", desc: "Descargar datos en Excel" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-3 border-b-2 border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTipoEstadistica(tab.id)}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              tipoEstadistica === tab.id
                ? "border-b-4 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading global */}
      {loading && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          Cargando datos...
        </div>
      )}

      {/* Selector de fechas (solo Alumno y Bloque) */}
      {(tipoEstadistica === "alumno" || tipoEstadistica === "bloque") && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium text-sm">Desde:</span>
            <input 
              type="date" 
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium text-sm">Hasta:</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <span className="text-xs text-gray-500 italic ml-auto">
            * Selecciona el rango para analizar
          </span>
        </div>
      )}

      {/* Contenido según tab activo */}
      <div className="min-h-[400px]">
        {tipoEstadistica === "general" && (
          // General maneja su propio selector de periodo internamente
          <EstadisticasGeneral 
            setMessage={setMessage} 
            setLoading={setLoading} 
          />
        )}
        
        {tipoEstadistica === "alumno" && (
          <EstadisticasAlumno 
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            setMessage={setMessage} 
            setLoading={setLoading} 
          />
        )}
        
        {tipoEstadistica === "bloque" && (
          <EstadisticasBloque
            cupos={cupos}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            setMessage={setMessage}
            setLoading={setLoading}
          />
        )}

        {tipoEstadistica === "exportar" && (
          <ExportarDatos setMessage={setMessage} />
        )}
      </div>
    </div>
  );
}