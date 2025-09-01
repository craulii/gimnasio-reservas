import { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function useCupos(user) {
  const [cupos, setCupos] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchCupos = async () => {
    setLoading(true);
    try {
      const { ok, data } = await ApiService.getCupos();
      if (ok) {
        setCupos(data);
      }
    } catch (error) {
      console.error("Error fetching cupos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCupos();
    }
  }, [user]);

  return { cupos, loading, fetchCupos };
}