"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiUser, FiLock, FiLogIn } from "react-icons/fi";

export default function LoginForm({ setUser, setMessage }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Esta función maneja el click
  const handleLogin = async (e) => {
    // e.preventDefault() ya no es estrictamente necesario con type="button", 
    // pero lo dejamos por seguridad si pasas el evento.
    if(e) e.preventDefault(); 
    
    console.log("🟢 INTENTANDO LOGIN..."); // MIRA LA CONSOLA (F12)
    setLoading(true);
    setMessage("Autenticando...");
    
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log("RESPUESTA SERVIDOR:", data); // MIRA LA CONSOLA

      if (res.ok) {
        setUser({
          username: data.email,
          is_admin: data.is_admin,
          id: data.id,
          name: data.name,
          rol: data.rol
        });

        const tipoUsuario = data.is_admin || data.rol === 'admin' ? "Administrador" : "Alumno";
        setMessage(`✅ Bienvenido ${data.name} (${tipoUsuario})`);

        setTimeout(() => {
            router.push('/'); 
            router.refresh(); // Forzamos una recarga rápida para que actualice la vista
        }, 1000);

      } else {
        setMessage(data.error || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error("ERROR JS:", error);
      setMessage("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4"> {/* YA NO TIENE onSubmit */}
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
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-md"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            className="block w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"  /* 👈 ESTO ES LA CLAVE: type="button" */
        onClick={handleLogin} /* 👈 EJECUTA JS DIRECTAMENTE */
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