import { useState } from 'react';
import { api } from '../api';
import logoImg from '../assets/logo.jpg';

// Ventana de autenticación previa al sistema. Valida contra MySQL mediante
// /api/login. Único usuario válido: admin / 1234.
export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { username: user } = await api.login(username.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="np-login">
      <form className="np-login-card" onSubmit={submit}>
        <div className="np-login-brand">
          <img src={logoImg} alt="NodePilot" />
          <span className="np-wordmark">NodePilot</span>
        </div>
        <p className="np-login-sub">Inicia sesión para acceder al IDE</p>

        <label className="np-login-label">
          Usuario
          <input
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
        </label>

        <label className="np-login-label">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••"
          />
        </label>

        {error && <div className="np-login-error">{error}</div>}

        <button type="submit" className="np-login-btn" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Datos de la entrega visibles en pantalla (Proyecto Final IDPF-14) */}
      <footer className="np-login-meta">
        <div className="np-login-meta-title">
          Proyecto Final IDPF-14 · Grupo 4BM1
        </div>
        <div className="np-login-meta-sub">
          NodePilot — Aplicación Web Asistente de Codificación para Node.js con IA
        </div>
        <table className="np-login-meta-table">
          <thead>
            <tr>
              <th>Apellido Paterno</th>
              <th>Apellido Materno</th>
              <th>Nombres</th>
              <th>Boleta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rodriguez</td>
              <td>Flor</td>
              <td>Alan Noe</td>
              <td>2025630489</td>
            </tr>
            <tr>
              <td>Martinez</td>
              <td>Guzman</td>
              <td>Evelyn Briseth</td>
              <td>2025630417</td>
            </tr>
            <tr>
              <td>Castorela</td>
              <td>Cuevas</td>
              <td>Uriel</td>
              <td>2025630469</td>
            </tr>
          </tbody>
        </table>
      </footer>
    </div>
  );
}
