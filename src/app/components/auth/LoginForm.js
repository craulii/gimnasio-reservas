"use client";
import { useState } from "react";
import { FiUser, FiLock, FiLogIn } from "react-icons/fi";
import ApiService from "../../services/api";

export default function LoginForm({ setUser, setMessage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("Autenticando...");
    
    try {
      const { ok, data } = await ApiService.login({ username, password });
      
      if (ok) {
        setUser({
          username,
          password,
          is_admin: data.is_admin,
          id: data.rol,
          name: data.name,
        });
        const tipoUsuario = data.is_admin === 1 ? "Administrador" : "Alumno";
        setMessage(`Bienvenido ${data.name} (${tipoUsuario})`);
      } else {
        setMessage(data.message || "Credenciales incorrectas");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-yellow-800">
          Correo
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUser className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            id="username"
            name="username"
            type="email"
            autoComplete="email"
            required
            placeholder="tucorreo@usm.cl"
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-yellow-800">
          Contraseña
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiLock className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-md shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
      >
        <FiLogIn className="mr-2 h-5 w-5" />
        Iniciar sesión
      </button>
    </form>
  );
}