import { NextResponse } from "next/server";

export async function GET(request) {
  // 1. Leemos la cookie directamente del request (es más rápido y estable en APIs)
  const sessionCookie = request.cookies.get('user_session');

  // 2. SI NO HAY COOKIE
  if (!sessionCookie) {
    // 🔥 CAMBIO CRÍTICO:
    // Devolvemos status 200 (OK) con authenticated: false.
    // Esto evita el error rojo en la consola del navegador.
    return NextResponse.json({ 
        authenticated: false, 
        user: null 
    }, { status: 200 });
  }

  // 3. SI HAY COOKIE, INTENTAMOS LEERLA
  try {
    const user = JSON.parse(sessionCookie.value);
    
    return NextResponse.json({ 
        authenticated: true, 
        user: user 
    }, { status: 200 });

  } catch (error) {
    // Si la cookie estaba corrupta, tampoco damos error 401, solo false.
    return NextResponse.json({ 
        authenticated: false, 
        user: null 
    }, { status: 200 });
  }
}