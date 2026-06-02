const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const summarizeProfile = async (type, profile) => {
  const token = localStorage.getItem('cv_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/ai/profile-summary`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, profile }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let message = `Erreur ${response.status}`;

    try {
      if (contentType.includes('application/json')) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || errorBody?.error || errorBody?.message;
        const typeLabel = errorBody?.type ? ` (${errorBody.type})` : '';
        message = detail ? `${detail}${typeLabel}` : message;
      } else {
        const text = await response.text();
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 180);
        if (snippet) {
          message = `${message}: ${snippet}`;
        }
      }
    } catch (error) {
      // Fallback to the status code if the body cannot be parsed.
    }

    throw new Error(message);
  }

  return response.json();
};

export const matchJobProfile = async (job, profile) => {
  const token = localStorage.getItem('cv_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/ai/job-match`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ job, profile }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let message = `Erreur ${response.status}`;

    try {
      if (contentType.includes('application/json')) {
        const errorBody = await response.json();
        const detail = errorBody?.detail || errorBody?.error || errorBody?.message;
        const typeLabel = errorBody?.type ? ` (${errorBody.type})` : '';
        message = detail ? `${detail}${typeLabel}` : message;
      } else {
        const text = await response.text();
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 180);
        if (snippet) {
          message = `${message}: ${snippet}`;
        }
      }
    } catch (error) {
      // Fallback to status code if the body cannot be parsed.
    }

    throw new Error(message);
  }

  return response.json();
};

export default { summarizeProfile, matchJobProfile };
