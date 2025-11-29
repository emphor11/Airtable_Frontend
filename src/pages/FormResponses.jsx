import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE_URL = 'https://airtable-backend-7sit.onrender.com/api/forms';

function FormResponses() {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    if (urlUserId) {
      setUserId(urlUserId);
      fetchResponses(urlUserId);
    }
  }, [formId]);

  const fetchResponses = async (uid) => {
    if (!uid) {
      setError('User ID required. Add ?userId=YOUR_USER_ID to the URL');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${formId}/responses`, {
        headers: {
          'x-user-id': uid,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }

      const data = await response.json();
      setResponses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status, deleted) => {
    if (deleted) return 'badge badge-danger';
    if (status === 'updated') return 'badge badge-warning';
    return 'badge badge-success';
  };

  if (loading) {
    return <div className="container p-md text-center">Loading responses...</div>;
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-lg">
        <h1>Form Responses</h1>
        <div className="text-secondary text-sm">Form ID: {formId}</div>
      </div>

      {!userId && (
        <div className="alert alert-warning">
          <div className="flex gap-sm items-end">
            <div className="form-group mb-0" style={{ flex: 1 }}>
              <label>User ID (for authentication):</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => fetchResponses(userId)}
              disabled={!userId}
            >
              Load Responses
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {responses.length === 0 && !loading && (
        <div className="card text-center text-secondary">
          No responses found.
        </div>
      )}

      <div className="flex flex-col gap-md">
        {responses.map((response) => (
          <div
            key={response._id}
            className="card"
            style={{
              backgroundColor: response.deletedInAirtable ? 'var(--danger-bg)' : 'var(--surface)'
            }}
          >
            <div className="flex justify-between items-start mb-md">
              <div>
                <div className="text-sm text-secondary mb-xs">Submission ID: {response._id}</div>
                <div className="text-sm text-secondary">Airtable Record ID: {response.airtableRecordId}</div>
              </div>
              <div>
                <span className={getStatusBadgeClass(response.status, response.deletedInAirtable)}>
                  {response.deletedInAirtable ? 'DELETED' : response.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-lg mb-md text-sm text-secondary">
              <div>
                <strong>Created:</strong> {formatDate(response.createdAt)}
              </div>
              {response.updatedAt && response.updatedAt !== response.createdAt && (
                <div>
                  <strong>Updated:</strong> {formatDate(response.updatedAt)}
                </div>
              )}
            </div>

            <div className="mt-md">
              <strong className="block mb-sm">Answers Preview:</strong>
              <div className="code-block">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(response.answers, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FormResponses;

