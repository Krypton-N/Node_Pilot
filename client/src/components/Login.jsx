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
    </div>
  );
}
