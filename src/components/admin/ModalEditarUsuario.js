"use client";
import { useState, useEffect } from "react";
// Asegúrate de que la ruta sea correcta (dependiendo de dónde esté este archivo)
import ApiService from "../../services/api";

export default function ModalEditarUsuario({ usuario, onClose, onSave, setMessage }) {
  const [formUsuario, setFormUsuario] = useState({
    name: "",
    email: "",
    newEmail: "",
    password: "",
    isAdmin: false,
    rut: "",
    rol: "",
    faltas: 0,
    baneado: false,
  });

  useEffect(() => {
    if (usuario) {
      setFormUsuario({
        name: usuario.name,
        email: usuario.email,
        newEmail: usuario.email,
        password: "",
        isAdmin: usuario.is_admin === 1,
        rut: usuario.rut || "",
        rol: usuario.rol || "",
        faltas: usuario.faltas || 0,
        baneado: usuario.baneado === 1,
      });
    }
  }, [usuario]);

  const guardarUsuario = async () => {
    try {
      // ✅ CORRECTO: La cookie viaja sola. 
      // updateUsuario espera (emailOriginal, datosNuevos)
      const { ok, data } = await ApiService.updateUsuario(usuario.email, formUsuario);
      
      if (ok) {
        setMessage(data?.message || "Usuario actualizado exitosamente");
        onSave(); // Refrescar la tabla padre y cerrar modal
      } else {
        // Mejor manejo de errores leyendo la respuesta del servidor
        const errorMsg = data?.error || data?.message || "Error al actualizar usuario";
        setMessage(String(errorMsg));
      }
    } catch (error) {
      console.error("Error update:", error);
      setMessage("Error de conexión al guardar");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
          Editar Usuario
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={formUsuario.name}
              onChange={(e) => setFormUsuario({ ...formUsuario, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formUsuario.newEmail}
              onChange={(e) => setFormUsuario({ ...formUsuario, newEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña (dejar vacío para no cambiar)
            </label>
            <input
              type="password"
              value={formUsuario.password}
              onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
              placeholder="Nueva contraseña..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-md border border-gray-200">
            <input
              type="checkbox"
              id="isAdminCheck"
              checked={formUsuario.isAdmin}
              onChange={(e) => setFormUsuario({ ...formUsuario, isAdmin: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="isAdminCheck" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
              Otorgar permisos de Administrador
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RUT
            </label>
            <input
              type="text"
              value={formUsuario.rut}
              onChange={(e) => setFormUsuario({ ...formUsuario, rut: e.target.value })}
              placeholder="12.345.678-9"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol Institucional
            </label>
            <input
              type="text"
              value={formUsuario.rol}
              onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}
              placeholder="Ej: Alumno, Funcionario..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Faltas
            </label>
            <input
              type="number"
              min="0"
              value={formUsuario.faltas}
              onChange={(e) => setFormUsuario({ ...formUsuario, faltas: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">3 faltas = baneo automatico</p>
          </div>

          <div className={`flex items-center p-3 rounded-md border ${formUsuario.baneado ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
            <input
              type="checkbox"
              id="baneadoCheck"
              checked={formUsuario.baneado}
              onChange={(e) => setFormUsuario({ ...formUsuario, baneado: e.target.checked })}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="baneadoCheck" className={`ml-2 block text-sm font-medium cursor-pointer ${formUsuario.baneado ? 'text-red-700' : 'text-gray-700'}`}>
              Usuario Baneado
            </label>
          </div>
        </div>

        <div className="flex space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardarUsuario}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}