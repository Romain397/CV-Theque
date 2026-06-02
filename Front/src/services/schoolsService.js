const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getStoredToken = () => {
  const directToken = localStorage.getItem('cv_token');
  if (directToken) return directToken;

  try {
    const auth = JSON.parse(localStorage.getItem('cv_auth') || 'null');
    return auth?.token || null;
  } catch {
    return null;
  }
};

const normalizeLocations = (profile = {}) => {
  const locations = Array.isArray(profile.locations) ? profile.locations : [];
  const normalized = locations
    .map((location) => `${location || ''}`.trim())
    .filter(Boolean);
  const fallbackLocation = `${profile.location || ''}`.trim();

  return normalized.length ? normalized : (fallbackLocation ? [fallbackLocation] : []);
};

const mapSchoolUser = (user) => ({
  id: user.id,
  name: user.name,
  location: normalizeLocations(user.profile).join(', '),
  locations: normalizeLocations(user.profile),
  bio: user.profile?.bio || '',
  headline: user.profile?.headline || '',
  website: user.profile?.website || '',
  highlights: user.profile?.highlights || [],
  campusPerks: user.profile?.campusPerks || [],
  specialties: user.profile?.skills || [],
});

export const getSchools = async () => {
  const token = getStoredToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE_URL}/users`, { headers });
  if (!res.ok) throw new Error(`Erreur: ${res.status}`);
  const users = await res.json();
  return (users || []).filter(u => u.role === 'school').map(mapSchoolUser);
};

export const updateSchool = async (id, schoolData) => {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      name: schoolData.name,
      profile: {
        location: schoolData.location,
        locations: schoolData.locations,
        skills: schoolData.specialties,
        firstName: schoolData.firstName,
        lastName: schoolData.lastName,
        headline: schoolData.headline,
        bio: schoolData.bio,
        website: schoolData.website,
        highlights: schoolData.highlights,
        campusPerks: schoolData.campusPerks,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.detail || `Erreur: ${res.status}`);
  }
  return mapSchoolUser(await res.json());
};

export default { getSchools, updateSchool };
