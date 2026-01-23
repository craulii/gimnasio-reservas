// app/api/logout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    // En Next.js 15+, cookies() es una función asíncrona
    const cookieStore = await cookies();
    
    // Borrar la cookie de sesión
    cookieStore.delete("user_session");
    
    // Crear respuesta
    const response = NextResponse.json({ 
      success: true,
      message: "Sesión cerrada correctamente" 
    });
    
    // También establecer en headers para asegurar que se borre
    response.cookies.set({
      name: "user_session",
      value: "",
      maxAge: 0,
      path: "/",
    });

    console.log("Logout exitoso - cookie eliminada");
    return response;

  } catch (error) {
    console.error("Error en logout:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Error al cerrar sesión" 
      },
      { status: 500 }
    );
  }
}