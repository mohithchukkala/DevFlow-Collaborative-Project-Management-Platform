import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Developer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="logo">▦</span> DevFlow
        </div>
        <p className="muted">Create your account</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Full name</label>
            <input value={form.name} onChange={set('name')} required autoFocus />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} minLength={6} required />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={set('role')}>
              <option value="Developer">Developer</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn--primary btn--block" disabled={busy}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <div className="spacer" />
        <p className="center text-sm muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
