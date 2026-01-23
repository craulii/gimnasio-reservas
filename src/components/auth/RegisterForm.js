"use client";
import { useState } from "react";
import { FiUser, FiLock, FiAlertCircle } from "react-icons/fi";
// Asegúrate que la ruta sea correcta
import ApiService from "@/services/api";
import { normalizarRut, validarRut } from "@/lib/rut";

export default function RegisterForm({ setMessage, setIsRegistering }) {
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rol: "",
    rut: "",
  });
  
  const [passwordError, setPasswordError] = useState("");
  // 🔥 MEJORA 1: Estado de carga para evitar doble clic
  const [loading, setLoading] = useState(false);

  const validarPassword = (password) => {
    // Solo letras, números y caracteres básicos permitidos
    const regex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]*$/;
    return regex.test(password);
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    
    // Verificar si tiene caracteres no válidos
    if (!validarPassword(newPassword)) {
      setPasswordError("Carácter no válido. Solo letras, números y (!@#$%^&*)");
    } else if (newPassword.length > 0 && newPassword.length < 8) {
      setPasswordError("Mínimo 8 caracteres");
    } else {
      setPasswordError("");
    }
    
    setRegisterData({ ...registerData, password: newPassword });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Evitar envío si ya hay error de contraseña
    if (passwordError) return;

    setMessage("Creando cuenta...");
    setLoading(true); // Bloqueamos botón

    // Validación de contraseñas coinciden
    if (registerData.password !== registerData.confirmPassword) {
      setMessage("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    // Validación de longitud
    if (registerData.password.length < 8) {
      setMessage("La contraseña debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }

    // Validación del rol
    const rolRegex = /^\d{9}-\d{1}$/;
    if (!rolRegex.test(registerData.rol)) {
      setMessage("El formato del rol debe ser: 123456789-0");
      setLoading(false);
      return;
    }

    // Normalizar y validar RUT antes de enviar
    // NOTA: Si no tienes el archivo lib/rut, avísame para darte esa función aquí mismo
    const rutNormalizado = normalizarRut(registerData.rut);
    if (!validarRut(rutNormalizado)) {
      setMessage("RUT inválido. Verifica el formato (ej: 12345678-9)");
      setLoading(false);
      return;
    }

    try {
      const datosParaEnviar = {
        ...registerData,
        rut: rutNormalizado
      };
      
      // ✅ Usamos el ApiService centralizado
      const { ok, data } = await ApiService.register(datosParaEnviar);
      
      if (ok) {
        setMessage(data?.message || "¡Cuenta creada exitosamente! Iniciando sesión...");
        
        // Limpiamos formulario
        setRegisterData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          rol: "",
          rut: "",
        });
        setPasswordError("");
        
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          setIsRegistering(false);
        }, 2000);

      } else {
        // 🔥 MEJORA 2: Lectura segura de errores
        const errorMsg = data?.error || data?.message || "Error al crear la cuenta";
        setMessage(String(errorMsg));
      }
    } catch (error) {
      console.error("Error en registro:", error);
      setMessage("Error de conexión con el servidor");
    } finally {
      setLoading(false); // Desbloqueamos botón
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
        <label htmlFor="register-rut" className="block text-sm font-medium text-yellow-800">
          RUT
        </label>
        <div className="mt-1 relative">
          <input
            id="register-rut"
            type="text"
            required
            placeholder="12345678-9"
            maxLength="12"
            className="block w-full pl-3 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 sm:text-sm"
            value={registerData.rut}
            onChange={(e) => setRegisterData({ ...registerData, rut: e.target.value })}
          />
        </div>
        <p className="mt-1 text-xs text-yellow-700">
          Ej: 12345678-9
        </p>
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
            className={`block w-full pl-10 pr-4 py-2 bg-gray-700 placeholder-gray-500 text-white border rounded-md focus:outline-none focus:ring-2 sm:text-sm ${
              passwordError 
                ? "border-red-500 focus:ring-red-400 focus:border-red-400" 
                : "border-gray-600 focus:ring-green-400 focus:border-green-400"
            }`}
            value={registerData.password}
            onChange={handlePasswordChange}
          />
        </div>
        
        {passwordError && (
          <div className="mt-2 flex items-start space-x-2 text-red-400 bg-red-900/20 border border-red-500/50 rounded-md p-2">
            <FiAlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs">{passwordError}</p>
          </div>
        )}
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
        disabled={loading || passwordError !== ""}
        className={`w-full flex items-center justify-center py-2 px-4 font-bold rounded-md shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          (loading || passwordError)
            ? "bg-gray-500 cursor-not-allowed text-gray-300" 
            : "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-green-400"
        }`}
      >
        <FiUser className="mr-2 h-5 w-5" />
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}