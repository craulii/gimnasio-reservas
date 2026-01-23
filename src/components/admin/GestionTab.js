"use client";
import { useState, useEffect } from "react";
import { FiPlus, FiMinus, FiSave, FiRefreshCw } from "react-icons/fi";
// Asegúrate de que la ruta sea correcta (2 niveles arriba si está en components/admin/)
import ApiService from "../../services/api";

export default function GestionTab({ cupos, setMessage, fetchCupos }) {
  const [bloque, setBloque] = useState("");
  const [sede, setSede] = useState("Vitacura");
  
  // Estados para asistencia masiva
  const [bloqueAsistencia, setBloqueAsistencia] = useState("");
  const [sedeAsistencia, setSedeAsistencia] = useState("Vitacura");
  const [usuariosBloque, setUsuariosBloque] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [asistenciasOriginales, setAsistenciasOriginales] = useState({});
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);

  // Inicializar selectores cuando llegan los cupos
  useEffect(() => {
    const cuposData = cupos || {};
    const keys = Object.keys(cuposData);
    
    if (keys.length > 0) {
      const firstCupo = cuposData[keys[0]];
      
      // Solo establecemos el valor inicial si no se ha seleccionado nada aún
      if (!bloque) {
        setBloque(firstCupo.bloque);
        setSede(firstCupo.sede);
      }
      if (!bloqueAsistencia) {
        setBloqueAsistencia(firstCupo.bloque);
        setSedeAsistencia(firstCupo.sede);
      }
    }
  }, [cupos]); // Mantenemos dependencia pero validamos dentro

  const modificarCupos = async (cantidad) => {
    if (!bloque || !sede) {
      setMessage("Selecciona un bloque y sede primero");
      return;
    }

    setMessage("Actualizando cupos...");
    try {
      const cuposData = cupos || {};
      const cupoActual = Object.values(cuposData).find(c => c.bloque === bloque && c.sede === sede);
      const nuevoTotal = (cupoActual?.total || 0) + cantidad;
      
      if (nuevoTotal < 0) {
        setMessage("No puedes tener cupos negativos");
        return;
      }

      // Llamada segura a la API (las cookies van automáticas)
      const { ok, data } = await ApiService.updateCupos(bloque, sede, nuevoTotal);
      
      if (ok) {
        await fetchCupos(); // Recargar datos globales
        setMessage(data?.message || "Cupos actualizados correctamente");
      } else {
        const errorMsg = data?.error || data?.message || "Error al actualizar cupos";
        setMessage(String(errorMsg));
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión al actualizar");
    }
  };

  // Cargar usuarios del bloque seleccionado
  const cargarUsuariosBloque = async () => {
    if (!bloqueAsistencia || !sedeAsistencia) {
      setMessage("Selecciona un bloque y sede");
      return;
    }

    setLoadingUsuarios(true);
    setMessage("Cargando alumnos...");
    setUsuariosBloque([]); // Limpiar lista anterior
    
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const { ok, data } = await ApiService.getUsuariosBloque(
        bloqueAsistencia, 
        sedeAsistencia, 
        fecha
      );
      
      // Manejo robusto de la respuesta (puede venir como array directo o propiedad)
      const listaAlumnos = Array.isArray(data) ? data : (data?.usuarios || []);

      if (ok && listaAlumnos.length > 0) {
        setUsuariosBloque(listaAlumnos);
        
        // Inicializar asistencias
        const asistenciasIniciales = {};
        listaAlumnos.forEach(user => {
          // Si asistio es 1 -> true, 0 -> false, null -> null
          asistenciasIniciales[user.email] = user.asistio === null ? null : user.asistio === 1;
        });
        
        setAsistencias(asistenciasIniciales);
        setAsistenciasOriginales(JSON.parse(JSON.stringify(asistenciasIniciales)));
        
        setMessage(`${listaAlumnos.length} alumno${listaAlumnos.length !== 1 ? 's' : ''} cargado${listaAlumnos.length !== 1 ? 's' : ''}`);
      } else {
        setUsuariosBloque([]);
        setAsistencias({});
        setMessage("No hay alumnos inscritos en este bloque para hoy");
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      setMessage("Error al cargar alumnos");
      setUsuariosBloque([]);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Alternar estado de asistencia (null -> true -> false -> null)
  const toggleAsistencia = (email) => {
    setAsistencias(prev => {
      const currentValue = prev[email];
      let newValue;
      
      if (currentValue === null) {
        newValue = true; // Pendiente -> Presente
      } else if (currentValue === true) {
        newValue = false; // Presente -> Ausente
      } else {
        newValue = null; // Ausente -> Pendiente
      }
      
      return { ...prev, [email]: newValue };
    });
  };

  // Guardar asistencias masivas
  const guardarAsistencias = async () => {
    const hayPendientes = Object.values(asistencias).some(val => val === null);
    
    if (hayPendientes) {
      const confirmar = window.confirm(
        "Hay alumnos con asistencia pendiente. ¿Deseas guardar de todas formas? Los pendientes NO serán registrados."
      );
      if (!confirmar) return;
    }

    setGuardandoAsistencia(true);
    setMessage("Guardando asistencias...");

    try {
      // Filtrar solo las asistencias que NO son null
      const asistenciasArray = Object.entries(asistencias)
        .filter(([email, asistio]) => asistio !== null)
        .map(([email, asistio]) => ({ email, asistio }));

      if (asistenciasArray.length === 0) {
        setMessage("No hay cambios de asistencia para guardar");
        setGuardandoAsistencia(false);
        return;
      }

      const fecha = new Date().toISOString().split('T')[0];
      
      const { ok, data } = await ApiService.registrarAsistenciaMasiva(
        asistenciasArray,
        bloqueAsistencia,
        sedeAsistencia,
        fecha
      );

      if (ok) {
        setMessage(data?.message || "✅ Asistencias guardadas exitosamente");
        setAsistenciasOriginales(JSON.parse(JSON.stringify(asistencias)));
        
        // Recargar para confirmar cambios
        setTimeout(() => cargarUsuariosBloque(), 1000);
      } else {
        const errorMsg = data?.error || data?.message || "Error al guardar asistencias";
        setMessage(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error de conexión");
    } finally {
      setGuardandoAsistencia(false);
    }
  };

  const marcarTodos = (estado) => {
    const nuevasAsistencias = {};
    usuariosBloque.forEach(user => {
      nuevasAsistencias[user.email] = estado;
    });
    setAsistencias(nuevasAsistencias);
  };

  // Agrupar cupos por sede (Protección contra null)
  const cuposData = cupos || {};
  const cuposPorSede = Object.values(cuposData).reduce((acc, cupo) => {
    if (!acc[cupo.sede]) acc[cupo.sede] = [];
    acc[cupo.sede].push(cupo);
    return acc;
  }, {});

  const cuposSedeSeleccionada = cuposPorSede[sede] || [];
  const cuposAsistenciaSedeSeleccionada = cuposPorSede[sedeAsistencia] || [];

  const contadores = {
    presentes: Object.values(asistencias).filter(a => a === true).length,
    ausentes: Object.values(asistencias).filter(a => a === false).length,
    pendientes: Object.values(asistencias).filter(a => a === null).length,
    total: usuariosBloque.length
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sección de Gestión de Cupos */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-gray-800 mb-3">
          Gestión de cupos
        </h2>
        
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
              Vitacura
            </button>
            <button
              onClick={() => setSede("San Joaquín")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                sede === "San Joaquín"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              San Joaquín
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
                Bloque {cupo.bloque} - Total: {cupo.total} | Reservados: {cupo.reservados}
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

      {/* Sección: Toma de asistencia masiva */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium text-gray-800 mb-3">
          Toma de asistencia masiva
        </h2>
        
        <div className="space-y-3">
          {/* Selector de Sede */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Sede:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSedeAsistencia("Vitacura")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                  sedeAsistencia === "Vitacura"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Vitacura
              </button>
              <button
                onClick={() => setSedeAsistencia("San Joaquín")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                  sedeAsistencia === "San Joaquín"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                San Joaquín
              </button>
            </div>
          </div>

          {/* Selector de Bloque */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Bloque horario
            </label>
            <select
              onChange={(e) => setBloqueAsistencia(e.target.value)}
              value={bloqueAsistencia || ""}
              className="text-gray-800 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {cuposAsistenciaSedeSeleccionada.map((cupo) => (
                <option key={`${cupo.bloque}-${cupo.sede}`} value={cupo.bloque} className="text-gray-800">
                  Bloque {cupo.bloque} ({cupo.reservados} reservados)
                </option>
              ))}
            </select>
          </div>

          {/* Botón cargar usuarios */}
          <button
            onClick={cargarUsuariosBloque}
            disabled={loadingUsuarios}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${loadingUsuarios ? 'animate-spin' : ''}`} />
            {loadingUsuarios ? "Cargando..." : "Cargar alumnos del bloque"}
          </button>
        </div>
      </div>

      {/* Lista de alumnos - Ocupa todo el ancho */}
      {usuariosBloque.length > 0 && (
        <div className="lg:col-span-2 bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Alumnos inscritos - Bloque {bloqueAsistencia} ({sedeAsistencia})
              </h3>
              <div className="flex flex-wrap gap-4 mt-1 text-sm">
                <span className="text-green-600 font-medium">✓ Presentes: {contadores.presentes}</span>
                <span className="text-red-600 font-medium">✗ Ausentes: {contadores.ausentes}</span>
                <span className="text-gray-500 font-medium">⏳ Pendientes: {contadores.pendientes}</span>
                <span className="text-gray-700 font-medium">Total: {contadores.total}</span>
              </div>
            </div>
            
            {/* Botones de acción masiva */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => marcarTodos(true)}
                className="flex-1 md:flex-none px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Todos presentes
              </button>
              <button
                onClick={() => marcarTodos(false)}
                className="flex-1 md:flex-none px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Todos ausentes
              </button>
              <button
                onClick={() => marcarTodos(null)}
                className="flex-1 md:flex-none px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Lista de alumnos */}
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4 custom-scrollbar">
            {usuariosBloque.map((user) => {
              const estado = asistencias[user.email];
              let bgColor = "bg-gray-50 border-gray-300";
              let icon = "⏳";
              let estadoTexto = "Pendiente";

              if (estado === true) {
                bgColor = "bg-green-50 border-green-500";
                icon = "✓";
                estadoTexto = "Presente";
              } else if (estado === false) {
                bgColor = "bg-red-50 border-red-500";
                icon = "✗";
                estadoTexto = "Ausente";
              }

              return (
                <div
                  key={user.email}
                  onClick={() => toggleAsistencia(user.email)}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${bgColor}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.faltas > 0 && (
                      <p className="text-xs text-orange-600 mt-1 font-bold">
                        ⚠️ {user.faltas} falta{user.faltas > 1 ? 's' : ''}
                        {user.baneado === 1 && " - 🚫 BANEADO"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">{estadoTexto}</span>
                    <span className="text-2xl font-bold">{icon}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón guardar */}
          <button
            onClick={guardarAsistencias}
            disabled={guardandoAsistencia || contadores.total === 0}
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FiSave className="mr-2 h-5 w-5" />
            {guardandoAsistencia ? "Guardando..." : `Guardar asistencia (${contadores.presentes + contadores.ausentes} de ${contadores.total})`}
          </button>
        </div>
      )}
    </div>
  );
}