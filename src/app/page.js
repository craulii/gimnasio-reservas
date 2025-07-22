"use client";
import { useState } from "react";
import { FiUser, FiLock, FiLogIn, FiLogOut, FiPlus, FiMinus, FiCheck, FiX } from "react-icons/fi";

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [bloque, setBloque] = useState("1-2");
  const [cupos, setCupos] = useState({ "1-2": 10, "3-4": 10, "5-6": 10 });
  const [asistenciaUser, setAsistenciaUser] = useState("");
  const [asistenciaBloque, setAsistenciaBloque] = useState("1-2");
  const [asistenciaPresente, setAsistenciaPresente] = useState(true);

  // Genera header Authorization Basic
  function authHeader() {
    if (!user) return {};
    const token = btoa(`${user.username}:${user.password}`);
    return { Authorization: `Basic ${token}` };
  }

  async function login() {
    setMessage("Autenticando...");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ username, password, role: data.role });
        setMessage(`Bienvenido ${username} (${data.role})`);
        fetchCupos();
      } else {
        setMessage(data.message || "Credenciales incorrectas");
      }
    } catch (error) {
      setMessage("Error de conexión");
    }
  }

  async function fetchCupos() {
    // Simulación, idealmente desde backend
    setCupos({ "1-2": 10, "3-4": 10, "5-6": 10 });
  }

  async function hacerReserva() {
    setMessage("Reservando...");
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ bloque }),
      });
      const text = await res.text();
      setMessage(text);
      fetchCupos();
    } catch (error) {
      setMessage("Error al reservar");
    }
  }

  async function modificarCupos(cantidad) {
    setMessage("Actualizando cupos...");
    try {
      const res = await fetch("/api/cupos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ bloque, cantidad }),
      });
      const data = await res.json();
      if (res.ok) setCupos(data.cupos);
      setMessage(data.message || "Error modificando cupos");
    } catch (error) {
      setMessage("Error de conexión");
    }
  }

  async function marcarAsistencia() {
    setMessage("Registrando asistencia...");
    try {
      const res = await fetch("/api/asistencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({
          username: asistenciaUser,
          bloque: asistenciaBloque,
          presente: asistenciaPresente,
        }),
      });
      const data = await res.json();
      setMessage(data.message || "Error marcando asistencia");
    } catch (error) {
      setMessage("Error de conexión");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          {!user ? (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-indigo-600">Sistema de Reservas</h1>
                <p className="mt-2 text-gray-800">Inicia sesión para continuar</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">Usuario</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-800" />
                    </div>
                    <input
                      className="text-gray-800 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="Usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-800">Contraseña</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-800" />
                    </div>
                    <input
                      type="password"
                      className="text-gray-800 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <button
                  onClick={login}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FiLogIn className="mr-2 h-5 w-5" />
                  Iniciar sesión
                </button>
              </div>
              
              {message && (
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">{message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user.username}</h1>
                  <p className="text-sm text-indigo-600 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    setUser(null);
                    setMessage("Sesión cerrada con éxito");
                  }}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FiLogOut className="mr-1 h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
              
              {message && (
                <div className={`rounded-md p-4 ${message.includes("éxito") ? "bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"}`}>
                  <p className="text-sm">{message}</p>
                </div>
              )}
              
              {user.role === "alumno" && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-lg font-medium text-gray-800 mb-3">Reservar cupo</h2>
                  <div className="flex space-x-2">
                    <select
                      onChange={(e) => setBloque(e.target.value)}
                      value={bloque}
                      className="text-gray-800 flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {Object.keys(cupos).map((b) => (
                        <option key={b} value={b} className="text-gray-800">
                          Bloque {b} (Cupos: {cupos[b]})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={hacerReserva}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              )}
              
              {user.role === "admin" && (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-3">Gestión de cupos</h2>
                    <div className="flex space-x-2 mb-3">
                      <select
                        onChange={(e) => setBloque(e.target.value)}
                        value={bloque}
                        className="text-gray-800 flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        {Object.keys(cupos).map((b) => (
                          <option key={b} value={b} className="text-gray-800">
                            Bloque {b} (Cupos: {cupos[b]})
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
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-3">Registro de asistencia</h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-800">Usuario</label>
                        <input
                          placeholder="Nombre de usuario"
                          value={asistenciaUser}
                          onChange={(e) => setAsistenciaUser(e.target.value)}
                          className="text-gray-800 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-800">Bloque horario</label>
                        <select
                          onChange={(e) => setAsistenciaBloque(e.target.value)}
                          value={asistenciaBloque}
                          className="text-gray-800 mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          {Object.keys(cupos).map((b) => (
                            <option key={b} value={b} className="text-gray-800">
                              Bloque {b}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={asistenciaPresente}
                          onChange={(e) => setAsistenciaPresente(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-800">Presente</label>
                      </div>
                      
                      <button
                        onClick={marcarAsistencia}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {asistenciaPresente ? (
                          <FiCheck className="mr-1 h-4 w-4" />
                        ) : (
                          <FiX className="mr-1 h-4 w-4" />
                        )}
                        {asistenciaPresente ? "Marcar presente" : "Marcar ausente"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}