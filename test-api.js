// test-api.js
// Ejecutar con: node test-api.js

const BASE_URL = "http://localhost:3000/api";

// --- CONFIGURACIÓN ---
// Pon aquí las credenciales de un ADMIN real de tu DB para probar las rutas protegidas
const ADMIN_EMAIL = "admin@usm.cl"; 
const ADMIN_PASSWORD = "admin"; // O la contraseña que uses

// Generamos un alumno aleatorio para no chocar con pruebas anteriores
const TIMESTAMP = Date.now();
const STUDENT_USER = {
    rol: "202104687-9", // Rol válido formato
    rut: `12.345.${Math.floor(Math.random() * 900) + 100}-k`, // Rut "falso" pero válido
    name: "Test Bot",
    email: `test_bot_${TIMESTAMP}@usm.cl`,
    password: "password123",
    confirmPassword: "password123"
};

// Variables para guardar las Cookies de sesión (simulando el navegador)
let studentCookie = "";
let adminCookie = "";

// Colores para la consola
const clr = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
    bold: "\x1b[1m"
};

async function runTests() {
    console.log(clr.bold + "\n🚀 INICIANDO TEST DE INTEGRACIÓN DE API\n" + clr.reset);

    try {
        // ==========================================
        // 1. FLUJO DE ALUMNO (Registro, Login, Uso)
        // ==========================================
        console.log(clr.yellow + "--- [1] PROBANDO FLUJO DE ALUMNO ---" + clr.reset);

        // A. REGISTER
        // CORREGIDO: Tu archivo está en /api/register/route.js, no en /auth/register
        await testRequest("POST", "/register", "Registro Alumno", STUDENT_USER, null, 201);

        // B. LOGIN ALUMNO
        const loginRes = await testRequest("POST", "/login", "Login Alumno", {
            username: STUDENT_USER.email,
            password: STUDENT_USER.password
        }, null, 200);
        
        // Guardar Cookie
        studentCookie = extractCookie(loginRes);

        // C. GET CUPOS (Público)
        await testRequest("GET", "/cupos", "Ver Cupos (Público)", null, null, 200);

        // D. GET MIS RESERVAS (Vacío al principio)
        await testRequest("GET", "/reservas", "Ver Mis Reservas (Vacío)", null, studentCookie, 200);

        // E. CREAR RESERVA
        // Usamos un bloque fijo, ej: 1-2 en Santiago
        const reservaData = { bloque_horario: "1-2", sede: "Santiago" };
        await testRequest("POST", "/reservas", "Crear Reserva", reservaData, studentCookie, 201);

        // F. VER QUE LA RESERVA EXISTA
        await testRequest("GET", "/reservas", "Ver Mis Reservas (Con Datos)", null, studentCookie, 200);

        // G. ELIMINAR RESERVA
        await testRequest("DELETE", "/reservas", "Cancelar Reserva", reservaData, studentCookie, 200);


        // ==========================================
        // 2. FLUJO DE ADMIN
        // ==========================================
        console.log(clr.yellow + "\n--- [2] PROBANDO FLUJO DE ADMIN ---" + clr.reset);

        // A. LOGIN ADMIN
        const adminLoginRes = await testRequest("POST", "/login", "Login Admin", {
            username: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        }, null, 200);
        
        adminCookie = extractCookie(adminLoginRes);

        if(!adminCookie) {
            console.error(clr.red + "❌ No se pudo loguear como Admin. Revisa las credenciales al inicio del script." + clr.reset);
            return;
        }

        // B. DASHBOARD: Usuarios
        await testRequest("GET", "/admin/usuarios?tipo=todos", "Admin: Listar Usuarios", null, adminCookie, 200);

        // C. DASHBOARD: Reservas Globales
        await testRequest("GET", "/admin/reservas-por-bloque", "Admin: Reservas por Bloque", null, adminCookie, 200);

        // D. DASHBOARD: Estadísticas
        await testRequest("GET", "/admin/estadisticas", "Admin: Estadísticas Generales", null, adminCookie, 200);

        // E. DASHBOARD: Exportar (CSV)
        // Nota: Solo verificamos que no de error 500, aunque devolverá texto CSV
        await testRequest("GET", "/admin/exportar?tipo=completo", "Admin: Exportar CSV", null, adminCookie, 200);

        // F. API: Mantenimiento (Manual)
        // CORREGIDO: Tu archivo está en /api/admin/mantenimiento, no en la raíz
        await testRequest("POST", "/admin/mantenimiento", "Admin: Ejecutar Mantenimiento", null, adminCookie, 200);


        // ==========================================
        // 3. PRUEBAS DE SEGURIDAD (INTENTOS FALLIDOS)
        // ==========================================
        console.log(clr.yellow + "\n--- [3] PRUEBAS DE SEGURIDAD (Deben fallar) ---" + clr.reset);

        // A. Alumno intentando entrar a ruta de admin
        await testRequest("GET", "/admin/usuarios", "Seguridad: Alumno pide datos Admin", null, studentCookie, 403);
        
        // B. Usuario sin cookie
        await testRequest("GET", "/reservas", "Seguridad: Anónimo pide reservas", null, null, 401);


        console.log(clr.bold + clr.green + "\n✨ TODOS LOS TESTS FINALIZADOS EXITOSAMENTE ✨" + clr.reset);

    } catch (error) {
        console.error(clr.bold + clr.red + "\n🛑 EL TEST FALLÓ:" + clr.reset, error.message);
    }
}

// --- HELPER FUNCTION ---
async function testRequest(method, endpoint, description, body, cookie, expectedStatus) {
    process.stdout.write(`Testing: ${description.padEnd(40)} ... `);

    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = cookie;

    const options = {
        method,
        headers,
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(BASE_URL + endpoint, options);
    
    // Leer body para debug si falla
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (response.status === expectedStatus) {
        console.log(clr.green + "OK" + clr.reset + ` (${response.status})`);
        return { headers: response.headers, data };
    } else {
        console.log(clr.red + "FAIL" + clr.reset + ` (Esperado: ${expectedStatus}, Recibido: ${response.status})`);
        console.log(clr.red + "Error Data:" + clr.reset, data);
        throw new Error(`Fallo en ${description}`);
    }
}

function extractCookie(responseObj) {
    const rawCookies = responseObj.headers.get("set-cookie");
    if (!rawCookies) return "";
    // Extraemos solo la parte de user_session=...;
    return rawCookies.split(";")[0];
}

// Ejecutar
runTests();