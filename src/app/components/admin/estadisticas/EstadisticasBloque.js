"use client";
import { useState } from "react";
import ApiService from "../../../services/api";

export default function EstadisticasBloque({ fechaInicio, fechaFin, cupos, setMessage, setLoading }) {
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState("");
  const [estadisticasBloque, setEstadisticasBloque] = useState({});

  const cargarEstadisticasBloque = async () => {
    if (!bloqueSeleccionado) {
      setMessage("Por favor selecciona un bloque");
      return;
    }
    
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getEstadisticasBloque(
        bloqueSeleccionado, 
        fechaInicio, 
        fechaFin
      );
      if (ok) {
        setEstadisticasBloque(data);
        setMessage("");
      } else {
        setMessage("Error cargando estadísticas del bloque");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
    setLoading(false);
  };

  const limpiarEstadisticas = () => {
    setEstadisticasBloque({});
    setBloqueSeleccionado("");
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bloque horario
          </label>
          <select
            value={bloqueSeleccionado}
            onChange={(e) => setBloqueSeleccionado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar bloque</option>
            {Object.keys(cupos).map((b) => (
              <option key={b} value={b}>
                Bloque {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end space-x-2">
          <button
            onClick={cargarEstadisticasBloque}
            disabled={!bloqueSeleccionado}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
          >
            🕐 Analizar Bloque
          </button>
          <button
            onClick={limpiarEstadisticas}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {estadisticasBloque && Object.keys(estadisticasBloque).length > 0 ? (
        <div className="space-y-6 mt-6">
          {/* Header */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">
              🕐 Análisis del Bloque {estadisticasBloque.bloque}
            </h3>
          </div>

          {/* Estadísticas generales */}
          {estadisticasBloque.estadisticasGenerales && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total reservas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {estadisticasBloque.estadisticasGenerales.total_reservas}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Alumnos únicos</p>
                <p className="text-2xl font-bold text-green-900">
                  {estadisticasBloque.estadisticasGenerales.alumnos_unicos}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">% Asistencia</p>
                <p className="text-2xl font-bold text-purple-900">
                  {estadisticasBloque.estadisticasGenerales.porcentaje_asistencia}%
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Promedio/día</p>
                <p className="text-2xl font-bold text-orange-900">
                  {estadisticasBloque.estadisticasGenerales.promedio_reservas_por_dia}
                </p>
              </div>
            </div>
          )}

          {/* Datos por día */}
          {estadisticasBloque.datosPorDia && estadisticasBloque.datosPorDia.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                📊 Reservas por día (últimos 30 días)
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {estadisticasBloque.datosPorDia.map((dia, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <div className="w-20 text-xs text-gray-600">
                      {new Date(dia.fecha).toLocaleDateString()}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                      <div
                        className="bg-indigo-600 h-4 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max((dia.reservas / 20) * 100, 5)}%`,
                        }}
                      >
                        <span className="text-white text-xs">{dia.reservas}</span>
                      </div>
                    </div>
                    <div className="w-12 text-xs text-gray-600">
                      {dia.porcentaje_asistencia}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alumnos frecuentes */}
          {estadisticasBloque.alumnosFrecuentes && estadisticasBloque.alumnosFrecuentes.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                👥 Alumnos más frecuentes en este bloque
              </h4>
              <div className="space-y-2">
                {estadisticasBloque.alumnosFrecuentes.slice(0, 5).map((alumno, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{alumno.name}</span>
                      <span className="text-sm text-gray-600 ml-2">{alumno.email}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {alumno.veces_reservado} veces • {alumno.porcentaje_asistencia}% asistencia
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : bloqueSeleccionado === "" ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg mt-4">
          Selecciona un bloque y presiona "Analizar Bloque" para ver sus estadísticas.
        </div>
      ) : null}
    </>
  );
}