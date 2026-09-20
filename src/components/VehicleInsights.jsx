import React from 'react';
import { Activity, IndianRupee, Layers, Clock } from 'lucide-react';

/**
 * Format ISO date string 'YYYY-MM-DD' to 'DD Mon YYYY'
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthName = months[parseInt(month, 10) - 1] || month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
}

export function VehicleInsights({ records = [], componentsList = [] }) {
  // 1. Deterministic Metrics
  const totalEvents = records.length;
  const totalSpend = records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  // Components with at least 1 documented service record
  const componentsWithHistory = componentsList.filter(
    (c) => Array.isArray(c.records) && c.records.length > 0
  ).length;

  // Most recent service activity
  const recentEvent = records.length > 0 ? records[0] : null;

  if (totalEvents === 0) {
    return (
      <div className="insights-empty-card">
        <span className="insights-empty-text">No documented service activity yet.</span>
      </div>
    );
  }

  return (
    <div className="vehicle-insights-grid" aria-label="Vehicle Insights Summary">
      {/* Metric 1: Documented Activity */}
      <div className="insight-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">DOCUMENTED ACTIVITY</span>
          <Activity size={13} className="stat-card-icon" />
        </div>
        <div className="stat-card-value">
          {totalEvents} {totalEvents === 1 ? 'event' : 'service events'}
        </div>
      </div>

      {/* Metric 2: Documented Spend */}
      <div className="insight-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">DOCUMENTED SPEND</span>
          <IndianRupee size={13} className="stat-card-icon" />
        </div>
        <div className="stat-card-value">
          ₹{totalSpend.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Metric 3: Components with History */}
      <div className="insight-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">COMPONENTS WITH HISTORY</span>
          <Layers size={13} className="stat-card-icon" />
        </div>
        <div className="stat-card-value">
          {componentsWithHistory}
        </div>
      </div>

      {/* Metric 4: Recent Activity */}
      <div className="insight-stat-card insight-stat-recent">
        <div className="stat-card-header">
          <span className="stat-card-label">RECENT ACTIVITY</span>
          <Clock size={13} className="stat-card-icon" />
        </div>
        <div className="stat-card-value stat-recent-val">
          {recentEvent ? (
            <span title={`${recentEvent.componentDisplayName} · ${recentEvent.type} · ${formatDate(recentEvent.date)}`}>
              {recentEvent.componentDisplayName} · {recentEvent.type} · {formatDate(recentEvent.date)}
            </span>
          ) : (
            'None'
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleInsights;
