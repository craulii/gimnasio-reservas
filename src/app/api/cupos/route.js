let CUPOS = {
  "1-2": 10,
  "3-4": 8,
  "5-6": 5
};

export async function GET() {
  return new Response(JSON.stringify(CUPOS), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(request) {
  const { bloque, cantidad, accion } = await request.json();

  if (!(bloque in CUPOS)) return new Response("Bloque inválido", { status: 400 });

  if (accion === "sumar") {
    CUPOS[bloque] += cantidad;
  } else if (accion === "restar") {
    CUPOS[bloque] = Math.max(0, CUPOS[bloque] - cantidad);
  } else {
    return new Response("Acción inválida", { status: 400 });
  }

  return new Response(JSON.stringify({ message: "Cupos actualizados", cupos: CUPOS[bloque] }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}


export async function PATCH(request) {
  const userHeader = request.headers.get('x-user');
  if (!userHeader) return new Response('No autorizado', { status: 401 });

  const user = JSON.parse(userHeader);
  if (user.role !== 'admin') return new Response('Solo el admin puede modificar cupos', { status: 403 });

  const { bloque, cantidad } = await request.json();
  CUPOS[bloque] = (CUPOS[bloque] || 0) + cantidad;

  return new Response(JSON.stringify({ message: 'Cupos actualizados', cupos: CUPOS }), { status: 200 });
}
