import { useState } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../Modal.jsx';
import { PRIORITIES, TYPES } from '../../utils/helpers.js';

export default function CreateTaskModal({ projectId, defaultColumn, members, sprints, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    assignee: '',
    sprint: '',
    storyPoints: '',
    column: defaultColumn || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        storyPoints: form.storyPoints === '' ? null : Number(form.storyPoints),
        assignee: form.assignee || null,
        sprint: form.sprint || null,
      };
      const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
      toast.success('Task created');
      onCreated(data.task);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Create Task"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={submit} disabled={busy || !form.title.trim()}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Title</label>
          <input value={form.title} onChange={set('title')} required autoFocus />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={set('description')} />
        </div>
        <div className="row">
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={set('type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Assignee</label>
            <select value={form.assignee} onChange={set('assignee')}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Points</label>
            <input type="number" min="0" value={form.storyPoints} onChange={set('storyPoints')} />
          </div>
        </div>
        <div className="field">
          <label>Sprint</label>
          <select value={form.sprint} onChange={set('sprint')}>
            <option value="">No sprint</option>
            {sprints.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
