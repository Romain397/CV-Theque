const API_URL = 'http://127.0.0.1:8000/students'

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API error ${response.status}`)
  }

  return response.json()
}

export function getStudents() {
  return request(API_URL)
}

export function createStudent(student) {
  return request(API_URL, {
    method: 'POST',
    body: JSON.stringify(student),
  })
}

export function updateStudent(id, student) {
  return request(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(student),
  })
}

export function deleteStudent(id) {
  return request(`${API_URL}/${id}`, {
    method: 'DELETE',
  })
}
