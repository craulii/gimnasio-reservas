"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiUser, FiLock, FiLogIn } from "react-icons/fi";
// Importamos el servicio centralizado
import ApiService from "@/services/api"; 

export default function LoginForm({ setUser, setMessage }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if(e) e.preventDefault(); 
    
    setLoading(true);
    setMessage("Autenticando...");
    
    try {
      // ✅ USAMOS EL SERVICIO (Más limpio y seguro)
      const { ok, data } = await ApiService.login({ username, password });

      console.log("Respuesta Login:", data);

      if (ok && data.user) {
        // Guardamos estado local (la cookie también manda)
        setUser(data.user);

        const tipoUsuario = data.user.role_type === 'admin' ? "Administrador" : "Alumno";
        setMessage(`Bienvenido ${data.user.name} (${tipoUsuario})`);

        // 🚀 REDIRECCIÓN FUERTE
        // Necesaria para que el navegador envíe la cookie nueva al pedir el Dashboard
        setTimeout(() => {
            window.location.href = "/"; // Recarga completa para asegurar cookies
        }, 1000);

      } else {
        // Manejo de error compatible con tu backend
        const errorMsg = data?.error || "Credenciales incorrectas";
        setMessage(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("ERROR JS:", error);
      setMessage("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-yellow-800">Correo</label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUser className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            type="email"
            required
            placeholder="tucorreo@usm.cl"
            className="block w-full pl-10 pr-4 py-2 bg-gray-800 text-white placeholder-gray-300 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} // Permitir Enter
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-yellow-800">Contraseña</label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiLock className="h-5 w-5 text-yellow-800" />
          </div>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="block w-full pl-10 pr-4 py-2 bg-gray-800 text-white placeholder-gray-300 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} // Permitir Enter
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className={`w-full flex items-center justify-center py-2 px-4 font-bold rounded-md shadow-lg transition ${
            loading ? "bg-gray-500 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600 text-white"
        }`}
      >
        <FiLogIn className="mr-2 h-5 w-5" />
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}