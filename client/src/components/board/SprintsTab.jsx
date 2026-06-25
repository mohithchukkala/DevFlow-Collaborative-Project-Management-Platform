import { useState } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate } from '../../utils/helpers.js';

export default function SprintsTab({ projectId, sprints, canManage, onChange }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post(`/projects/${projectId}/sprints`, { name, goal });
      setName('');
      setGoal('');
      toast.success('Sprint created');
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setStatus = async (sprint, status) => {
    await api.put(`/sprints/${sprint._id}`, { status });
    toast.success(`Sprint ${status}`);
    onChange();
  };

  const remove = async (sprint) => {
    if (!confirm(`Delete sprint "${sprint.name}"? Tasks will be moved to backlog.`)) return;
    await api.delete(`/sprints/${sprint._id}`);
    onChange();
  };

  return (
    <div>
      {canManage && (
        <form className="panel" onSubmit={create} style={{ marginBottom: 16 }}>
          <div className="row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>New sprint name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 2" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Goal</label>
              <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What are we shipping?" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn--primary">Add Sprint</button>
            </div>
          </div>
        </form>
      )}

      {sprints.length === 0 ? (
        <div className="panel empty">No sprints yet.</div>
      ) : (
        <div className="grid grid--cards">
          {sprints.map((s) => {
            const pct = s.totalPoints ? Math.round((s.donePoints / s.totalPoints) * 100) : (s.taskCount ? Math.round((s.completedCount / s.taskCount) * 100) : 0);
            return (
              <div className="panel" key={s._id}>
                <div className="flex items-center justify-between">
                  <h3 style={{ margin: 0 }}>{s.name}</h3>
                  <span className={`badge ${s.status === 'active' ? 'badge--low' : s.status === 'completed' ? 'badge--gray' : 'badge--medium'}`}>
                    {s.status}
                  </span>
                </div>
                <p className="muted text-sm">{s.goal || 'No goal set'}</p>
                <div className="text-sm muted">
                  {s.completedCount}/{s.taskCount} tasks · {s.donePoints}/{s.totalPoints} pts
                </div>
                <div className="progress" style={{ marginTop: 6 }}>
                  <div className="progress__bar" style={{ width: `${pct}%` }} />
                </div>
                {(s.startDate || s.endDate) && (
                  <div className="text-sm muted" style={{ marginTop: 6 }}>
                    {formatDate(s.startDate)} → {formatDate(s.endDate)}
                  </div>
                )}
                {canManage && (
                  <div className="flex gap-2" style={{ marginTop: 10 }}>
                    {s.status !== 'active' && <button className="btn btn--sm" onClick={() => setStatus(s, 'active')}>Start</button>}
                    {s.status === 'active' && <button className="btn btn--sm" onClick={() => setStatus(s, 'completed')}>Complete</button>}
                    <button className="btn btn--ghost btn--sm" onClick={() => remove(s)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
