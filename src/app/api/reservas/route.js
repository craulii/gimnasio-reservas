let RESERVAS = [];

export async function POST(request) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return new Response("No autorizado", { status: 401 });
  }
  const base64Credentials = auth.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
  const [username, password] = credentials.split(":");

  const users = [
    { username: "alumno1", password: "1234", role: "alumno" },
    { username: "admin1", password: "adminpass", role: "admin" },
  ];
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return new Response("No autorizado", { status: 401 });
  if (user.role !== "alumno")
    return new Response("Solo alumnos pueden reservar", { status: 403 });

  const { bloque } = await request.json();
  const yaReservado = RESERVAS.find(
    (r) => r.username === user.username && r.bloque === bloque
  );
  if (yaReservado)
    return new Response("Ya tienes una reserva para ese bloque", {
      status: 400,
    });

  RESERVAS.push({ username: user.username, bloque, fecha: new Date().toISOString() });
  return new Response(
    JSON.stringify({ message: "Reserva realizada" }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
}
