"use client";
import { FiLogOut } from "react-icons/fi";
import ReservarCupo from "../alumno/ReservarCupo";
import useCupos from "../../hooks/useCupos";

export default function DashboardAlumno({ user, message, setMessage, onLogout }) {
  const { cupos, loading, fetchCupos } = useCupos(user);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-100 bg-[url('/gym-bg.jpg')] bg-cover bg-center">
      <div className="w-full max-w-md bg-stone-400/90 bg-opacity-90 rounded-xl shadow-2xl border-2 border-yellow-800 p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Bienvenido, {user.name}
              </h1>
              <p className="text-sm text-indigo-600 capitalize">Alumno</p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <FiLogOut className="mr-1 h-4 w-4" />
              Cerrar sesión
            </button>
          </div>

          {/* MENSAJE DE ADVERTENCIA PERMANENTE */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 mb-2">
                  Normas del Gimnasio
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>
                      Si acumulas <strong>3 faltas</strong> (no asistencias), quedarás <strong>baneado del gimnasio por 6 meses</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>
                      Si no podrás asistir, <strong>elimina tu reserva</strong> para que otro compañero pueda usar el cupo.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>
                      Tus faltas se resetean automáticamente cada 6 meses.
                    </span>
                  </li>
                </ul>
                {user.faltas > 0 && (
                  <div className={`mt-3 p-2 rounded font-bold text-center ${
                    user.faltas >= 2 
                      ? 'bg-red-100 text-red-800 border border-red-300' 
                      : 'bg-orange-100 text-orange-800 border border-orange-300'
                  }`}>
                    {user.faltas >= 2 ? '🚨' : '⚠️'} Tienes {user.faltas} falta{user.faltas > 1 ? 's' : ''} acumulada{user.faltas > 1 ? 's' : ''}
                    {user.faltas >= 2 && ' - ¡Una más y serás baneado!'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mensaje dinámico del sistema */}
          {message && (
            <div className={`rounded-md p-4 ${
              message.includes("éxito") ? "bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <ReservarCupo 
            user={user}
            cupos={cupos}
            loading={loading}
            setMessage={setMessage}
            fetchCupos={fetchCupos}
          />
        </div>
      </div>

      {/* Botón flotante de Instagram */}
      <a
        href="https://www.instagram.com/defider_usm/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 z-50"
        aria-label="Síguenos en Instagram"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
    </div>
  );
}
