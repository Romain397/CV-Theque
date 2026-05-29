const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const getCompanies = async () => {
  const res = await fetch(`${API_BASE_URL}/companies`);
  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export const updateCompany = async (id, companyData) => {
  const res = await fetch(`${API_BASE_URL}/companies/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(companyData),
  });

  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export default { getCompanies, updateCompany };
