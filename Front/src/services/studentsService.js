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

/**
 * RÉCUPÉRER la liste de TOUS les étudiants
 * 
 * Exemple d'utilisation:
 *   const students = await getStudents();
 * 
 * @returns {Promise<Array>} Liste des étudiants
 */
export const getStudents = async () => {
  const token = localStorage.getItem('cv_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/users`, { headers });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  const users = await response.json();
  // map users with role 'student' to student shape
  return (users || []).filter(u => u.role === 'student').map(u => ({
    id: u.id,
    firstName: u.profile?.firstName || '',
    lastName: u.profile?.lastName || '',
    age: u.profile?.age || 0,
    jobTitle: u.profile?.jobTitle || '',
    location: u.profile?.location || '',
    skills: u.profile?.skills || [],
    school: u.profile?.schoolId ? { id: u.profile.schoolId } : null,
    company: u.profile?.companyId ? { id: u.profile.companyId } : null,
    // pending request fields
    pendingSchoolId: u.profile?.pendingSchoolId || null,
    pendingSchoolStatus: u.profile?.pendingSchoolStatus || null,
    pendingCompanyId: u.profile?.pendingCompanyId || null,
    pendingCompanyStatus: u.profile?.pendingCompanyStatus || null,
  }));
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
  const token = localStorage.getItem('cv_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}/users/${id}`, { headers });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  const u = await response.json();
  if (!u) return null;
  return {
    id: u.id,
    firstName: u.profile?.firstName || '',
    lastName: u.profile?.lastName || '',
    age: u.profile?.age || 0,
    jobTitle: u.profile?.jobTitle || '',
    location: u.profile?.location || '',
    skills: u.profile?.skills || [],
    school: u.profile?.schoolId ? { id: u.profile.schoolId } : null,
    company: u.profile?.companyId ? { id: u.profile.companyId } : null,
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
  const token = localStorage.getItem('cv_token');
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
export const updateStudent = async (id, studentData) => {
  const token = localStorage.getItem('cv_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ profile: studentData }),
    });
  } catch (fetchErr) {
    // network or CORS-preflight blocked the request — attempt fallback
    try {
      const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const params = new URLSearchParams();
        params.set('profile', JSON.stringify(studentData));
        if (token) params.set('token', token);
      const fallback = await fetch(`${API_BASE_URL}/users/${id}/profile-form`, {
        method: 'POST',
        headers: formHeaders,
        body: params.toString(),
      });
      if (!fallback.ok) throw new Error(`Fallback failed: ${fallback.status}`);
      return await fallback.json();
    } catch (err) {
      throw new Error(`Erreur fetch: ${fetchErr?.message} / fallback: ${err?.message}`);
    }
  }

  if (!response.ok) {
    // try fallback when server returned non-OK (e.g., 4xx from preflight policies)
    try {
      const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const params = new URLSearchParams();
      params.set('profile', JSON.stringify(studentData));
      const fallback = await fetch(`${API_BASE_URL}/users/${id}/profile-form`, {
        method: 'POST',
        headers: formHeaders,
        body: params.toString(),
      });
      if (!fallback.ok) throw new Error(`Fallback failed: ${fallback.status}`);
      return await fallback.json();
    } catch (err) {
      throw new Error(`Erreur: ${response.status} / fallback: ${err?.message}`);
    }
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
  const token = localStorage.getItem('cv_token');
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
  const token = localStorage.getItem('cv_token');
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
  const token = localStorage.getItem('cv_token');
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
  const token = localStorage.getItem('cv_token');
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
