import { BLOQUES_HORARIOS, HORARIOS_BLOQUE } from "@/app/utils/constants";

export default function ReglasPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-100 bg-[url('/gym-bg.jpg')] bg-cover bg-center py-10 px-4">
      <div className="w-full max-w-2xl bg-stone-400/90 bg-opacity-90 rounded-xl shadow-2xl border-2 border-yellow-800 p-8 space-y-8">

        {/* Logo y Título */}
        <div className="text-center">
          <img src="/usm.png" alt="USM" className="mx-auto h-24 w-auto mb-4 drop-shadow-md" />
          <h1 className="text-3xl font-extrabold text-white drop-shadow-sm">
            Reglas y Preguntas Frecuentes
          </h1>
          <p className="mt-1 text-sm font-bold text-yellow-900">
            Gimnasio USM - Sistema de Reservas
          </p>
        </div>

        {/* ===== REGLAS DEL GIMNASIO ===== */}
        <div className="space-y-5">
          <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-yellow-800 pb-2">
            Reglas del Gimnasio
          </h2>

          {/* Vestimenta obligatoria */}
          <div className="bg-white/60 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>👕</span> Vestimenta obligatoria
            </h3>
            <ul className="text-sm text-gray-800 space-y-1 ml-6 list-disc">
              <li>Ropa deportiva (polera, short o calza deportiva)</li>
              <li>Calzado deportivo limpio</li>
              <li>Toalla de mano (obligatoria)</li>
              <li>Botella de agua personal</li>
            </ul>
          </div>

          {/* Reservas y asistencia */}
          <div className="bg-white/60 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>📋</span> Reservas y asistencia
            </h3>
            <ul className="text-sm text-gray-800 space-y-1 ml-6 list-disc">
              <li>Las reservas son <strong>solo para el mismo dia</strong> (no se puede reservar para otro dia)</li>
              <li>Solo puedes realizar <strong>1 reserva por dia</strong></li>
              <li>Debes esperar al inicio del bloque para ingresar al gimnasio</li>
              <li>Respeta los horarios de tu bloque reservado</li>
              <li>Entre las <strong>13:40 y 14:40</strong> (entre bloques 7-8 y 9-10) el gimnasio no opera — es el horario de almuerzo</li>
            </ul>
          </div>

          {/* Faltas y sanciones */}
          <div className="bg-white/60 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>🚨</span> Faltas y sanciones
            </h3>
            <ul className="text-sm text-gray-800 space-y-1 ml-6 list-disc">
              <li>Si no asistes a tu reserva sin cancelarla, se registra como <strong>falta</strong></li>
              <li>Al acumular <strong>3 faltas</strong>, quedaras <strong>baneado por 6 meses</strong></li>
              <li>Las faltas se procesan automaticamente 15 minutos despues del inicio del bloque</li>
            </ul>
          </div>

          {/* Cuidado de la infraestructura */}
          <div className="bg-white/60 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>🏋️</span> Cuidado de la infraestructura
            </h3>
            <ul className="text-sm text-gray-800 space-y-1 ml-6 list-disc">
              <li>Deja los equipos limpios y en su lugar</li>
              <li>Cuida las maquinas y el espacio del gimnasio</li>
              <li>No dejes basura en el recinto</li>
            </ul>
          </div>
        </div>

        {/* ===== PREGUNTAS FRECUENTES ===== */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-yellow-800 pb-2">
            Preguntas Frecuentes
          </h2>

          <FaqItem
            pregunta="¿Como reservo un cupo?"
            respuesta="Inicia sesion, selecciona tu sede, elige un bloque disponible y presiona &quot;Reservar&quot;."
          />
          <FaqItem
            pregunta="¿Como se hace efectiva mi reserva?"
            respuesta="Presentate en el gimnasio al inicio de tu bloque. El profesor verificara tu asistencia."
          />
          <FaqItem
            pregunta="¿Como cancelo mi reserva?"
            respuesta='En tu dashboard veras tu reserva activa con boton "Cancelar". Puedes cancelar en cualquier momento.'
          />
          <FaqItem
            pregunta="¿Que pasa si no puedo asistir?"
            respuesta="Cancela tu reserva lo antes posible desde la pagina. Si no cancelas, se registra falta automaticamente."
          />
          <FaqItem
            pregunta="¿Puedo reservar mas de una vez al dia?"
            respuesta="No. Maximo 1 reserva diaria por alumno."
          />
          <FaqItem
            pregunta="¿Como cambio mis datos personales?"
            respuesta="Contacta al profesor encargado en persona."
          />
          <FaqItem
            pregunta="¿Que debo llevar?"
            respuesta="Credencial USM, ropa deportiva, calzado deportivo, toalla y botella de agua."
          />

          {/* Horarios - con tabla dinámica */}
          <div className="bg-white/60 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">¿Cuales son los horarios?</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-yellow-800/20">
                    <th className="px-3 py-2 font-bold text-gray-900 border border-gray-300">Bloque</th>
                    <th className="px-3 py-2 font-bold text-gray-900 border border-gray-300">Inicio</th>
                    <th className="px-3 py-2 font-bold text-gray-900 border border-gray-300">Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {BLOQUES_HORARIOS.map((bloque) => (
                    <tr key={bloque} className="hover:bg-white/40">
                      <td className="px-3 py-2 font-medium text-gray-900 border border-gray-300">
                        Bloque {bloque}
                      </td>
                      <td className="px-3 py-2 text-gray-800 border border-gray-300">
                        {HORARIOS_BLOQUE[bloque].inicio}
                      </td>
                      <td className="px-3 py-2 text-gray-800 border border-gray-300">
                        {HORARIOS_BLOQUE[bloque].fin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              * Entre las 13:40 y 14:40 (entre bloques 7-8 y 9-10) el gimnasio no opera por horario de almuerzo.
            </p>
          </div>
        </div>

        {/* Botón Volver */}
        <div className="text-center pt-2">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-yellow-800 text-white font-bold rounded-lg hover:bg-yellow-900 transition-colors shadow-md"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ pregunta, respuesta }) {
  return (
    <div className="bg-white/60 rounded-lg p-4">
      <h3 className="font-bold text-gray-900 mb-1">{pregunta}</h3>
      <p className="text-sm text-gray-800">{respuesta}</p>
    </div>
  );
}
