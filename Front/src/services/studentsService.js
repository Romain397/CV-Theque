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
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * RÉCUPÉRER la liste de TOUS les étudiants
 * 
 * Exemple d'utilisation:
 *   const students = await getStudents();
 * 
 * @returns {Promise<Array>} Liste des étudiants
 */
export const getStudents = async () => {
  const response = await fetch(`${API_BASE_URL}/students`);
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  return await response.json();
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
  const response = await fetch(`${API_BASE_URL}/students/${id}`);
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
  return await response.json();
};

/**
 * CRÉER un nouvel étudiant (POST)
 * 
 * Exemple d'utilisation:
 *   const newStudent = await createStudent({
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     age: 25,
 *     position: 'Développeur',
 *     location: 'Paris'
 *   });
 * 
 * @param {Object} studentData - Les données du nouvel étudiant
 * @returns {Promise<Object>} L'étudiant créé (avec l'ID assigné par l'API)
 */
export const createStudent = async (studentData) => {
  const response = await fetch(`${API_BASE_URL}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
 *     position: 'Développeuse Senior'
 *   });
 * 
 * @param {number} id - L'ID de l'étudiant à mettre à jour
 * @param {Object} studentData - Les nouvelles données
 * @returns {Promise<Object>} L'étudiant mis à jour
 */
export const updateStudent = async (id, studentData) => {
  const response = await fetch(`${API_BASE_URL}/students/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(studentData),
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
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
  const response = await fetch(`${API_BASE_URL}/students/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
};
