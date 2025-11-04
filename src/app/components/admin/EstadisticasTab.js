"use client";
import { useState } from "react";
import EstadisticasGeneral from "./estadisticas/EstadisticasGeneral";
import EstadisticasAlumno from "./estadisticas/EstadisticasAlumno";
import EstadisticasBloque from "./estadisticas/EstadisticasBloque";
import ExportarDatos from "./estadisticas/ExportarDatos";

export default function EstadisticasTab({ cupos, setMessage }) {
  const [tipoEstadistica, setTipoEstadistica] = useState("general");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "general", label: "General", desc: "Vista global del gimnasio" },
    { id: "alumno", label: "Por Alumno", desc: "Estadísticas individuales" },
    { id: "bloque", label: "Por Bloque", desc: "Análisis de horarios" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex space-x-4 mb-4">
          {tabs.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setTipoEstadistica(tipo.id)}
              className={`flex-1 p-3 rounded-lg text-left transition-colors ${
                tipoEstadistica === tipo.id
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="font-medium">{tipo.label}</div>
              <div className="text-xs opacity-75">{tipo.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 bg-white rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      )}

      {!loading && (
        <>
          {tipoEstadistica === "general" && (
            <EstadisticasGeneral 
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
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
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              cupos={cupos}
              setMessage={setMessage}
              setLoading={setLoading}
            />
          )}
        </>
      )}

      <ExportarDatos setMessage={setMessage} />
    </div>
  );
}