/**
 * SERVICE API ÉTUDIANTS
 * ======================
 * Ce fichier gère TOUS les appels à l'API.
 * C'est le seul endroit où on utilise fetch()
 * 
 * 💡 Les composants ne doivent JAMAIS faire directement des fetch()
 * Ils doivent passer par ce service uniquement
 */

// URL de base de l'API
// Elle est lue depuis le fichier .env.local
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getStoredToken = (override = null) => {
  if (override) return override;

  const directToken = localStorage.getItem('cv_token');
  if (directToken) return directToken;

  try {
    const auth = JSON.parse(localStorage.getItem('cv_auth') || 'null');
    return auth?.token || null;
  } catch {
    return null;
  }
};

/**
 * RÉCUPÉRER la liste de TOUS les étudiants
 * 
 * Exemple d'utilisation:
 *   const students = await getStudents();
 * 
 * @returns {Promise<Array>} Liste des étudiants
 */
export const getStudents = async () => {
  const token = getStoredToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/users`, { headers });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  const users = await response.json();
  const schoolsById = new Map(
    (users || [])
      .filter((user) => user.role === 'school')
      .map((school) => [String(school.id), school])
  );
  const companiesById = new Map(
    (users || [])
      .filter((user) => user.role === 'company')
      .map((company) => [String(company.id), company])
  );
  // map users with role 'student' to student shape
  return (users || []).filter(u => u.role === 'student').map(u => {
    const school = u.profile?.schoolId ? schoolsById.get(String(u.profile.schoolId)) : null;
    const company = u.profile?.companyId ? companiesById.get(String(u.profile.companyId)) : null;

    return {
      id: u.id,
      email: u.email || '',
      firstName: u.profile?.firstName || '',
      lastName: u.profile?.lastName || '',
      age: u.profile?.age || 0,
      jobTitle: u.profile?.jobTitle || '',
      location: u.profile?.location || '',
      bio: u.profile?.bio || '',
      skills: u.profile?.skills || [],
      tags: u.profile?.tags || [],
      projects: u.profile?.projects || [],
      school: u.profile?.schoolId ? {
        id: u.profile.schoolId,
        name: school?.name || '',
        location: school?.profile?.location || '',
      } : null,
      company: u.profile?.companyId ? {
        id: u.profile.companyId,
        name: company?.name || '',
        location: company?.profile?.location || '',
      } : null,
      // pending request fields
      pendingSchoolId: u.profile?.pendingSchoolId || null,
      pendingSchoolStatus: u.profile?.pendingSchoolStatus || null,
      pendingCompanyId: u.profile?.pendingCompanyId || null,
      pendingCompanyStatus: u.profile?.pendingCompanyStatus || null,
    };
  });
};

/**
 * RÉCUPÉRER UN étudiant par son ID
 * 
 * Exemple d'utilisation:
 *   const student = await getStudentById(1);
 * 
 * @param {number} id - L'ID de l'étudiant
 * @returns {Promise<Object>} Les données de l'étudiant
 */
export const getStudentById = async (id) => {
  const token = getStoredToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/users/${id}`, { headers });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  const u = await response.json();
  if (!u) return null;
  let school = null;
  let company = null;

  if (u.profile?.schoolId || u.profile?.companyId) {
    const usersResponse = await fetch(`${API_BASE_URL}/users`, { headers }).catch(() => null);
    if (usersResponse?.ok) {
      const users = await usersResponse.json();
      school = (users || []).find((user) => user.role === 'school' && String(user.id) === String(u.profile?.schoolId)) || null;
      company = (users || []).find((user) => user.role === 'company' && String(user.id) === String(u.profile?.companyId)) || null;
    }
  }

  return {
    id: u.id,
    email: u.email || '',
    firstName: u.profile?.firstName || '',
    lastName: u.profile?.lastName || '',
    age: u.profile?.age || 0,
    jobTitle: u.profile?.jobTitle || '',
    location: u.profile?.location || '',
    bio: u.profile?.bio || '',
    skills: u.profile?.skills || [],
    tags: u.profile?.tags || [],
    projects: u.profile?.projects || [],
    school: u.profile?.schoolId ? {
      id: u.profile.schoolId,
      name: school?.name || '',
      location: school?.profile?.location || '',
    } : null,
    company: u.profile?.companyId ? {
      id: u.profile.companyId,
      name: company?.name || '',
      location: company?.profile?.location || '',
    } : null,
    pendingSchoolId: u.profile?.pendingSchoolId || null,
    pendingSchoolStatus: u.profile?.pendingSchoolStatus || null,
    pendingCompanyId: u.profile?.pendingCompanyId || null,
    pendingCompanyStatus: u.profile?.pendingCompanyStatus || null,
  };
};

/**
 * CRÉER un nouvel étudiant (POST)
 * 
 * Exemple d'utilisation:
 *   const newStudent = await createStudent({
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     age: 25,
 *     jobTitle: 'Développeur',
 *     location: 'Paris'
 *   });
 * 
 * @param {Object} studentData - Les données du nouvel étudiant
 * @returns {Promise<Object>} L'étudiant créé (avec l'ID assigné par l'API)
 */
export const createStudent = async (studentData) => {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify(studentData),
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  return await response.json();
};

/**
 * METTRE À JOUR un étudiant existant (PUT)
 * 
 * Exemple d'utilisation:
 *   const updated = await updateStudent(1, {
 *     firstName: 'Jane',
 *     jobTitle: 'Développeuse Senior'
 *   });
 * 
 * @param {number} id - L'ID de l'étudiant à mettre à jour
 * @param {Object} studentData - Les nouvelles données
 * @returns {Promise<Object>} L'étudiant mis à jour
 */
export const updateStudent = async (id, studentData, tokenOverride = null) => {
  const token = getStoredToken(tokenOverride);
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ profile: studentData }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.detail || `Erreur: ${response.status}`);
  }

  return await response.json();
};

/**
 * SUPPRIMER un étudiant (DELETE)
 * 
 * Exemple d'utilisation:
 *   await deleteStudent(1);
 * 
 * @param {number} id - L'ID de l'étudiant à supprimer
 * @returns {Promise<void>}
 */
export const deleteStudent = async (id) => {
  const token = getStoredToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
};

/**
 * Set user approved/unapproved via PATCH
 */
export const setUserApproved = async (id, approved) => {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ approved: approved ? 1 : 0 }),
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  return await response.json();
};

export const respondPendingSchool = async (id, action) => {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API_BASE_URL}/users/${id}/pending-school`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  return await response.json();
};

export const respondPendingCompany = async (id, action) => {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${API_BASE_URL}/users/${id}/pending-company`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  return await response.json();
};
