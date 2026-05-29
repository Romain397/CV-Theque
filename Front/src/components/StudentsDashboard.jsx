import { useState } from 'react'
import { useStudents } from '../hooks/useStudents'

const emptyForm = {
  firstName: '',
  lastName: '',
  age: '',
  jobTitle: '',
  location: '',
}

export function StudentsDashboard() {
  const {
    students,
    loading,
    error,
    addStudent,
    saveStudent,
    removeStudent,
    reloadStudents,
  } = useStudents()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
  }

  function editStudent(student) {
    setEditingId(student.id)
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      age: String(student.age),
      jobTitle: student.jobTitle,
      location: student.location,
    })
    setFormError('')
  }

  async function submitStudent(event) {
    event.preventDefault()

    if (!form.firstName || !form.lastName || !form.age || !form.jobTitle || !form.location) {
      setFormError('Tous les champs sont obligatoires.')
      return
    }

    const student = {
      ...form,
      age: Number(form.age),
    }

    try {
      setSaving(true)
      setFormError('')

      if (editingId) {
        await saveStudent(editingId, student)
      } else {
        await addStudent(student)
      }

      resetForm()
    } catch {
      setFormError("L'enregistrement a echoue.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="students-page">
      <header className="students-header">
        <div>
          <p>CV-Theque</p>
          <h1>Etudiants</h1>
        </div>
        <button type="button" className="secondary-button" onClick={reloadStudents}>
          Actualiser
        </button>
      </header>

      <section className="students-layout">
        <form className="student-form" onSubmit={submitStudent}>
          <h2>{editingId ? 'Modifier un etudiant' : 'Ajouter un etudiant'}</h2>

          <label>
            Prenom
            <input name="firstName" value={form.firstName} onChange={updateField} />
          </label>
          <label>
            Nom
            <input name="lastName" value={form.lastName} onChange={updateField} />
          </label>
          <label>
            Age
            <input min="1" name="age" type="number" value={form.age} onChange={updateField} />
          </label>
          <label>
            Metier
            <input name="jobTitle" value={form.jobTitle} onChange={updateField} />
          </label>
          <label>
            Localisation
            <input name="location" value={form.location} onChange={updateField} />
          </label>

          {formError && <p className="error">{formError}</p>}

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            {editingId && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <section className="students-list-panel">
          <div className="list-title">
            <h2>Liste des etudiants</h2>
            <span>{students.length}</span>
          </div>

          {loading && <p className="muted">Chargement...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && students.length === 0 && (
            <p className="muted">Aucun etudiant en base.</p>
          )}

          <div className="students-list">
            {students.map((student) => (
              <article className="student-card" key={student.id}>
                <div>
                  <h3>
                    {student.firstName} {student.lastName}
                  </h3>
                  <p>{student.jobTitle}</p>
                  <span>
                    {student.age} ans - {student.location}
                  </span>
                </div>
                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => editStudent(student)}>
                    Modifier
                  </button>
                  <button type="button" className="danger-button" onClick={() => removeStudent(student.id)}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
