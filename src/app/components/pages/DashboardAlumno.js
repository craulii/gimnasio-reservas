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
    </div>
  );
}