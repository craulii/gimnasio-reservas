"use client";
import { useState } from "react";
import LoginForm from "../auth/LoginForm";
import RegisterForm from "../auth/RegisterForm";

export default function LoginPage({ setUser, message, setMessage }) {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-100 bg-[url('/gym-bg.jpg')] bg-cover bg-center">
      <div className="w-full max-w-md bg-stone-400/90 bg-opacity-90 rounded-xl shadow-2xl border-2 border-yellow-800 p-8">
        <div className="space-y-6">
          <div className="text-center">
            <img src="/usm.png" alt="USM" className="mx-auto h-26 w-30" />
            <h1 className="mt-2 text-3xl font-extrabold text-white">
              BetterGym USM
            </h1>
            <p className="mt-1 text-sm font-bold text-yellow-800">
              ¡Potencia tu entrenamiento con Defider!
            </p>
          </div>

          <div className="flex rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => {
                setIsRegistering(false);
                setMessage("");
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                !isRegistering
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setIsRegistering(true);
                setMessage("");
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                isRegistering
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {!isRegistering ? (
            <LoginForm setUser={setUser} setMessage={setMessage} />
          ) : (
            <RegisterForm 
              setMessage={setMessage} 
              setIsRegistering={setIsRegistering}
            />
          )}

          {message && (
            <p className={`mt-4 text-center text-sm ${
              message.includes("exitosamente") ? "text-green-400" : "text-red-400"
            }`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}