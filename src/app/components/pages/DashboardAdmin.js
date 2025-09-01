"use client";
import { useState, useEffect } from "react";
import { FiLogOut } from "react-icons/fi";
import GestionTab from "../admin/GestionTab";
import ReservasTab from "../admin/ReservasTab";
import EstadisticasTab from "../admin/EstadisticasTab";
import UsuariosTab from "../admin/UsuariosTab";
import useCupos from "../../hooks/useCupos";

export default function DashboardAdmin({ user, message, setMessage, onLogout }) {
  const [activeTab, setActiveTab] = useState("gestion");
  const { cupos, loading, fetchCupos } = useCupos(user);

  const tabs = [
    { id: "gestion", label: "Gestión", icon: "⚙️" },
    { id: "reservas", label: "Reservas", icon: "📅" },
    { id: "estadisticas", label: "Estadísticas", icon: "📊" },
    { id: "usuarios", label: "Usuarios", icon: "👥" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-100 bg-[url('/gym-bg.jpg')] bg-cover bg-center">
      <div className="w-full max-w-6xl bg-stone-400/90 bg-opacity-90 rounded-xl shadow-2xl border-2 border-yellow-800 p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Bienvenido, {user.name}
              </h1>
              <p className="text-sm text-indigo-600 capitalize">
                Administrador
              </p>
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

          <div className="flex space-x-1 mb-4 border-b bg-white rounded-t-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "gestion" && (
            <GestionTab 
              cupos={cupos} 
              setMessage={setMessage}
              fetchCupos={fetchCupos}
            />
          )}
          {activeTab === "reservas" && (
            <ReservasTab 
              cupos={cupos}
              setMessage={setMessage}
              fetchCupos={fetchCupos}
            />
          )}
          {activeTab === "estadisticas" && (
            <EstadisticasTab 
              cupos={cupos}
              setMessage={setMessage}
            />
          )}
          {activeTab === "usuarios" && (
            <UsuariosTab setMessage={setMessage} />
          )}
        </div>
      </div>
    </div>
  );
}