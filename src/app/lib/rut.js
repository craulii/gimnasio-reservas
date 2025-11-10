export function normalizarRut(rut) {
  if (!rut) return '';
  const limpio = String(rut).replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (limpio.length < 2) return '';
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo}-${dv}`;
}

export function validarRut(rut) {
  if (!rut) return false;
  
  // Limpiar: quitar puntos y guiones
  const limpio = String(rut).replace(/\./g, '').replace(/-/g, '').toUpperCase();
  
  // Validar formato: 7 u 8 dígitos + 1 dígito verificador (0-9 o K)
  // Acepta desde 1.000.000-X hasta 99.999.999-X
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) {
    return false;
  }
  
  // Solo verificar que tenga largo válido (ya lo hizo el regex)
  return true;
}
