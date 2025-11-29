import { useState } from 'react';

const API_BASE_URL = 'https://airtable-backend-7sit.onrender.com/api/forms';

function FormBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialUserId = urlParams.get('userId') || '';

  const [userId, setUserId] = useState(initialUserId);
  const [bases, setBases] = useState([]);
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedFormId, setSavedFormId] = useState(null);

  const fetchBases = async () => {
    if (!userId) {
      setError('Please enter a User ID first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('Fetching bases for user:', userId);
      const response = await fetch(`${API_BASE_URL}/bases`, {
        headers: {
          'x-user-id': userId,
        },
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch bases: ${response.status}`);
      }

      if (Array.isArray(data)) {
        setBases(data);
        if (data.length === 0) {
          setError(
            'No bases found. This usually means:\n' +
            '1. You have no bases in your Airtable account, OR\n' +
            '2. Your bases are not shared with this OAuth app.\n\n' +
            'To fix: Go to your Airtable workspace settings → Apps & integrations → ' +
            'find this app and share your bases with it.'
          );
        } else {
          setError('');
        }
      } else {
        setBases([]);
        setError('Unexpected response format from server');
      }
    } catch (err) {
      console.error('Error fetching bases:', err);
      setError(err.message || 'Failed to fetch bases. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (baseId) => {
    if (!userId || !baseId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/${baseId}/tables`, {
        headers: {
          'x-user-id': userId,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async (baseId, tableId) => {
    if (!userId || !baseId || !tableId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/${baseId}/tables/${tableId}/fields`, {
        headers: {
          'x-user-id': userId,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch fields');
      const data = await response.json();
      setFields(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBaseSelect = (baseId) => {
    setSelectedBaseId(baseId);
    setSelectedTableId('');
    setTables([]);
    setFields([]);
    setSelectedFields([]);
    if (baseId) {
      fetchTables(baseId);
    }
  };

  const handleTableSelect = (tableId) => {
    setSelectedTableId(tableId);
    setFields([]);
    setSelectedFields([]);
    if (tableId && selectedBaseId) {
      fetchFields(selectedBaseId, tableId);
    }
  };

  const toggleFieldSelection = (field) => {
    const isSelected = selectedFields.some(f => f.airtableFieldId === field.id);
    if (isSelected) {
      setSelectedFields(selectedFields.filter(f => f.airtableFieldId !== field.id));
    } else {
      let options = [];
      if ((field.type === 'singleSelect' || field.type === 'multipleSelects') && field.options?.choices) {
        options = field.options.choices.map(choice => choice.name || choice);
      }

      setSelectedFields([
        ...selectedFields,
        {
          airtableFieldId: field.id,
          questionKey: `field_${field.id}`,
          label: field.name,
          type: field.type,
          required: false,
          options: options,
          conditionalRules: null,
        },
      ]);
    }
  };

  const updateFieldConfig = (fieldId, updates) => {
    setSelectedFields(selectedFields.map(f =>
      f.airtableFieldId === fieldId ? { ...f, ...updates } : f
    ));
  };

  const initConditionalRules = (fieldId) => {
    setSelectedFields(selectedFields.map(f =>
      f.airtableFieldId === fieldId
        ? {
          ...f,
          conditionalRules: {
            logic: 'AND',
            conditions: []
          }
        }
        : f
    ));
  };

  const updateConditionalLogic = (fieldId, logic) => {
    setSelectedFields(selectedFields.map(f =>
      f.airtableFieldId === fieldId
        ? {
          ...f,
          conditionalRules: f.conditionalRules
            ? { ...f.conditionalRules, logic }
            : { logic, conditions: [] }
        }
        : f
    ));
  };

  const addConditionalCondition = (fieldId) => {
    setSelectedFields(selectedFields.map(f =>
      f.airtableFieldId === fieldId
        ? {
          ...f,
          conditionalRules: f.conditionalRules
            ? {
              ...f.conditionalRules,
              conditions: [
                ...f.conditionalRules.conditions,
                { questionKey: '', operator: 'equals', value: '' }
              ]
            }
            : {
              logic: 'AND',
              conditions: [{ questionKey: '', operator: 'equals', value: '' }]
            }
        }
        : f
    ));
  };

  const updateConditionalCondition = (fieldId, conditionIndex, updates) => {
    setSelectedFields(selectedFields.map(f =>
      f.airtableFieldId === fieldId
        ? {
          ...f,
          conditionalRules: f.conditionalRules ? {
            ...f.conditionalRules,
            conditions: f.conditionalRules.conditions.map((condition, idx) =>
              idx === conditionIndex ? { ...condition, ...updates } : condition
            ),
          } : null
        }
        : f
    ));
  };

  const removeConditionalCondition = (fieldId, conditionIndex) => {
    setSelectedFields(selectedFields.map(f =>
      f.airtableFieldId === fieldId
        ? {
          ...f,
          conditionalRules: f.conditionalRules && f.conditionalRules.conditions.length > 1
            ? {
              ...f.conditionalRules,
              conditions: f.conditionalRules.conditions.filter((_, idx) => idx !== conditionIndex),
            }
            : null
        }
        : f
    ));
  };

  const handleSaveForm = async () => {
    if (!userId || !selectedBaseId || !selectedTableId || selectedFields.length === 0) {
      setError('Please complete all required steps: select base, table, and at least one field');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const questions = selectedFields.map(field => {
        let conditionalRules = null;
        if (field.conditionalRules && field.conditionalRules.conditions && field.conditionalRules.conditions.length > 0) {
          conditionalRules = {
            logic: field.conditionalRules.logic || 'AND',
            conditions: field.conditionalRules.conditions.map(c => ({
              questionKey: c.questionKey,
              operator: c.operator,
              value: c.value
            }))
          };
        }
        return {
          questionKey: field.questionKey,
          airtableFieldId: field.airtableFieldId,
          label: field.label,
          type: field.type,
          required: field.required,
          options: field.options || [],
          conditionalRules
        };
      });

      const formData = {
        airtableBaseId: selectedBaseId,
        airtableTableId: selectedTableId,
        questions,
      };

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save form');
      }

      const savedForm = await response.json();
      setSavedFormId(savedForm._id);
      console.log('Saved form:', savedForm);

      setSelectedBaseId('');
      setSelectedTableId('');
      setFields([]);
      setSelectedFields([]);

      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-sm">
      <div className="flex justify-between items-center mb-md">
        <h1>Form Builder</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Authentication</h3>
        </div>
        <p className="text-sm mb-md">
          You need to authenticate with Airtable first. After authentication, you'll get a User ID.
          <br />
          <a href="https://airtable-backend-7sit.onrender.com/auth/airtable/login" target="_blank" rel="noopener noreferrer">
            Click here to authenticate with Airtable
          </a>
        </p>
        <div className="flex gap-sm items-end">
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>User ID (MongoDB ObjectId):</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your MongoDB User ID"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={fetchBases}
            disabled={!userId || loading}
          >
            {loading ? 'Loading...' : 'Load Bases'}
          </button>
        </div>

        {userId && (
          <div className="mt-md flex gap-sm">
            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                try {
                  const response = await fetch(`${API_BASE_URL}/test-auth`, {
                    headers: {
                      'x-user-id': userId,
                    },
                  });
                  const data = await response.json();
                  console.log('Auth test result:', data);
                  if (data.success) {
                    alert(`✅ Token is valid!\n\nAirtable User: ${data.user.airtableUserInfo?.id || 'N/A'}\n\nIf you still see no bases, make sure to share your bases with the OAuth app in Airtable settings.`);
                  } else {
                    alert(`❌ Token issue: ${data.message}\n\nYou may need to re-authenticate.`);
                  }
                } catch (err) {
                  console.error('Error testing auth:', err);
                  alert('Error testing authentication. Check console for details.');
                }
              }}
            >
              Test Auth Token
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                try {
                  const response = await fetch(`https://airtable-backend-7sit.onrender.com/auth/airtable/users`);
                  const users = await response.json();
                  console.log('Available users:', users);
                  alert(`Found ${users.length} user(s). Check console for details.`);
                } catch (err) {
                  console.error('Error fetching users:', err);
                }
              }}
            >
              List Users (Debug)
            </button>
          </div>
        )}
      </div>

      {savedFormId && (
        <div className="alert alert-success">
          <strong>✅ Form saved successfully!</strong>
          <div className="mt-md flex gap-md items-center">
            <a
              href={`/form/${savedFormId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Form
            </a>
            <a
              href={`/forms/${savedFormId}/responses?userId=${userId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Responses
            </a>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSavedFormId(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ whiteSpace: 'pre-line' }}>
          <strong>⚠️ {error}</strong>
        </div>
      )}

      {bases.length === 0 && !loading && userId && !error && (
        <div className="alert alert-warning">
          <strong>ℹ️ No bases found.</strong>
          <p className="mt-sm mb-0">
            If you have bases in Airtable, you need to share them with this OAuth app:
          </p>
          <ol className="mt-sm" style={{ paddingLeft: '20px' }}>
            <li>Go to your Airtable workspace</li>
            <li>Click on Settings → Apps & integrations</li>
            <li>Find this OAuth app in the list</li>
            <li>Click on it and share your bases with the app</li>
            <li>Then try loading bases again</li>
          </ol>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Step 1: Select Airtable Base</h2>
        </div>
        <select
          value={selectedBaseId}
          onChange={(e) => handleBaseSelect(e.target.value)}
          disabled={bases.length === 0 || loading}
        >
          <option value="">-- Select a Base --</option>
          {bases.map((base) => (
            <option key={base.id} value={base.id}>
              {base.name}
            </option>
          ))}
        </select>
      </div>

      {selectedBaseId && (
        <div className="card">
          <div className="card-header">
            <h2>Step 2: Select Table</h2>
          </div>
          <select
            value={selectedTableId}
            onChange={(e) => handleTableSelect(e.target.value)}
            disabled={tables.length === 0 || loading}
          >
            <option value="">-- Select a Table --</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedTableId && fields.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Step 3: Select and Configure Fields</h2>
          </div>

          <div className="mb-lg">
            <h3>Available Fields</h3>
            <p className="text-sm mb-md">
              Supported types: Short text, Long text, Single select, Multi select, Attachment
            </p>
            {fields.length === 0 ? (
              <div className="alert alert-warning">
                No supported field types found in this table. Please ensure your table has at least one supported field type.
              </div>
            ) : (
              <div className="flex flex-col gap-sm">
                {fields.map((field) => {
                  const isSelected = selectedFields.some(f => f.airtableFieldId === field.id);
                  return (
                    <div
                      key={field.id}
                      className={`field-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleFieldSelection(field)}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }} 
                        style={{ marginRight: '10px', width: 'auto' }}
                      />
                      <span style={{ fontWeight: 'bold' }}>{field.name}</span>
                      <span className="badge badge-info" style={{ marginLeft: '10px', fontSize: '0.7rem' }}>{field.type}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedFields.length > 0 && (
            <div className="mt-xl">
              <h3>Configure Selected Fields</h3>
              {selectedFields.map((selectedField) => {
                const field = fields.find(f => f.id === selectedField.airtableFieldId);
                return (
                  <div
                    key={selectedField.airtableFieldId}
                    className="card mt-md"
                    style={{ borderLeft: '4px solid var(--primary)' }}
                  >
                    <h4>{field?.name} <span className="text-sm text-secondary">({field?.type})</span></h4>

                    <div className="form-group">
                      <label>Question Key (internal):</label>
                      <input
                        type="text"
                        value={selectedField.questionKey}
                        onChange={(e) => updateFieldConfig(selectedField.airtableFieldId, { questionKey: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Label (question text):</label>
                      <input
                        type="text"
                        value={selectedField.label}
                        onChange={(e) => updateFieldConfig(selectedField.airtableFieldId, { label: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedField.required}
                          onChange={(e) => updateFieldConfig(selectedField.airtableFieldId, { required: e.target.checked })}
                          style={{ width: 'auto' }}
                        />
                        Required
                      </label>
                    </div>

                    <div className="conditional-group mt-md">
                      <div className="flex justify-between items-center mb-sm">
                        <strong>Conditional Logic Rules</strong>
                        {!selectedField.conditionalRules && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => initConditionalRules(selectedField.airtableFieldId)}
                          >
                            Enable Conditional Logic
                          </button>
                        )}
                      </div>

                      {selectedField.conditionalRules && (
                        <>
                          <div className="form-group">
                            <label>Combine conditions with:</label>
                            <select
                              value={selectedField.conditionalRules.logic || 'AND'}
                              onChange={(e) => updateConditionalLogic(selectedField.airtableFieldId, e.target.value)}
                            >
                              <option value="AND">AND (all conditions must be true)</option>
                              <option value="OR">OR (any condition can be true)</option>
                            </select>
                          </div>

                          <div className="mb-sm">
                            <strong>Conditions:</strong>
                            <button
                              className="btn btn-secondary btn-sm ml-sm"
                              onClick={() => addConditionalCondition(selectedField.airtableFieldId)}
                              style={{ marginLeft: '10px' }}
                            >
                              + Add Condition
                            </button>
                          </div>

                          {selectedField.conditionalRules.conditions.map((condition, conditionIndex) => (
                            <div
                              key={conditionIndex}
                              className="flex gap-sm items-center flex-wrap mb-sm p-sm bg-white rounded border"
                            >
                              {conditionIndex > 0 && (
                                <span className="badge badge-secondary">
                                  {selectedField.conditionalRules.logic}
                                </span>
                              )}
                              <span>Show if</span>

                              <select
                                value={condition.questionKey}
                                onChange={(e) => updateConditionalCondition(selectedField.airtableFieldId, conditionIndex, { questionKey: e.target.value })}
                                style={{ width: 'auto', flex: 1 }}
                              >
                                <option value="">-- Select field --</option>
                                {selectedFields
                                  .filter(f => f.airtableFieldId !== selectedField.airtableFieldId)
                                  .map(f => {
                                    const fieldName = fields.find(fl => fl.id === f.airtableFieldId)?.name || f.airtableFieldId;
                                    return (
                                      <option key={f.airtableFieldId} value={f.questionKey}>
                                        {fieldName}
                                      </option>
                                    );
                                  })}
                              </select>

                              <select
                                value={condition.operator}
                                onChange={(e) => updateConditionalCondition(selectedField.airtableFieldId, conditionIndex, { operator: e.target.value })}
                                style={{ width: 'auto' }}
                              >
                                <option value="equals">equals</option>
                                <option value="notEquals">not equals</option>
                                <option value="contains">contains</option>
                              </select>

                              <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => updateConditionalCondition(selectedField.airtableFieldId, conditionIndex, { value: e.target.value })}
                                placeholder="Value"
                                style={{ width: '150px' }}
                              />

                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => removeConditionalCondition(selectedField.airtableFieldId, conditionIndex)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          {selectedField.conditionalRules.conditions.length === 0 && (
                            <p className="text-sm text-secondary italic">No conditions added. Add a condition to enable conditional logic.</p>
                          )}

                          {selectedField.conditionalRules.conditions.length > 0 && (
                            <button
                              className="btn btn-secondary btn-sm mt-sm"
                              onClick={() => updateFieldConfig(selectedField.airtableFieldId, { conditionalRules: null })}
                            >
                              Disable Conditional Logic
                            </button>
                          )}
                        </>
                      )}

                      {!selectedField.conditionalRules && (
                        <p className="text-sm text-secondary italic">No conditional rules. This field will always be shown.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {selectedFields.length > 0 && (
        <div className="mt-xl mb-xl">
          <button
            className="btn btn-primary"
            onClick={handleSaveForm}
            disabled={loading || !selectedBaseId || !selectedTableId}
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
          >
            {loading ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FormBuilder;

