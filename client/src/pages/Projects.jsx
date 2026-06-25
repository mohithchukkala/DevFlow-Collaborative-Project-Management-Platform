import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';

export default function Projects() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '', members: [] });
  const [busy, setBusy] = useState(false);

  // Any authenticated user can create a project (they become its owner).
  const canCreate = true;

  const load = async () => {
    const { data } = await api.get('/projects');
    setProjects(data.projects);
    setLoading(false);
  };

  useEffect(() => {
    load();
    api.get('/users').then(({ data }) => setUsers(data.users));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, members: form.members.map((id) => ({ user: id, role: 'Developer' })) };
      await api.post('/projects', payload);
      toast.success('Project created');
      setShowCreate(false);
      setForm({ name: '', key: '', description: '', members: [] });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id],
    }));

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-head">
        <h1 style={{ margin: 0 }}>Projects</h1>
        {canCreate && (
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="panel empty">No projects yet.{canCreate && ' Create your first one!'}</div>
      ) : (
        <div className="grid grid--cards">
          {projects.map((p) => {
            const pct = p.taskCount ? Math.round((p.completedCount / p.taskCount) * 100) : 0;
            return (
              <Link to={`/projects/${p._id}`} key={p._id} className="card">
                <div className="card__body">
                  <div className="flex items-center justify-between">
                    <span className="chip">{p.key}</span>
                    <span className="badge badge--gray">{p.status}</span>
                  </div>
                  <h3 style={{ margin: '10px 0 4px' }}>{p.name}</h3>
                  <p className="muted text-sm" style={{ minHeight: 32 }}>
                    {p.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-sm muted">
                    <span>{p.members.length + 1} members</span>
                    <span>{p.completedCount}/{p.taskCount} done</span>
                  </div>
                  <div className="progress" style={{ marginTop: 6 }}>
                    <div className="progress__bar" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <Modal
          title="Create Project"
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={create} disabled={busy}>
                {busy ? 'Creating…' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={create}>
            <div className="row">
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div className="field" style={{ maxWidth: 130 }}>
                <label>Key</label>
                <input
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase().slice(0, 8) })}
                  placeholder="DEV"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Team members</label>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 6 }}>
                {users.filter((u) => u._id !== user._id).map((u) => (
                  <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', fontWeight: 500, padding: '4px 6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={form.members.includes(u._id)}
                      onChange={() => toggleMember(u._id)}
                    />
                    {u.name} <span className="muted text-sm">({u.role})</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
