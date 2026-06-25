import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/analytics/overview'), api.get('/projects')])
      .then(([o, p]) => {
        setOverview(o.data.overview);
        setProjects(p.data.projects);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const stats = [
    { label: 'Projects', value: overview.projectCount },
    { label: 'Total Tasks', value: overview.totalTasks },
    { label: 'Completed', value: overview.completedTasks },
    { label: 'My Open Tasks', value: overview.myOpenTasks },
    { label: 'Active Sprints', value: overview.activeSprints },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>Welcome back, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted" style={{ margin: 0 }}>Here's what's happening across your workspace.</p>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__value">{s.value}</div>
            <div className="stat__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <div className="page-head">
        <h2 style={{ margin: 0 }}>Your Projects</h2>
        <Link to="/projects" className="btn btn--sm">View all</Link>
      </div>

      {projects.length === 0 ? (
        <div className="panel empty">No projects yet. Head to Projects to create one.</div>
      ) : (
        <div className="grid grid--cards">
          {projects.slice(0, 6).map((p) => {
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
                    <span>{p.completedCount}/{p.taskCount} tasks</span>
                    <span>{pct}%</span>
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
    </div>
  );
}
