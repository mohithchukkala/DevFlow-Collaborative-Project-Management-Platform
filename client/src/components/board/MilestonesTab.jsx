import { useState } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../utils/helpers.js';

export default function MilestonesTab({ projectId, milestones, canManage, onChange }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post(`/projects/${projectId}/milestones`, { title, dueDate: dueDate || null });
      setTitle('');
      setDueDate('');
      toast.success('Milestone created');
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggle = async (m) => {
    await api.put(`/milestones/${m._id}`, { status: m.status === 'completed' ? 'open' : 'completed' });
    onChange();
  };

  const remove = async (m) => {
    if (!confirm(`Delete milestone "${m.title}"?`)) return;
    await api.delete(`/milestones/${m._id}`);
    onChange();
  };

  return (
    <div>
      {canManage && (
        <form className="panel" onSubmit={create} style={{ marginBottom: 16 }}>
          <div className="row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>New milestone</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="v1.0 Release" />
            </div>
            <div className="field" style={{ marginBottom: 0, maxWidth: 180 }}>
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn--primary">Add</button>
            </div>
          </div>
        </form>
      )}

      {milestones.length === 0 ? (
        <div className="panel empty">No milestones yet.</div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          {milestones.map((m) => {
            const pct = m.taskCount ? Math.round((m.completedCount / m.taskCount) * 100) : 0;
            return (
              <div className="list-item" key={m._id}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={m.status === 'completed'}
                  disabled={!canManage}
                  onChange={() => toggle(m)}
                />
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2">
                    <strong style={{ textDecoration: m.status === 'completed' ? 'line-through' : 'none' }}>{m.title}</strong>
                    {m.dueDate && <span className="chip">due {formatDate(m.dueDate)}</span>}
                  </div>
                  <div className="text-sm muted">{m.completedCount}/{m.taskCount} tasks ({pct}%)</div>
                </div>
                {canManage && <button className="btn btn--ghost btn--sm" onClick={() => remove(m)}>Delete</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
