import React, { useState } from 'react';
import { ArrowRight, Sparkles, Layers, RotateCcw } from 'lucide-react';
import { askVehicleIntelligence, buildVehicleContext } from '../services/vehicleIntelligenceService';

const SUGGESTED_QUERIES = [
  'What has been replaced?',
  'How much have I spent?',
  'Show me the tyre history',
  'What happened recently?'
];

export function AskCarma({
  vehicle,
  records = [],
  componentsList = [],
  onInspectComponent
}) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleAsk = async (questionToAsk) => {
    const activeQuery = (questionToAsk || query).trim();
    if (!activeQuery || isLoading) return;

    setQuery(activeQuery);
    setIsLoading(true);
    setError(null);

    try {
      const context = buildVehicleContext(vehicle, records, componentsList, vehicle?.documents);
      const res = await askVehicleIntelligence(activeQuery, context);
      setResult(res);
    } catch (err) {
      console.warn('[Ask CARMA] Query error:', err);
      setError("CARMA couldn't analyze the records right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAsk(query);
  };

  return (
    <div className="ask-carma-container" aria-label="Ask CARMA Vehicle Intelligence">
      <div className="ask-carma-header">
        <span className="ask-carma-badge">VEHICLE INTELLIGENCE</span>
        <h3 className="ask-carma-title">Ask CARMA</h3>
        <p className="ask-carma-subtitle">
          Query your documented vehicle history, part replacements, service expenses, and component status.
        </p>
      </div>

      {/* Query Input Bar */}
      <form onSubmit={handleSubmit} className="ask-carma-form">
        <input
          type="text"
          className="ask-carma-input"
          placeholder="Ask something about your documented vehicle history..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn-ask-carma"
          disabled={!query.trim() || isLoading}
          title="Ask CARMA"
        >
          <span>Ask CARMA</span>
          <ArrowRight size={13} />
        </button>
      </form>

      {/* Suggested Prompt Chips */}
      <div className="ask-carma-chips">
        <span className="chips-label">Suggestions:</span>
        <div className="chips-row">
          {SUGGESTED_QUERIES.map((suggested, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-btn"
              onClick={() => handleAsk(suggested)}
              disabled={isLoading}
            >
              {suggested}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="ask-carma-loading-state" role="status" aria-live="polite">
          <div className="loading-dot-pulse" />
          <span>CARMA is reviewing your documented history…</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="ask-carma-error-card" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn-ask-retry"
            onClick={() => handleAsk(query)}
          >
            <RotateCcw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Result Card */}
      {result && !isLoading && (
        <div className="ask-carma-answer-card" aria-live="polite">
          <div className="answer-header">
            <span className="answer-brand-tag">CARMA</span>
          </div>
          <p className="answer-text">{result.answer}</p>

          {/* Component Link (3D Navigation Connection) */}
          {result.referencedComponentId && (
            <div className="answer-component-footer">
              <button
                type="button"
                className="btn-answer-inspect"
                onClick={() => onInspectComponent && onInspectComponent(result.referencedComponentId)}
                title={`Inspect ${result.referencedComponentName || 'component'} in 3D`}
              >
                <Layers size={13} />
                <span>
                  Inspect {result.referencedComponentName ? result.referencedComponentName : 'component'} in 3D →
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AskCarma;
