import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('💥 [CRASH CAUGHT IN ERROR BOUNDARY]:', error, errorInfo);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ef4444', background: '#1e293b', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>💥 Application Crashed!</h2>
          <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, color: '#f87171', marginBottom: 16 }}>
            <strong>{this.state.error.toString()}</strong>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#94a3b8' }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

