export default function ReservaBloque({ bloque, reservas, cupoInfo, onCancelar }) {
  const totalReservas = Array.isArray(reservas) ? reservas.length : 0;
  const presentes = Array.isArray(reservas) ? reservas.filter((r) => r.asistio).length : 0;
  const cupo = cupoInfo || { total: 0, reservados: 0 };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              📅 Bloque {bloque}
            </h3>
            <p className="text-sm text-gray-600">
              {totalReservas} reservas • {presentes} presentes • 
              {cupo.total - cupo.reservados} cupos libres
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {Math.round((presentes / Math.max(totalReservas, 1)) * 100)}% asistencia
            </div>
            <div className="text-xs text-gray-500">
              Capacidad: {cupo.reservados}/{cupo.total}
            </div>
          </div>
        </div>
      </div>

      {totalReservas > 0 ? (
        <div className="divide-y divide-gray-100">
          {reservas
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((reserva, index) => (
              <div key={index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      reserva.asistio ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                    }`}>
                      {reserva.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {reserva.nombre}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {reserva.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reserva.asistio ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {reserva.asistio ? "✅ Presente" : "⏳ Pendiente"}
                    </span>
                    <button
                      onClick={() => onCancelar(reserva.email, bloque, reserva.fecha)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                      title={`Cancelar reserva de ${reserva.nombre}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          <p>No hay reservas para este bloque</p>
        </div>
      )}
    </div>
  );
}