"use client";
import { useState } from "react";
import { FiUser, FiLock } from "react-icons/fi";
import ApiService from "../../services/api";

export default function RegisterForm({ setMessage, setIsRegistering }) {
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rol: "",
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("Creando cuenta...");

    // Validaciones del lado del cliente
    if (registerData.password !== registerData.confirmPassword) {
      setMessage("Las contraseñas no coinciden");
      return;
    }

    if (registerData.password.length < 8) {
      setMessage("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    const rolRegex = /^\d{9}-\d{1}$/;
    if (!rolRegex.test(registerData.rol)) {
      setMessage("El formato del rol debe ser: 123456789-0");
      return;
    }

    try {
      const { ok, data } = await ApiService.register(registerData);
      
      if (ok) {
        setMessage(data.message || "¡Cuenta creada exitosamente! Ya puedes iniciar sesión.");
        setRegisterData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          rol: "",
        });
        setTimeout(() => {
          setIsRegistering(false);
        }, 2000);
      } else {
        setMessage(data.error || data.message || "Error al crear la cuenta");
      }
    } catch (error) {
      console.error("Error en registro:", error);
      setMessage("Error de conexión");
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label htmlFor="register-name" className="block text-sm font-medium text-yellow-800">
          Nombre completo
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUser className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            id="register-name"
            type="text"
            required
            placeholder="Tu nombre completo"
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={registerData.name}
            onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="register-rol" className="block text-sm font-medium text-yellow-800">
          Rol USM
        </label>
        <div className="mt-1 relative">
          <input
            id="register-rol"
            type="text"
            required
            placeholder="123456789-0"
            pattern="^\d{9}-\d{1}$"
            title="Formato: 123456789-0"
            className="block w-full pl-3 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={registerData.rol}
            onChange={(e) => setRegisterData({ ...registerData, rol: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="register-email" className="block text-sm font-medium text-yellow-800">
          Correo USM
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUser className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            id="register-email"
            type="email"
            required
            placeholder="tucorreo@usm.cl"
            pattern=".*@usm\.cl$"
            title="Debe ser un correo @usm.cl"
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={registerData.email}
            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="register-password" className="block text-sm font-medium text-yellow-800">
          Contraseña
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiLock className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            id="register-password"
            type="password"
            required
            minLength="8"
            placeholder="Mínimo 8 caracteres"
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={registerData.password}
            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="register-confirm" className="block text-sm font-medium text-yellow-800">
          Confirmar contraseña
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiLock className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            id="register-confirm"
            type="password"
            required
            placeholder="Repite tu contraseña"
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={registerData.confirmPassword}
            onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-md shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
      >
        <FiUser className="mr-2 h-5 w-5" />
        Crear cuenta
      </button>
    </form>
  );
}