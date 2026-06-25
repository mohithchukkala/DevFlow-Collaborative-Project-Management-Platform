import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api from '../api/client.js';
import Loader from '../components/Loader.jsx';
import { CHART_COLORS } from '../utils/helpers.js';

export default function Analytics() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${projectId}/analytics`),
      api.get(`/projects/${projectId}`),
    ])
      .then(([a, p]) => {
        setData(a.data.analytics);
        setProject(p.data.project);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading || !data) return <Loader />;
  const { summary, tasksByColumn, tasksByPriority, tasksByType, productivity, completionTrend } = data;

  const stats = [
    { label: 'Total Tasks', value: summary.totalTasks },
    { label: 'Completed', value: summary.completedTasks },
    { label: 'Completion', value: `${summary.completionRate}%` },
    { label: 'Points Done', value: `${summary.completedPoints}/${summary.totalPoints}` },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to={`/projects/${projectId}`} className="text-sm muted">← Back to board</Link>
          <h1 style={{ margin: '4px 0 0' }}>{project?.name} · Analytics</h1>
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
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="panel">
          <h3>Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tasksByColumn}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="column" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>By Priority</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={tasksByPriority} dataKey="count" nameKey="priority" outerRadius={90} label>
                {tasksByPriority.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>By Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={tasksByType} dataKey="count" nameKey="type" innerRadius={50} outerRadius={90} label>
                {tasksByType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>Team Productivity</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productivity} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="user" width={90} fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" stackId="a" fill="#16a34a" name="Completed" radius={[0, 0, 0, 0]} />
              <Bar dataKey="total" stackId="b" fill="#c7d2fe" name="Total" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={{ gridColumn: '1 / -1' }}>
          <h3>Completion Trend</h3>
          {completionTrend.length === 0 ? (
            <div className="empty">No completed tasks yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
