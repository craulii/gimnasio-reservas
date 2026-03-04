"use client";
import { useState, useEffect } from "react";
// Asegúrate de la ruta correcta
import ApiService from "../../services/api";
import ModalEditarUsuario from "./ModalEditarUsuario";
import { HORARIOS_BLOQUE } from "../../app/utils/constants";

export default function UsuariosTab({ setMessage }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState("");
  const [tipoUsuarios, setTipoUsuarios] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [faltasUsuario, setFaltasUsuario] = useState(null); // {email, name, faltas: []}
  const [loadingFaltas, setLoadingFaltas] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, [busquedaUsuarios, tipoUsuarios]);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getUsuarios(tipoUsuarios, busquedaUsuarios);
      
      if (ok) {
        // Robustez: asegurar que data sea un array
        const lista = Array.isArray(data) ? data : (data?.usuarios || []);
        setUsuarios(lista);
      } else {
        setMessage("Error cargando la lista de usuarios");
        setUsuarios([]);
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión al cargar usuarios");
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const eliminarUsuario = async (email, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre} (${email})?\n\nEsto también eliminará todas sus reservas.`)) {
      return;
    }

    try {
      const { ok, data } = await ApiService.deleteUsuario(email);
      if (ok) {
        setMessage(data?.message || "Usuario eliminado correctamente");
        await cargarUsuarios();
      } else {
        const errorMsg = data?.error || data?.message || "Error al eliminar usuario";
        setMessage(String(errorMsg));
      }
    } catch (error) {
      setMessage("Error de conexión al eliminar");
    }
  };

  // 🔥 NUEVO: Función para desbanear usuarios (aprovechando tu API)
  const desbanearUsuario = async (email, nombre) => {
    if (!confirm(`¿Quitar el baneo y restaurar a ${nombre}?`)) return;

    try {
      const { ok, data } = await ApiService.desbanearUsuario(email);
      if (ok) {
        setMessage("✅ Usuario desbaneado y faltas reiniciadas");
        await cargarUsuarios();
      } else {
        setMessage("Error al desbanear usuario");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
  };

  const verFaltas = async (usuario) => {
    setLoadingFaltas(true);
    setFaltasUsuario({ email: usuario.email, name: usuario.name, faltas: [] });
    try {
      const { ok, data } = await ApiService.getEstadisticasAlumno(usuario.email);
      if (ok && data.diasFaltados) {
        setFaltasUsuario({ email: usuario.email, name: usuario.name, faltas: data.diasFaltados });
      }
    } catch {
      setMessage("Error cargando faltas del usuario");
    } finally {
      setLoadingFaltas(false);
    }
  };

  const borrarFaltaIndividual = async (email, reservaId) => {
    if (!confirm("¿Eliminar esta falta? Se marcará como presente y se reducirá el contador.")) return;
    try {
      const { ok, data } = await ApiService.borrarFalta(email, reservaId);
      if (ok) {
        setMessage(data?.message || "Falta eliminada");
        await verFaltas({ email, name: faltasUsuario?.name });
        await cargarUsuarios();
      } else {
        setMessage(String(data?.error || "Error al eliminar falta"));
      }
    } catch {
      setMessage("Error de conexion al eliminar falta");
    }
  };

  const abrirEditarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    setModalUsuario(true);
  };

  return (
    <div className="space-y-6">
      {/* Filtros y Búsqueda */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Buscar usuario
            </label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={busquedaUsuarios}
              onChange={(e) => setBusquedaUsuarios(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Tipo de usuario
            </label>
            <select
              value={tipoUsuarios}
              onChange={(e) => setTipoUsuarios(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos los usuarios</option>
              <option value="alumnos">Solo alumnos</option>
              <option value="admins">Solo administradores</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={cargarUsuarios}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Usuarios */}
      {loading ? (
        <div className="text-center py-8 bg-white rounded-lg border">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Cargando usuarios...</p>
        </div>
      ) : usuarios.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              👥 Usuarios ({usuarios.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <div key={usuario.email} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Info Usuario */}
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shrink-0 ${
                      usuario.is_admin === 1 ? "bg-purple-500" : "bg-blue-500"
                    }`}>
                      {usuario.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {usuario.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          usuario.is_admin === 1
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {usuario.is_admin === 1 ? "Admin" : "Alumno"}
                        </span>
                        {/* Indicador de Baneo */}
                        {usuario.baneado === 1 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            🚫 BANEADO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{usuario.email}</p>
                      
                      {/* Estadísticas en línea */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                         <span>Rol: {usuario.rol || "N/A"}</span>
                         <span className="text-gray-400">|</span>
                         <span>{usuario.total_reservas || 0} reservas</span>
                         <span>{usuario.total_asistencias || 0} asistencias</span>
                         {usuario.total_reservas > 0 && (
                           <span className={
                             (usuario.total_asistencias / usuario.total_reservas) < 0.5 
                             ? "text-red-400 font-bold" 
                             : "text-green-500"
                           }>
                             ({Math.round((usuario.total_asistencias / usuario.total_reservas) * 100)}% asis.)
                           </span>
                         )}
                      </div>
                      {usuario.faltas > 0 && (
                        <p className="text-xs text-orange-600 font-semibold mt-0.5">
                          ⚠️ {usuario.faltas} falta(s) registrada(s)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    {usuario.baneado === 1 && (
                      <button
                        onClick={() => desbanearUsuario(usuario.email, usuario.name)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
                      >
                        Restaurar
                      </button>
                    )}
                    
                    {usuario.faltas > 0 && (
                      <button
                        onClick={() => verFaltas(usuario)}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors text-sm"
                      >
                        Ver faltas
                      </button>
                    )}
                    <button
                      onClick={() => abrirEditarUsuario(usuario)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarUsuario(usuario.email, usuario.name)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                    >
                      Eliminar
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron usuarios
          </h3>
          <p className="text-gray-500">
            Intenta ajustar los filtros de búsqueda.
          </p>
        </div>
      )}

      {/* Panel de Faltas */}
      {faltasUsuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Faltas de {faltasUsuario.name}</h3>
                <p className="text-sm text-gray-500">{faltasUsuario.email}</p>
              </div>
              <button
                onClick={() => setFaltasUsuario(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >&times;</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingFaltas ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : faltasUsuario.faltas.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay faltas registradas</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {faltasUsuario.faltas.map((falta) => {
                    const horario = HORARIOS_BLOQUE[falta.bloque_horario];
                    const fechaStr = typeof falta.fecha === 'string' && falta.fecha.includes('T')
                      ? falta.fecha.split('T')[0]
                      : falta.fecha;
                    return (
                      <div key={falta.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {fechaStr} - {horario ? `${horario.inicio} - ${horario.fin}` : `Bloque ${falta.bloque_horario}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {falta.sede} - {falta.asistio === 2 ? "Ausencia automatica" : "Marcada por profesor"}
                          </p>
                        </div>
                        <button
                          onClick={() => borrarFaltaIndividual(faltasUsuario.email, falta.id)}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-xs font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalUsuario && (
        <ModalEditarUsuario
          usuario={usuarioEditando}
          onClose={() => {
            setModalUsuario(false);
            setUsuarioEditando(null);
          }}
          onSave={() => {
            cargarUsuarios();
            setModalUsuario(false);
            setUsuarioEditando(null);
          }}
          setMessage={setMessage}
        />
      )}
    </div>
  );
}