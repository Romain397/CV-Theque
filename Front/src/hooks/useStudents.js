import { useState, useCallback, useEffect } from 'react';
import * as studentsService from '../services/studentsService';

/**
 * HOOK PERSONNALISÉ useStudents
 * ==============================
 * 
 * Ce hook gère TOUTE la logique métier des étudiants:
 * - Récupération des données depuis l'API
 * - Gestion du chargement (loading)
 * - Gestion des erreurs
 * - Les 4 opérations CRUD (Create, Read, Update, Delete)
 * 
 * ✅ Les composants l'utilisent comme ceci:
 *    const { students, loading, error, addStudent } = useStudents();
 * 
 * 💡 Utiliser ce hook élimine le besoin de faire fetch() dans les composants
 */
export const useStudents = () => {
  // 🔹 État des étudiants - liste vide au départ
  const [students, setStudents] = useState([]);

  // 🔹 État du chargement - true quand on attend une réponse de l'API
  const [loading, setLoading] = useState(false);

  // 🔹 État des erreurs - null si tout va bien, sinon le message d'erreur
  const [error, setError] = useState(null);

  /**
   * 📥 FETCH - Récupère TOUS les étudiants depuis l'API
   */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null); // Réinitialiser l'erreur
    try {
      // Appel au service (qui fait le fetch)
      const data = await studentsService.getStudents();
      // Mettre à jour l'état avec les données
      setStudents(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      // Si erreur, stocker le message
      setError(err.message || 'Une erreur est survenue');
      setStudents([]);
    } finally {
      // Dans tous les cas, arrêter le chargement
      setLoading(false);
    }
  }, []);

  /**
   * 🔄 REFRESH - Rafraîchir les données (réappeler fetch)
   */
  const refresh = useCallback(() => {
    return fetchStudents();
  }, [fetchStudents]);

  /**
   * ➕ CREATE - Ajouter un nouvel étudiant
   * 
   * Utilisation:
   *   await addStudent({
   *     firstName: 'John',
   *     lastName: 'Doe',
   *     age: 25,
   *     position: 'Développeur',
   *     location: 'Paris'
   *   });
   */
  const addStudent = useCallback(async (studentData) => {
    try {
      setError(null);
      // Appel au service pour créer
      const newStudent = await studentsService.createStudent(studentData);
      // Ajouter à la liste existante
      setStudents((prev) => [...prev, newStudent]);
      return newStudent;
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la création de l\'étudiant';
      setError(errorMessage);
      throw err; // Relancer l'erreur pour le composant
    }
  }, []);

  /**
   * ✏️ UPDATE - Mettre à jour un étudiant existant
   * 
   * Utilisation:
   *   await updateStudentItem(1, {
   *     firstName: 'Jane',
   *     position: 'Senior Developer'
   *   });
   */
  const updateStudentItem = useCallback(async (id, studentData) => {
    try {
      setError(null);
      // Appel au service pour mettre à jour
      const updatedStudent = await studentsService.updateStudent(id, studentData);
      // Mettre à jour dans la liste
      setStudents((prev) =>
        prev.map((student) =>
          student.id === id ? updatedStudent : student
        )
      );
      return updatedStudent;
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour de l\'étudiant';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * ❌ DELETE - Supprimer un étudiant
   * 
   * Utilisation:
   *   await removeStudent(1);
   */
  const removeStudent = useCallback(async (id) => {
    try {
      setError(null);
      // Appel au service pour supprimer
      await studentsService.deleteStudent(id);
      // Supprimer de la liste
      setStudents((prev) => prev.filter((student) => student.id !== id));
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la suppression de l\'étudiant';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * ⚡ useEffect - Récupérer les données au montage du composant
   * 
   * [] = le code s'exécute UNE FOIS quand le composant s'affiche
   * C'est magique pour les données initiales !
   */
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Retourner tout ce dont un composant a besoin
  return {
    students,        // 📊 Liste des étudiants
    loading,         // ⏳ True si en cours de chargement
    error,           // ⚠️ Message d'erreur ou null
    refresh,         // 🔄 Fonction pour rafraîchir
    addStudent,      // ➕ Fonction pour ajouter
    updateStudentItem, // ✏️ Fonction pour mettre à jour
    removeStudent,   // ❌ Fonction pour supprimer
  };
};
