import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../Modal.jsx';
import Avatar from '../Avatar.jsx';

export default function MembersModal({ project, canManage, onClose, onChange }) {
  const toast = useToast();
  const [allUsers, setAllUsers] = useState([]);
  const [addId, setAddId] = useState('');

  useEffect(() => {
    api.get('/users').then(({ data }) => setAllUsers(data.users));
  }, []);

  const memberIds = new Set([project.owner._id, ...project.members.map((m) => m.user._id)]);
  const candidates = allUsers.filter((u) => !memberIds.has(u._id));

  const add = async () => {
    if (!addId) return;
    try {
      await api.post(`/projects/${project._id}/members`, { userId: addId, role: 'Developer' });
      setAddId('');
      toast.success('Member added');
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const changeRole = async (userId, role) => {
    await api.put(`/projects/${project._id}/members/${userId}`, { role });
    onChange();
  };

  const remove = async (userId) => {
    await api.delete(`/projects/${project._id}/members/${userId}`);
    onChange();
  };

  return (
    <Modal title="Team Members" onClose={onClose}>
      <div className="list-item">
        <Avatar user={project.owner} />
        <div style={{ flex: 1 }}>
          <strong>{project.owner.name}</strong>
          <div className="text-sm muted">{project.owner.email}</div>
        </div>
        <span className="badge badge--low">Owner</span>
      </div>

      {project.members.map((m) => (
        <div className="list-item" key={m.user._id}>
          <Avatar user={m.user} />
          <div style={{ flex: 1 }}>
            <strong>{m.user.name}</strong>
            <div className="text-sm muted">{m.user.email}</div>
          </div>
          {canManage ? (
            <>
              <select
                value={m.role}
                style={{ width: 'auto' }}
                onChange={(e) => changeRole(m.user._id, e.target.value)}
              >
                <option value="Developer">Developer</option>
                <option value="Manager">Manager</option>
              </select>
              <button className="btn btn--ghost btn--sm" onClick={() => remove(m.user._id)}>Remove</button>
            </>
          ) : (
            <span className="badge badge--gray">{m.role}</span>
          )}
        </div>
      ))}

      {canManage && (
        <>
          <div className="divider" />
          <label>Add member</label>
          <div className="flex gap-2">
            <select value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">Select a user…</option>
              {candidates.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <button className="btn btn--primary" onClick={add} disabled={!addId}>Add</button>
          </div>
        </>
      )}
    </Modal>
  );
}
