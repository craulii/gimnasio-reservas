import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/api';

export default function useCupos(user, sede = null) {
  const [cupos, setCupos] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ USAMOS useCallback:
  // Esto "memoriza" la función para que no cambie en cada render,
  // evitando bucles infinitos cuando se pasa como prop a otros componentes.
  const fetchCupos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // La cookie viaja automáticamente, 'sede' es opcional
      const { ok, data } = await ApiService.getCupos(sede);
      
      if (ok) {
        setCupos(data);
      } else {
        setError(data?.message || "No se pudieron cargar los cupos");
      }
    } catch (error) {
      console.error("Error fetching cupos:", error);
      setError("Error de conexión al cargar cupos");
    } finally {
      setLoading(false);
    }
  }, [sede]); // Solo se recrea si cambia la sede

  useEffect(() => {
    // Solo intentamos cargar si hay un usuario logueado (contexto cargado)
    if (user) {
      fetchCupos();
    }
  }, [user, fetchCupos]); // Dependencias seguras

  return { cupos, loading, error, fetchCupos };
}