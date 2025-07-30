"use client";
import { useState, useEffect } from "react";
import { MdFitnessCenter } from "react-icons/md";
import {
  FiUser,
  FiLock,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiMinus,
  FiCheck,
  FiX,
} from "react-icons/fi";

export default function Home() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [bloque, setBloque] = useState(null);
  const [cupos, setCupos] = useState({});
  const [asistenciaUser, setAsistenciaUser] = useState("");
  const [asistenciaBloque, setAsistenciaBloque] = useState(null);
  const [asistenciaPresente, setAsistenciaPresente] = useState(true);
  const [loading, setLoading] = useState(false);

  function authHeader() {
    if (!user) {
      console.log("[authHeader] No hay usuario logueado");
      return {};
    }
    const token = btoa(`${user.username}:${user.password}`);
    console.log("[authHeader] Generando header con token:", token);
    return { Authorization: `Basic ${token}` };
  }

  useEffect(() => {
    console.log("[useEffect user] Cambio de usuario:", user);
    if (user) {
      fetchCupos();
    } else {
      setCupos({});
      setBloque(null);
      setAsistenciaBloque(null);
      setMessage("");
    }
  }, [user]);

  useEffect(() => {
    console.log("[useEffect cupos] Cupos actualizados:", cupos);
    const bloques = Object.keys(cupos);
    if (bloques.length > 0) {
      if (!bloque || !bloques.includes(bloque)) {
        console.log(`[useEffect cupos] Ajustando bloque seleccionado a: ${bloques[0]}`);
        setBloque(bloques[0]);
      }
      if (!asistenciaBloque || !bloques.includes(asistenciaBloque)) {
        console.log(`[useEffect cupos] Ajustando asistenciaBloque a: ${bloques[0]}`);
        setAsistenciaBloque(bloques[0]);
      }
    }
  }, [cupos]);

  async function login() {
    setMessage("Autenticando...");
    console.log("[login] Intentando login con usuario:", username);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      console.log("[login] Respuesta login:", res.status, data);
      if (res.ok) {
        setUser({
          username,
          password,
          is_admin: data.is_admin,
          id: data.rol,
          name: data.name, // <-- Guardamos el nombre aquí
        });
        const tipoUsuario = data.is_admin === 1 ? "Administrador" : "Alumno";
        setMessage(`Bienvenido ${data.name} (${tipoUsuario})`); // saludo con nombre
        console.log(`[login] Usuario autenticado como ${tipoUsuario}`);
      } else {
        setMessage(data.message || "Credenciales incorrectas");
        console.warn("[login] Credenciales incorrectas");
      }
    } catch (error) {
      console.error("[login] Error en conexión:", error);
      setMessage("Error de conexión");
    }
  }

  async function fetchCupos() {
    setLoading(true);
    console.log("[fetchCupos] Consultando cupos...");
    try {
      const res = await fetch("/api/cupos");
      const data = await res.json();
      console.log("[fetchCupos] Datos recibidos:", data);
      if (res.ok) {
        setCupos(data);
        setMessage("");
      } else {
        setMessage("Error al cargar cupos");
        console.error("[fetchCupos] Error en respuesta:", res.status);
      }
    } catch (error) {
      console.error("[fetchCupos] Error fetching cupos:", error);
      setMessage("Error al cargar cupos");
    } finally {
      setLoading(false);
    }
  }

  async function hacerReserva() {
    if (!bloque) {
      setMessage("Selecciona un bloque primero");
      console.warn("[hacerReserva] No se seleccionó bloque");
      return;
    }

    setMessage("Reservando...");
    console.log("[hacerReserva] Reservando bloque:", bloque);
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ bloque_horario: bloque }),
      });
      const text = await res.text();
      setMessage(text);
      console.log("[hacerReserva] Respuesta reserva:", res.status, text);
      if (res.ok) await fetchCupos();
    } catch (error) {
      console.error("[hacerReserva] Error al reservar:", error);
      setMessage("Error al reservar");
    }
  }

  async function modificarCupos(cantidad) {
    if (!bloque) {
      setMessage("Selecciona un bloque primero");
      console.warn("[modificarCupos] No se seleccionó bloque");
      return;
    }

    setMessage("Actualizando cupos...");
    console.log(`[modificarCupos] Modificando cupos en bloque ${bloque} en ${cantidad}`);
    try {
      const res = await fetch("/api/cupos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
        body: JSON.stringify({ bloque: bloque, cantidad }),
      });
      const data = await res.json();
      if (res.ok) {
        setCupos(data.cupos);
        setMessage(data.message || "Cupos actualizados");
        console.log("[modificarCupos] Cupos actualizados correctamente");
      } else {
        setMessage(data.message || "Error modificando cupos");
        console.warn("[modificarCupos] Error en modificar cupos:", data);
      }
    } catch (error) {
      console.error("[modificarCupos] Error de conexión:", error);
      setMessage("Error de conexión");
    }
  }

  async function marcarAsistencia() {
    if (!asistenciaUser || !asistenciaBloque) {
      setMessage("Completa todos los campos");
      console.warn("[marcarAsistencia] Campos incompletos");
      return;
    }

    setMessage("Registrando asistencia...");
    console.log(
      "[marcarAsistencia] Usuario:",
      asistenciaUser,
      "Bloque:",
      asistenciaBloque,
      "Presente:",
      asistenciaPresente
    );
    try {
      const res = await fetch("/api/asistencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user": JSON.stringify(user),
        },
        body: JSON.stringify({
          username: asistenciaUser,
          bloque: asistenciaBloque,
          presente: asistenciaPresente,
        }),
      });
      const data = await res.json();
      setMessage(data.message || "Operación completada");
      console.log("[marcarAsistencia] Respuesta:", data);
    } catch (error) {
      console.error("[marcarAsistencia] Error de conexión:", error);
      setMessage("Error de conexión");
    }
  }

  return (
    <div
      className="
        flex min-h-screen items-center justify-center
        bg-amber-100
        bg-[url('/gym-bg.jpg')] bg-cover bg-center
      "
    >
      <div
        className="
        w-full max-w-md
        bg-stone-400/90 bg-opacity-90
        rounded-xl shadow-2xl
        border-2 border-yellow-800
        p-8
        "
      >
        {!user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
            className="space-y-6"
          >
            <div className="text-center">
              <MdFitnessCenter className="mx-auto h-12 w-12 text-yellow-800" />
              <h1 className="mt-2 text-3xl font-extrabold text-white">
                BetterGym USM
              </h1>
              <p className="mt-1 text-sm font-bold text-yellow-800">
                ¡Potencia tu entrenamiento con Defider!
              </p>
            </div>

            {/* EMAIL */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-yellow-800"
              >
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
                  className="
                    block w-full pl-10 pr-4 py-2
                    bg-gray-700 placeholder-gray-500 text-white
                    border border-gray-600 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-green-400
                    focus:border-green-400
                    sm:text-sm
                  "
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-yellow-800"
              >
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
                  className="
                    block w-full pl-10 pr-4 py-2
                    bg-gray-700 placeholder-gray-500 text-white
                    border border-gray-600 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-green-400
                    focus:border-green-400
                    sm:text-sm
                  "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="
                w-full flex items-center justify-center py-2 px-4
                bg-yellow-500 hover:bg-yellow-600 text-white font-bold
                rounded-md shadow-lg transition
                focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-green-400
              "
            >
              <FiLogIn className="mr-2 h-5 w-5" />
              Iniciar sesión
            </button>

            {message && (
              <p className="mt-4 text-center text-sm text-red-400">
                {message}
              </p>
            )}
          </form>
        ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user.name}</h1>
                  <p className="text-sm text-indigo-600 capitalize">
                    {user.is_admin === 1 ? "Administrador" : "Alumno"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    console.log("[logout] Cerrando sesión de usuario:", user.name);
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
                <div
                  className={`rounded-md p-4 ${
                    message.includes("éxito") ? "bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"
                  }`}
                >
                  <p className="text-sm">{message}</p>
                </div>
              )}

              {user.is_admin === 0 && (
                <div className="bg-gray-200 p-4 rounded-lg">
                  <h2 className="text-lg font-medium text-gray-800 mb-3">Reservar cupo</h2>
                  {loading ? (
                    <p className="text-center">Cargando cupos...</p>
                  ) : Object.keys(cupos).length === 0 ? (
                    <p className="text-center">No hay cupos disponibles</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(cupos).map(([b, info]) => {
                        const disponibles = info.total - info.reservados;
                        return (
                          <div
                            key={b}
                            className="flex justify-between items-center bg-white rounded p-3 shadow-sm"
                          >
                            <div>
                              <strong className="text-gray-800">Bloque {b}</strong>
                              <p className="text-sm text-gray-600">
                                Cupos: {disponibles} / {info.total} (Reservados: {info.reservados})
                              </p>
                            </div>
                            <button
                              disabled={disponibles <= 0}
                              onClick={() => {
                                setBloque(b);
                                hacerReserva();
                              }}
                              className={`px-4 py-2 rounded text-white ${
                                disponibles > 0 ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"
                              }`}
                            >
                              Reservar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {user.is_admin === 1 && (
                <>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h2 className="text-lg font-medium text-gray-800 mb-3">Gestión de cupos</h2>
                    <div className="flex space-x-2 mb-3">
                      <select
                        onChange={(e) => setBloque(e.target.value)}
                        value={bloque || ""}
                        className="text-gray-800 flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        {Object.keys(cupos).map((b) => (
                          <option key={b} value={b} className="text-gray-800">
                            Bloque {b} (Cupos: {cupos[b].total})
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

                  <div className="bg-gray-100 p-4 rounded-lg">
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
                          value={asistenciaBloque || ""}
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
  );
}
