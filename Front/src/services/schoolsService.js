const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const getSchools = async () => {
  const res = await fetch(`${API_BASE_URL}/schools`);
  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export const updateSchool = async (id, schoolData) => {
  const res = await fetch(`${API_BASE_URL}/schools/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schoolData),
  });

  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export default { getSchools, updateSchool };
