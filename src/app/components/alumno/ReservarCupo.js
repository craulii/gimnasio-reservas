"use client";
import { useState, useEffect } from "react";
import ApiService from "../../services/api";

export default function ReservarCupo({ user, cupos, loading, setMessage, fetchCupos }) {
  const [sedeSeleccionada, setSedeSeleccionada] = useState("Vitacura");
  const [mostrarRecordatorio, setMostrarRecordatorio] = useState(false);
  const [misReservas, setMisReservas] = useState([]);

  // Obtener las reservas del alumno al cargar
  useEffect(() => {
    obtenerMisReservas();
  }, []);

  const obtenerMisReservas = async () => {
    try {
      const { ok, data } = await ApiService.getMisReservas(user);
      if (ok && data.reservas) {
        setMisReservas(data.reservas);
      }
    } catch (error) {
      console.error("Error obteniendo reservas:", error);
    }
  };

  const hacerReserva = async (bloque, sede) => {
    if (!bloque || !sede) {
      setMessage("Selecciona un bloque y sede primero");
      return;
    }

    setMessage("Reservando...");
    try {
      const { ok, data } = await ApiService.makeReserva(bloque, sede, user);
      
      if (ok) {
        setMostrarRecordatorio(true);
        
        // Extraer solo el mensaje si viene como objeto JSON o string JSON
        let mensaje = data;
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            mensaje = parsed.message || data;
          } catch {
            mensaje = data;
          }
        } else if (typeof data === 'object' && data.message) {
          mensaje = data.message;
        }
        
        setMessage(mensaje || "Reserva realizada exitosamente");
        
        await fetchCupos();
        await obtenerMisReservas();
        
        setTimeout(() => {
          setMostrarRecordatorio(false);
        }, 8000);
      } else {
        setMessage(data || "Error al realizar la reserva");
      }
    } catch (error) {
      console.error("Error en reserva:", error);
      setMessage("Error al reservar");
    }
  };

  const cancelarReserva = async (bloque, sede) => {
    if (!window.confirm(`¿Estás seguro que deseas cancelar tu reserva para el bloque ${bloque} en ${sede}?`)) {
      return;
    }

    setMessage("Cancelando reserva...");
    try {
      const { ok, data } = await ApiService.cancelarMiReserva(bloque, sede, user);
      
      if (ok) {
        setMessage("Reserva cancelada exitosamente");
        await fetchCupos();
        await obtenerMisReservas();
      } else {
        setMessage(data || "Error al cancelar la reserva");
      }
    } catch (error) {
      console.error("Error cancelando reserva:", error);
      setMessage("Error al cancelar la reserva");
    }
  };

  // Verificar si el alumno tiene reserva en un bloque específico
  const tieneReservaEn = (bloque, sede) => {
    return misReservas.some(r => r.bloque_horario === bloque && r.sede === sede);
  };

  // Filtrar cupos por sede seleccionada
  const cuposFiltrados = Object.entries(cupos).filter(([key, info]) => 
    info.sede === sedeSeleccionada
  );

  return (
    <div className="bg-gray-200 p-4 rounded-lg">
      <h2 className="text-lg font-medium text-gray-800 mb-3">
        Reservar cupo
      </h2>

      {/* RECORDATORIO - Solo aparece después de reservar */}
      {mostrarRecordatorio && (
        <div className="mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4 rounded-lg shadow-lg border-2 border-yellow-500">
          <h3 className="font-bold text-lg mb-2">
            Recordatorio importante
          </h3>
          <p className="text-sm mb-2">No olvides llevar:</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Credencial USM</li>
            <li>Toalla de mano</li>
            <li>Ropa deportiva</li>
          </ul>
        </div>
      )}

      {/* Selector de Sede */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecciona tu sede:
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setSedeSeleccionada("Vitacura")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              sedeSeleccionada === "Vitacura"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Vitacura
          </button>
          <button
            onClick={() => setSedeSeleccionada("San Joaquín")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              sedeSeleccionada === "San Joaquín"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            San Joaquín
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center">Cargando cupos...</p>
      ) : cuposFiltrados.length === 0 ? (
        <p className="text-center">No hay cupos disponibles en {sedeSeleccionada}</p>
      ) : (
        <div className="space-y-2">
          {cuposFiltrados.map(([key, info]) => {
            const disponibles = info.total - info.reservados;
            const yaReservado = tieneReservaEn(info.bloque, info.sede);
            
            return (
              <div
                key={key}
                className="flex justify-between items-center bg-white rounded p-3 shadow-sm"
              >
                <div>
                  <strong className="text-gray-800">Bloque {info.bloque}</strong>
                  <p className="text-sm text-gray-600">
                    Cupos: {disponibles} / {info.total} (Reservados: {info.reservados})
                  </p>
                  <p className="text-xs text-gray-500">{info.sede}</p>
                </div>
                
                {yaReservado ? (
                  // Botón CANCELAR (rojo) si ya tiene reserva
                  <button
                    onClick={() => cancelarReserva(info.bloque, info.sede)}
                    className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700 transition"
                  >
                    Cancelar
                  </button>
                ) : (
                  // Botón RESERVAR (indigo) si no tiene reserva
                  <button
                    disabled={disponibles <= 0}
                    onClick={() => hacerReserva(info.bloque, info.sede)}
                    className={`px-4 py-2 rounded text-white ${
                      disponibles > 0
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Reservar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
