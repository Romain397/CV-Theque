const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const getCompanies = async () => {
  const token = localStorage.getItem('cv_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE_URL}/users`, { headers });
  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  const users = await res.json();
  return (users || []).filter(u => u.role === 'company').map(u => ({
    id: u.id,
    name: u.name,
    location: u.profile?.location || '',
    specialties: u.profile?.skills || [],
  }));
};

export const updateCompany = async (id, companyData) => {
  const token = localStorage.getItem('cv_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name: companyData.name, profile: { location: companyData.location, skills: companyData.specialties } }),
  });

  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  return await res.json();
};

export default { getCompanies, updateCompany };
