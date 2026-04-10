"use client";
import { useState } from "react";
import { FiLogOut, FiSettings, FiCalendar, FiBarChart2, FiUsers, FiAlertTriangle } from "react-icons/fi";

// ✅ CORRECCIÓN: Usamos @ para importar desde la raíz src
import GestionTab from "@/components/admin/GestionTab";
import ReservasTab from "@/components/admin/ReservasTab";
import EstadisticasTab from "@/components/admin/EstadisticasTab";
import UsuariosTab from "@/components/admin/UsuariosTab";
import BotonPanicoTab from "@/components/admin/BotonPanicoTab";

import useCupos from "@/hooks/useCupos"; // ✅ Importante: @/hooks

export default function DashboardAdmin({ user, message, setMessage, onLogout }) {
  const [activeTab, setActiveTab] = useState("gestion");
  const { cupos, loading, fetchCupos } = useCupos(user);

  const tabs = [
    { id: "gestion", label: "Gestión", icon: FiSettings },
    { id: "reservas", label: "Reservas", icon: FiCalendar },
    { id: "estadisticas", label: "Estadísticas", icon: FiBarChart2 },
    { id: "usuarios", label: "Usuarios", icon: FiUsers },
    { id: "panico", label: "Botón Pánico", icon: FiAlertTriangle },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b-2 border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Panel de Administración
              </h1>
              <p className="text-lg text-indigo-600 mt-1">
                Bienvenido, {user?.name || "Admin"}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <FiLogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </button>
          </div>

          {/* Mensajes */}
          <div className="min-h-[24px]">
            {message && (
              <div className={`rounded-lg p-4 ${
                message.includes("Error") || message.includes("❌")
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-green-50 text-green-800 border border-green-200"
              }`}>
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 bg-gray-100 rounded-xl p-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido */}
          <div className="mt-6">
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
            {activeTab === "panico" && (
              <BotonPanicoTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}