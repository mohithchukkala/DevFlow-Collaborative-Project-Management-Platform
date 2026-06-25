import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fill = (em) => {
    setEmail(em);
    setPassword('password123');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="logo">▦</span> DevFlow
        </div>
        <p className="muted">Sign in to your workspace</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="spacer" />
        <p className="center text-sm muted">
          No account? <Link to="/register">Create one</Link>
        </p>
        <div className="divider" />
        <p className="text-sm muted center">Demo accounts (password123):</p>
        <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn--sm" onClick={() => fill('admin@devflow.test')}>Admin</button>
          <button type="button" className="btn btn--sm" onClick={() => fill('manager@devflow.test')}>Manager</button>
          <button type="button" className="btn btn--sm" onClick={() => fill('dev1@devflow.test')}>Developer</button>
        </div>
      </div>
    </div>
  );
}
