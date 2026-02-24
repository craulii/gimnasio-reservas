import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT 1 as ok");
    return Response.json({ status: "ok", result: rows[0] });
  } catch (error) {
    console.error("Error en test de conexión:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
