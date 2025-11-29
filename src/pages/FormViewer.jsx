import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://airtable-backend-7sit.onrender.com/api/forms';

function shouldShowQuestion(rules, answersSoFar) {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return true;
  }

  const { logic, conditions } = rules;

  const conditionResults = conditions.map(condition => {
    const { questionKey, operator, value } = condition;
    const answerValue = answersSoFar[questionKey];

    if (answerValue === undefined || answerValue === null || answerValue === '') {
      return false;
    }

    switch (operator) {
      case 'equals':
        if (Array.isArray(answerValue)) {
          return answerValue.includes(value) || answerValue.some(v => String(v) === String(value));
        }
        return String(answerValue) === String(value);

      case 'notEquals':
        if (Array.isArray(answerValue)) {
          return !answerValue.includes(value) && !answerValue.some(v => String(v) === String(value));
        }
        return String(answerValue) !== String(value);

      case 'contains':
        const answerStr = Array.isArray(answerValue)
          ? answerValue.join(' ')
          : String(answerValue);
        const valueStr = String(value);
        return answerStr.toLowerCase().includes(valueStr.toLowerCase());

      default:
        return false;
    }
  });

  if (logic === 'OR') {
    return conditionResults.some(result => result === true);
  } else {
    return conditionResults.every(result => result === true);
  }
}

function FormViewer() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      const data = await response.json();
      setForm(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionKey, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const requiredQuestions = form.questions.filter(q => q.required);
      const missingFields = requiredQuestions.filter(q => {
        const answer = answers[q.questionKey];
        return answer === undefined || answer === null || answer === '' ||
          (Array.isArray(answer) && answer.length === 0);
      });

      if (missingFields.length > 0) {
        setError(`Please fill in required fields: ${missingFields.map(q => q.label).join(', ')}`);
        setSubmitting(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.message || 'Failed to submit form';
        if (data.error) {
          if (typeof data.error === 'object') {
            errorMessage += `\n\nDetails: ${JSON.stringify(data.error, null, 2)}`;
          } else {
            errorMessage += `\n\n${data.error}`;
          }
        }
        if (data.details) {
          errorMessage += `\n\n${data.details}`;
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setAnswers({});
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (question) => {
    if (!shouldShowQuestion(question.conditionalRules, answers)) {
      return null;
    }

    const value = answers[question.questionKey] || '';

    switch (question.type) {
      case 'singleLineText':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
            className="mt-sm"
          />
        );

      case 'multilineText':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
            rows={4}
            className="mt-sm"
          />
        );

      case 'singleSelect':
        if (question.options && question.options.length > 0) {
          return (
            <select
              value={value}
              onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
              required={question.required}
              className="mt-sm"
            >
              <option value="">-- Select an option --</option>
              {question.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.questionKey, e.target.value)}
            required={question.required}
            placeholder="Enter selection (must match Airtable options exactly)"
            className="mt-sm"
          />
        );

      case 'multipleSelects':
        if (question.options && question.options.length > 0) {
          const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
          return (
            <div className="mt-sm">
              {question.options.map((option) => (
                <label key={option} className="flex items-center gap-sm mb-sm" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option]
                        : selectedValues.filter(v => v !== option);
                      handleAnswerChange(question.questionKey, newValues);
                    }}
                    style={{ width: 'auto' }}
                  />
                  {option}
                </label>
              ))}
            </div>
          );
        }
        return (
          <input
            type="text"
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => {
              const val = e.target.value;
              handleAnswerChange(question.questionKey, val ? val.split(',').map(s => s.trim()) : []);
            }}
            required={question.required}
            placeholder="Enter selections separated by commas (must match Airtable options exactly)"
            className="mt-sm"
          />
        );

      case 'multipleAttachments':
        return (
          <input
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files);
              handleAnswerChange(question.questionKey, files.map(f => f.name));
            }}
            required={question.required}
            className="mt-sm"
          />
        );

      default:
        return <p className="text-secondary">Unsupported field type: {question.type}</p>;
    }
  };

  if (loading) {
    return <div className="container-sm p-md text-center">Loading form...</div>;
  }

  if (!form) {
    return <div className="container-sm p-md text-center">Form not found</div>;
  }

  return (
    <div className="container-sm">
      <div className="card">
        <div className="card-header">
          <h1>Form: {form._id}</h1>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            Form submitted successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {form.questions.map((question, index) => {
            const isVisible = shouldShowQuestion(question.conditionalRules, answers);
            if (!isVisible) return null;

            return (
              <div
                key={question.questionKey}
                className="form-group mb-lg"
              >
                <label>
                  {question.label}
                  {question.required && <span className="text-danger"> *</span>}
                </label>
                {renderField(question)}
              </div>
            );
          })}

          <div className="mt-xl">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormViewer;

