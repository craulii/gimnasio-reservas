"use client";
import { useState, useEffect } from "react";
import ApiService from "../../services/api";
import ReservaBloque from "./ReservaBloque";

export default function ReservasTab({ cupos, setMessage, fetchCupos }) {
  const [loading, setLoading] = useState(false);
  const [reservasPorBloque, setReservasPorBloque] = useState({});

  useEffect(() => {
    cargarReservasPorBloque();
  }, []);

  const cargarReservasPorBloque = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getReservasPorBloque();
      if (ok) {
        setReservasPorBloque(data);
        setMessage("");
      } else {
        setMessage("Error al cargar reservas");
      }
    } catch (error) {
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const cancelarReserva = async (email, bloque_horario, fecha) => {
    if (!confirm(`¿Cancelar reserva de ${email} para ${bloque_horario}?`)) return;

    try {
      const { ok, data } = await ApiService.cancelarReserva(email, bloque_horario, fecha);
      
      if (ok && data.cancelada) {
        setMessage("Reserva cancelada exitosamente");
        await cargarReservasPorBloque();
        await fetchCupos();
      } else {
        setMessage("No se encontró la reserva para cancelar");
      }
    } catch (error) {
      setMessage("Error de conexión al cancelar reserva");
    }
  };

  const totalReservas = Object.values(reservasPorBloque).flat().length;
  const totalPresentes = Object.values(reservasPorBloque)
    .flat()
    .filter((r) => r.asistio).length;

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-800">
              Reservas de hoy - {new Date().toLocaleDateString("es-CL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <p className="text-sm text-gray-600">
              {totalReservas} reservas totales
            </p>
          </div>
          <button
            onClick={cargarReservasPorBloque}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? "Cargando..." : "🔄 Refrescar"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 bg-white rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Cargando reservas de hoy...</p>
        </div>
      ) : Object.keys(reservasPorBloque).length > 0 ? (
        <>
          <div className="space-y-4">
            {Object.entries(reservasPorBloque)
              .sort(([a], [b]) => {
                const aNum = parseInt(a.split("-")[0]);
                const bNum = parseInt(b.split("-")[0]);
                return aNum - bNum;
              })
              .map(([bloque, reservas]) => (
                <ReservaBloque
                  key={bloque}
                  bloque={bloque}
                  reservas={reservas}
                  cupoInfo={cupos[bloque]}
                  onCancelar={cancelarReserva}
                />
              ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              📊 Resumen del día
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Bloques activos:</span>
                <div className="text-blue-900 font-bold">
                  {Object.keys(reservasPorBloque).length}
                </div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Total reservas:</span>
                <div className="text-blue-900 font-bold">{totalReservas}</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Ya presentes:</span>
                <div className="text-blue-900 font-bold">{totalPresentes}</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">% Asistencia:</span>
                <div className="text-blue-900 font-bold">
                  {totalReservas > 0 ? Math.round((totalPresentes / totalReservas) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <div className="text-6xl mb-4">🏃‍♂️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay reservas para hoy
          </h3>
          <p className="text-gray-500">
            Los alumnos aún no han hecho reservas para el día de hoy.
          </p>
        </div>
      )}
    </div>
  );
}