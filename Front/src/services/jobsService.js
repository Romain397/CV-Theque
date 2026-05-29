const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const getJobs = async () => {
  const res = await fetch(`${API_BASE_URL}/jobs`);
  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export const updateJob = async (id, jobData) => {
  const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });

  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export default { getJobs, updateJob };
