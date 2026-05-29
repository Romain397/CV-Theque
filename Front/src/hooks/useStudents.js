import { useCallback, useEffect, useState } from 'react'
import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
} from '../services/studentsService'

export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getStudents()
      setStudents(data)
    } catch {
      setError("Impossible de charger les etudiants depuis l'API.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // The project requires API loading from a custom hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudents()
  }, [loadStudents])

  async function addStudent(student) {
    const createdStudent = await createStudent(student)
    setStudents((currentStudents) => [createdStudent, ...currentStudents])
  }

  async function saveStudent(id, student) {
    const updatedStudent = await updateStudent(id, student)
    setStudents((currentStudents) =>
      currentStudents.map((currentStudent) =>
        currentStudent.id === id ? updatedStudent : currentStudent,
      ),
    )
  }

  async function removeStudent(id) {
    await deleteStudent(id)
    setStudents((currentStudents) =>
      currentStudents.filter((student) => student.id !== id),
    )
  }

  return {
    students,
    loading,
    error,
    addStudent,
    saveStudent,
    removeStudent,
    reloadStudents: loadStudents,
  }
}
