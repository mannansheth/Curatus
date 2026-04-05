import React, { useState } from 'react';
import { userService } from '../services/api';
import './Assessment.css';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { QUESTIONS, OPTIONS } from '../data/data';



const INITIAL_RESPONSES = QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: null }), {});


function Assessment() {
  const [responses, setResponses]   = useState(INITIAL_RESPONSES);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const answeredCount = Object.values(responses).filter(v => v !== null).length;
  const progress = (answeredCount / QUESTIONS.length) * 100;

  const handleSelect = (key, value) => {
    setResponses(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(responses);
    const unanswered = QUESTIONS.filter(q => responses[q.key] === null);
    if (unanswered.length > 0) {
      setError(`Please answer all questions — ${unanswered.length} remaining.`);
      document.getElementById(`question-${unanswered[0].key}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    setError('');

    try {
      await userService.storeAssessment(responses);
      setSubmitted(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="assessment-page">
        <div className="assessment-card success-card">
          <div className="success-icon">✦</div>
          <h2 className="success-title">Assessment Complete</h2>
          <p className="success-subtitle">
            Thank you for checking in with yourself. Your responses have been saved.
          </p>
          <div className="success-scores">
            {QUESTIONS.map(q => (
              <div key={q.key} className="score-row">
                <span className="score-icon">{q.icon}</span>
                <span className="score-label">
                  {q.key.charAt(0).toUpperCase() + q.key.slice(1)}
                </span>
                <div className="score-bar-track">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(responses[q.key] / 4) * 100}%` }}
                  />
                </div>
                <span className="score-num">{OPTIONS[responses[q.key]]?.label}</span>
              </div>
            ))}
          </div>
          <Link to="/dashboard" >
            <Button className="assessment-btn">
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-page">
      <div className="assessment-card">

        <header className="assessment-header">
          <p className="header-eyebrow">Mental Wellness</p>
          <h1 className="assessment-title">Quick Mental Health Check</h1>
          <p className="assessment-subtitle">Takes less than 2 minutes</p>

          <div className="progress-track" role="progressbar" aria-valuenow={answeredCount} aria-valuemax={QUESTIONS.length}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-label">{answeredCount} of {QUESTIONS.length} answered</p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="questions-list">
            {QUESTIONS.map((q, index) => (
              <div
                key={q.key}
                id={`question-${q.key}`}
                className={`question-block ${responses[q.key] !== null ? 'question-answered' : ''}`}
              >
                <div className="question-meta">
                  <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="question-icon">{q.icon}</span>
                </div>
                <p className="question-text">{q.text}</p>

                <div className="options-group" role="radiogroup" aria-label={q.text}>
                  {OPTIONS.map(opt => {
                    const selected = responses[q.key] === opt.value;
                    return (
                      <label key={opt.value} className={`option-label ${selected ? 'option-selected' : ''}`}>
                        <input
                          type="radio"
                          name={q.key}
                          value={opt.value}
                          checked={selected}
                          onChange={() => handleSelect(q.key, opt.value)}
                          className="option-radio"
                        />
                        <span className="option-text">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="form-error" role="alert">
              <span className="error-icon">!</span>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className={`btn-submit ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading
                ? <><span className="btn-spinner" />Submitting…</>
                : 'Submit Assessment'
              }
            </button>

          </div>
        </form>

      </div>
    </div>
  );
}

export default Assessment;