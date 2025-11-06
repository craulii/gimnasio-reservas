"use client";
import { useState } from "react";
import EstadisticasGeneral from "./estadisticas/EstadisticasGeneral";
import EstadisticasAlumno from "./estadisticas/EstadisticasAlumno";
import EstadisticasBloque from "./estadisticas/EstadisticasBloque";

export default function EstadisticasTab({ cupos, setMessage }) {
  const [tipoEstadistica, setTipoEstadistica] = useState("general");
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "general", label: "General", desc: "Vista global del gimnasio" },
    { id: "alumno", label: "Por Alumno", desc: "Estadísticas individuales" },
    { id: "bloque", label: "Por Bloque", desc: "Análisis de horarios" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-3 border-b-2 border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTipoEstadistica(tab.id)}
            className={`px-6 py-3 font-medium transition-colors ${
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
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Cargando...
        </div>
      )}

      {/* Contenido según tab activo */}
      <div className="min-h-[400px]">
        {tipoEstadistica === "general" && (
          <EstadisticasGeneral setMessage={setMessage} setLoading={setLoading} />
        )}
        {tipoEstadistica === "alumno" && (
          <EstadisticasAlumno setMessage={setMessage} setLoading={setLoading} />
        )}
        {tipoEstadistica === "bloque" && (
          <EstadisticasBloque cupos={cupos} setMessage={setMessage} setLoading={setLoading} />
        )}
      </div>
    </div>
  );
}
