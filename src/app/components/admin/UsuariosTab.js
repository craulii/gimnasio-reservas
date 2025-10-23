"use client";
import { useState, useEffect } from "react";
import ApiService from "../../services/api";
import ModalEditarUsuario from "./ModalEditarUsuario";

export default function UsuariosTab({ setMessage }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState("");
  const [tipoUsuarios, setTipoUsuarios] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [modalUsuario, setModalUsuario] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, [busquedaUsuarios, tipoUsuarios]);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getUsuarios(tipoUsuarios, busquedaUsuarios);
      if (ok) {
        setUsuarios(data);
      } else {
        setMessage("Error cargando usuarios");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
    setLoading(false);
  };

  const eliminarUsuario = async (email, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre} (${email})?\n\nEsto también eliminará todas sus reservas.`)) {
      return;
    }

    try {
      const { ok, data } = await ApiService.deleteUsuario(email);
      if (ok) {
        setMessage(`${data.message}`);
        cargarUsuarios();
      } else {
        setMessage("Error al eliminar usuario");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
  };

  const abrirEditarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    setModalUsuario(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar usuario
            </label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={busquedaUsuarios}
              onChange={(e) => setBusquedaUsuarios(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de usuario
            </label>
            <select
              value={tipoUsuarios}
              onChange={(e) => setTipoUsuarios(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {loading ? (
        <div className="text-center py-8 bg-white rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Cargando usuarios...</p>
        </div>
      ) : usuarios.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              👥 Usuarios ({usuarios.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <div key={usuario.email} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      usuario.is_admin === 1 ? "bg-purple-500" : "bg-blue-500"
                    }`}>
                      {usuario.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {usuario.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          usuario.is_admin === 1
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {usuario.is_admin === 1 ? "👑 Admin" : "👤 Alumno"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span>{usuario.total_reservas} reservas</span>
                        <span>{usuario.total_asistencias} asistencias</span>
                        {usuario.total_reservas > 0 && (
                          <span>
                            {Math.round((usuario.total_asistencias / usuario.total_reservas) * 100)}% asistencia
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
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
        <div className="text-center py-12 bg-white rounded-lg">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron usuarios
          </h3>
          <p className="text-gray-500">
            Ajusta los filtros de búsqueda para encontrar usuarios.
          </p>
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