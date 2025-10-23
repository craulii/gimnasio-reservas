"use client";
import { useState } from "react";
import ApiService from "../../../services/api";

export default function EstadisticasAlumno({ fechaInicio, fechaFin, setMessage, setLoading }) {
  const [emailAlumno, setEmailAlumno] = useState("");
  const [estadisticasAlumno, setEstadisticasAlumno] = useState({});

  const cargarEstadisticasAlumno = async () => {
    if (!emailAlumno) {
      setMessage("Por favor ingresa un email");
      return;
    }
    
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getEstadisticasAlumno(emailAlumno, fechaInicio, fechaFin);
      if (ok) {
        setEstadisticasAlumno(data);
        setMessage("");
      } else {
        setMessage("Error cargando estadísticas del alumno");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
    setLoading(false);
  };

  const limpiarEstadisticas = () => {
    setEstadisticasAlumno({});
    setEmailAlumno("");
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email del alumno
          </label>
          <input
            type="email"
            placeholder="alumno@usm.cl"
            value={emailAlumno}
            onChange={(e) => setEmailAlumno(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-end space-x-2">
          <button
            onClick={cargarEstadisticasAlumno}
            disabled={!emailAlumno}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
          >
            Analizar Alumno
          </button>
          <button
            onClick={limpiarEstadisticas}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {estadisticasAlumno && Object.keys(estadisticasAlumno).length > 0 ? (
        <div className="space-y-6 mt-6">
          {/* Información del alumno */}
          {estadisticasAlumno.alumno && (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {estadisticasAlumno.alumno.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {estadisticasAlumno.alumno.name}
                  </h3>
                  <p className="text-gray-600">{estadisticasAlumno.alumno.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estadísticas generales */}
          {estadisticasAlumno.estadisticasGenerales && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total reservas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {estadisticasAlumno.estadisticasGenerales.total_reservas}
                </p>
                <p className="text-xs text-blue-600">
                  En {estadisticasAlumno.estadisticasGenerales.dias_activos} días
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Asistencias</p>
                <p className="text-2xl font-bold text-green-900">
                  {estadisticasAlumno.estadisticasGenerales.total_asistencias}
                </p>
                <p className="text-xs text-green-600">
                  {estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia}% de asistencia
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">vs Promedio</p>
                <p className="text-2xl font-bold text-purple-900">
                  {estadisticasAlumno.promedioGeneral
                    ? (estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia - 
                       estadisticasAlumno.promedioGeneral).toFixed(1)
                    : "N/A"}%
                </p>
                <p className="text-xs text-purple-600">
                  {estadisticasAlumno.estadisticasGenerales.porcentaje_asistencia > 
                   estadisticasAlumno.promedioGeneral ? "Mejor" : "Peor"} que el promedio
                </p>
              </div>
            </div>
          )}

          {/* Reservas por bloque */}
          {estadisticasAlumno.reservasPorBloque && estadisticasAlumno.reservasPorBloque.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">📊 Reservas por bloque horario</h4>
              <div className="space-y-2">
                {estadisticasAlumno.reservasPorBloque.map((bloque, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">Bloque {bloque.bloque_horario}</span>
                    <div className="text-sm text-gray-600">
                      {bloque.total_reservas} reservas • {bloque.asistencias} asistencias • 
                      {bloque.porcentaje_asistencia}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Días faltados */}
          {estadisticasAlumno.diasFaltados && estadisticasAlumno.diasFaltados.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                ❌ Días en que faltó ({estadisticasAlumno.diasFaltados.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {estadisticasAlumno.diasFaltados.map((falta, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{new Date(falta.fecha).toLocaleDateString()}</span>
                    <span className="text-gray-600">Bloque {falta.bloque_horario}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : emailAlumno === "" ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg mt-4">
          Ingresa el email de un alumno y presiona "Analizar Alumno" para ver sus estadísticas.
        </div>
      ) : null}
    </>
  );
}