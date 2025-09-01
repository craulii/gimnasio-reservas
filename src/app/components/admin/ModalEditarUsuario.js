"use client";
import { useState, useEffect } from "react";
import ApiService from "../../services/api";

export default function ModalEditarUsuario({ usuario, onClose, onSave, setMessage }) {
  const [formUsuario, setFormUsuario] = useState({
    name: "",
    email: "",
    newEmail: "",
    password: "",
    isAdmin: false,
  });

  useEffect(() => {
    if (usuario) {
      setFormUsuario({
        name: usuario.name,
        email: usuario.email,
        newEmail: usuario.email,
        password: "",
        isAdmin: usuario.is_admin === 1,
      });
    }
  }, [usuario]);

  const guardarUsuario = async () => {
    try {
      const { ok } = await ApiService.updateUsuario(usuario.email, formUsuario);
      
      if (ok) {
        setMessage("✅ Usuario actualizado exitosamente");
        onSave();
      } else {
        setMessage("❌ Error al actualizar usuario");
      }
    } catch (error) {
      setMessage("❌ Error de conexión");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          ✏️ Editar Usuario
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

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formUsuario.isAdmin}
              onChange={(e) => setFormUsuario({ ...formUsuario, isAdmin: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              👑 Es administrador
            </label>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardarUsuario}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  );
}