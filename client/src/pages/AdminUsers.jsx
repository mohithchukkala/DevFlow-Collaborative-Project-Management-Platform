import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/Loader.jsx';
import Avatar from '../components/Avatar.jsx';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await api.get('/users', { params: search ? { search } : {} });
    setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const changeRole = async (id, role) => {
    try {
      await api.put(`/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role } : u)));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success('User removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-head">
        <h1 style={{ margin: 0 }}>Users</h1>
        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          className="flex gap-2"
        >
          <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Search</button>
        </form>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr><th>User</th><th>Email</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar user={u} size="sm" /> {u.name}
                  </div>
                </td>
                <td className="muted">{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    style={{ width: 'auto' }}
                    disabled={u._id === me._id}
                    onChange={(e) => changeRole(u._id, e.target.value)}
                  >
                    <option value="Developer">Developer</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td>
                  {u._id !== me._id && (
                    <button className="btn btn--ghost btn--sm" onClick={() => remove(u._id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
