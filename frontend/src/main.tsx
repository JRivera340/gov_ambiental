import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
// Import Leaflet CSS at the top level
import 'leaflet/dist/leaflet.css';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Algo salió mal</h1>
          <p>Por favor, recarga la página.</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
          {this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>Detalles del error</summary>
              <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento root');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error al inicializar la aplicación:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>Error al cargar la aplicación</h1>
      <p>Por favor, recarga la página.</p>
      <button onclick="window.location.reload()">Recargar</button>
    </div>
  `;
}

