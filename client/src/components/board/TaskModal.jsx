import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../Modal.jsx';
import Avatar from '../Avatar.jsx';
import { PRIORITIES, TYPES, fromNow } from '../../utils/helpers.js';

export default function TaskModal({ taskId, project, members, sprints, milestones, onClose, onChanged }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      api.get(`/tasks/${taskId}`),
      api.get(`/tasks/${taskId}/comments`),
    ]);
    setTask(t.task);
    setComments(c.comments);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Live comment updates for this task.
  useEffect(() => {
    const s = socket.current;
    if (!s) return undefined;
    const onAdded = ({ taskId: tid, comment }) => {
      if (tid === taskId) setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]));
    };
    const onDeleted = ({ taskId: tid, commentId }) => {
      if (tid === taskId) setComments((prev) => prev.filter((c) => c._id !== commentId));
    };
    s.on('comment:added', onAdded);
    s.on('comment:deleted', onDeleted);
    return () => {
      s.off('comment:added', onAdded);
      s.off('comment:deleted', onDeleted);
    };
  }, [socket, taskId]);

  const patch = async (fields) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/tasks/${taskId}`, fields);
      setTask(data.task);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    const { data } = await api.post(`/tasks/${taskId}/comments`, { body });
    setComments((prev) => (prev.some((c) => c._id === data.comment._id) ? prev : [...prev, data.comment]));
    setBody('');
  };

  const deleteComment = async (id) => {
    await api.delete(`/comments/${id}`);
    setComments((prev) => prev.filter((c) => c._id !== id));
  };

  const removeTask = async () => {
    if (!confirm('Delete this task permanently?')) return;
    await api.delete(`/tasks/${taskId}`);
    toast.success('Task deleted');
    onChanged?.();
    onClose();
  };

  const uploadFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    try {
      const { data } = await api.post(`/tasks/${taskId}/attachments`, fd);
      setTask(data.task);
      toast.success('File(s) attached');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeAttachment = async (attId) => {
    const { data } = await api.delete(`/tasks/${taskId}/attachments/${attId}`);
    setTask(data.task);
  };

  if (!task) return null;

  return (
    <Modal title={`${task.key}`} onClose={onClose}>
      <div className="field">
        <input
          style={{ fontSize: 18, fontWeight: 700 }}
          defaultValue={task.title}
          onBlur={(e) => e.target.value !== task.title && patch({ title: e.target.value })}
        />
      </div>

      <div className="row">
        <div className="field">
          <label>Status / Type</label>
          <select value={task.type} onChange={(e) => patch({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Priority</label>
          <select value={task.priority} onChange={(e) => patch({ priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Assignee</label>
          <select value={task.assignee?._id || ''} onChange={(e) => patch({ assignee: e.target.value })}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Story points</label>
          <input
            type="number"
            min="0"
            defaultValue={task.storyPoints ?? ''}
            onBlur={(e) => patch({ storyPoints: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Sprint</label>
          <select value={task.sprint?._id || ''} onChange={(e) => patch({ sprint: e.target.value })}>
            <option value="">No sprint</option>
            {sprints.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Milestone</label>
          <select value={task.milestone?._id || ''} onChange={(e) => patch({ milestone: e.target.value })}>
            <option value="">No milestone</option>
            {milestones.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Due date</label>
        <input
          type="date"
          defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
          onBlur={(e) => patch({ dueDate: e.target.value || null })}
        />
      </div>

      <div className="field">
        <label>Labels (comma separated)</label>
        <input
          defaultValue={(task.labels || []).join(', ')}
          onBlur={(e) => patch({ labels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </div>

      <div className="field">
        <label>Description</label>
        <textarea
          rows={4}
          defaultValue={task.description}
          onBlur={(e) => e.target.value !== task.description && patch({ description: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Attachments</label>
        {task.attachments?.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {task.attachments.map((a) => (
              <div className="flex items-center justify-between" key={a._id} style={{ padding: '4px 0' }}>
                <a href={a.url} target="_blank" rel="noreferrer">📎 {a.filename}</a>
                <button className="btn btn--ghost btn--sm" onClick={() => removeAttachment(a._id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <input type="file" multiple onChange={uploadFiles} />
      </div>

      <div className="divider" />

      <h4>Comments</h4>
      <div>
        {comments.length === 0 && <p className="muted text-sm">No comments yet.</p>}
        {comments.map((c) => (
          <div className="flex gap-2" key={c._id} style={{ marginBottom: 12 }}>
            <Avatar user={c.author} size="sm" />
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2">
                <strong className="text-sm">{c.author?.name}</strong>
                <span className="muted text-sm">{fromNow(c.createdAt)}{c.edited ? ' (edited)' : ''}</span>
                {c.author?._id === user._id && (
                  <button className="btn btn--ghost btn--sm" onClick={() => deleteComment(c._id)}>Delete</button>
                )}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addComment} className="flex gap-2" style={{ marginTop: 10 }}>
        <input
          placeholder="Write a comment… use @email to mention"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn btn--primary" disabled={!body.trim()}>Send</button>
      </form>

      <div className="divider" />
      <div className="flex justify-between items-center">
        <span className="muted text-sm">Reporter: {task.reporter?.name}</span>
        <button className="btn btn--danger btn--sm" onClick={removeTask} disabled={saving}>Delete task</button>
      </div>
    </Modal>
  );
}
