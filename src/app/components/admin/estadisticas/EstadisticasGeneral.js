"use client";
import { useState } from "react";
import ApiService from "../../../services/api";

export default function EstadisticasGeneral({ fechaInicio, fechaFin, setMessage, setLoading }) {
  const [estadisticas, setEstadisticas] = useState({});

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getEstadisticas(fechaInicio, fechaFin);
      if (ok) {
        setEstadisticas(data);
      } else {
        setMessage("Error cargando estadísticas");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex items-end">
        <button
          onClick={cargarEstadisticas}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          📈 Cargar estadísticas
        </button>
      </div>

      {estadisticas && Object.keys(estadisticas).length > 0 ? (
        <div className="space-y-6">
          {estadisticas.resumen && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Alumnos activos</p>
                <p className="text-2xl font-bold text-blue-900">
                  {estadisticas.resumen.total_alumnos_activos || 0}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Total reservas</p>
                <p className="text-2xl font-bold text-green-900">
                  {estadisticas.resumen.total_reservas || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Asistencias</p>
                <p className="text-2xl font-bold text-purple-900">
                  {estadisticas.resumen.total_asistencias || 0}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">% Asistencia</p>
                <p className="text-2xl font-bold text-orange-900">
                  {estadisticas.resumen.porcentaje_asistencia_general || 0}%
                </p>
              </div>
            </div>
          )}

          {estadisticas.estadisticasBloques && estadisticas.estadisticasBloques.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Estadísticas por bloque
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bloque
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reservas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asistencias
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % Asistencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadisticas.estadisticasBloques.map((bloque) => (
                      <tr key={bloque.bloque_horario}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bloque.bloque_horario}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bloque.total_reservas}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bloque.total_asistencias}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bloque.porcentaje_asistencia}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {estadisticas.estadisticasAlumnos && estadisticas.estadisticasAlumnos.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Top 10 alumnos más activos
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alumno
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reservas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asistencias
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % Asistencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadisticas.estadisticasAlumnos.slice(0, 10).map((alumno) => (
                      <tr key={alumno.email}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {alumno.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.total_reservas}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.total_asistencias || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.porcentaje_asistencia || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          Selecciona un rango de fechas y presiona "Cargar estadísticas" para ver los datos generales.
        </div>
      )}
    </>
  );
}