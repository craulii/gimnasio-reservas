"use client";
import { useState, useEffect } from "react";
import { FiPlus, FiMinus, FiCheck, FiX } from "react-icons/fi";
import ApiService from "../../services/api";

export default function GestionTab({ cupos, setMessage, fetchCupos }) {
  const [bloque, setBloque] = useState(null);
  const [sede, setSede] = useState("Vitacura");
  const [asistenciaUser, setAsistenciaUser] = useState("");
  const [asistenciaBloque, setAsistenciaBloque] = useState(null);
  const [asistenciaSede, setAsistenciaSede] = useState("Vitacura");
  const [asistenciaPresente, setAsistenciaPresente] = useState(true);

  useEffect(() => {
    const keys = Object.keys(cupos);
    if (keys.length > 0) {
      const firstCupo = cupos[keys[0]];
      if (!bloque) {
        setBloque(firstCupo.bloque);
        setSede(firstCupo.sede);
      }
      if (!asistenciaBloque) {
        setAsistenciaBloque(firstCupo.bloque);
        setAsistenciaSede(firstCupo.sede);
      }
    }
  }, [cupos]);

  const modificarCupos = async (cantidad) => {
    if (!bloque || !sede) {
      setMessage("Selecciona un bloque y sede primero");
      return;
    }

    setMessage("Actualizando cupos...");
    try {
      const cupoActual = Object.values(cupos).find(c => c.bloque === bloque && c.sede === sede);
      const nuevoTotal = (cupoActual?.total || 0) + cantidad;
      
      if (nuevoTotal < 0) {
        setMessage("No puedes tener cupos negativos");
        return;
      }

      const { ok, data } = await ApiService.updateCupos(bloque, sede, nuevoTotal);
      if (ok) {
        await fetchCupos();
        setMessage(data.message || "Cupos actualizados");
      } else {
        setMessage("Error al actualizar cupos");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
  };

  const marcarAsistencia = async () => {
    if (!asistenciaUser || !asistenciaBloque || !asistenciaSede) {
      setMessage("Completa todos los campos");
      return;
    }

    setMessage("Registrando asistencia...");
    try {
      const { ok, data } = await ApiService.marcarAsistencia(
        asistenciaUser,
        asistenciaBloque,
        asistenciaPresente
      );
      
      if (ok) {
        setMessage(data.message || "Operación completada");
        setAsistenciaUser("");
      } else {
        setMessage("Error al marcar asistencia");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
  };

  // Agrupar cupos por sede
  const cuposPorSede = Object.values(cupos).reduce((acc, cupo) => {
    if (!acc[cupo.sede]) acc[cupo.sede] = [];
    acc[cupo.sede].push(cupo);
    return acc;
  }, {});

  const cuposSedeSeleccionada = cuposPorSede[sede] || [];
  const cuposAsistenciaSedeSeleccionada = cuposPorSede[asistenciaSede] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-gray-800 mb-3">
          Gestión de cupos
        </h2>
        
        {/* Selector de Sede */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-800 mb-2">Sede:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSede("Vitacura")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                sede === "Vitacura"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              🏢 Vitacura
            </button>
            <button
              onClick={() => setSede("San Joaquín")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                sede === "San Joaquín"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              🏫 San Joaquín
            </button>
          </div>
        </div>

        <div className="flex space-x-2 mb-3">
          <select
            onChange={(e) => setBloque(e.target.value)}
            value={bloque || ""}
            className="text-gray-800 flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {cuposSedeSeleccionada.map((cupo) => (
              <option key={`${cupo.bloque}-${cupo.sede}`} value={cupo.bloque} className="text-gray-800">
                Bloque {cupo.bloque} - Total: {cupo.total} | Reservados: {cupo.reservados} | 
                Disponibles: {cupo.total - cupo.reservados}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => modificarCupos(1)}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FiPlus className="mr-1 h-4 w-4" />
            Sumar cupo
          </button>
          <button
            onClick={() => modificarCupos(-1)}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FiMinus className="mr-1 h-4 w-4" />
            Restar cupo
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-gray-800 mb-3">
          Registro de asistencia
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Email del usuario
            </label>
            <input
              placeholder="usuario@usm.cl"
              value={asistenciaUser}
              onChange={(e) => setAsistenciaUser(e.target.value)}
              className="text-gray-800 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Selector de Sede para Asistencia */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Sede:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAsistenciaSede("Vitacura")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                  asistenciaSede === "Vitacura"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Vitacura
              </button>
              <button
                onClick={() => setAsistenciaSede("San Joaquín")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                  asistenciaSede === "San Joaquín"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                San Joaquín
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800">
              Bloque horario
            </label>
            <select
              onChange={(e) => setAsistenciaBloque(e.target.value)}
              value={asistenciaBloque || ""}
              className="text-gray-800 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {cuposAsistenciaSedeSeleccionada.map((cupo) => (
                <option key={`${cupo.bloque}-${cupo.sede}`} value={cupo.bloque} className="text-gray-800">
                  Bloque {cupo.bloque}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={asistenciaPresente}
              onChange={(e) => setAsistenciaPresente(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-800">
              Presente
            </label>
          </div>

          <button
            onClick={marcarAsistencia}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {asistenciaPresente ? (
              <FiCheck className="mr-1 h-4 w-4" />
            ) : (
              <FiX className="mr-1 h-4 w-4" />
            )}
            {asistenciaPresente ? "Marcar presente" : "Marcar ausente"}
          </button>
        </div>
      </div>
    </div>
  );
}