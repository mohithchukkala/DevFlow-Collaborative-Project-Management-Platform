import { useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, title: user.title || '', password: '' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name: form.name, title: form.title };
      if (form.password) payload.password = form.password;
      await updateProfile(payload);
      setForm((f) => ({ ...f, password: '' }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd);
      await updateProfile({ avatar: data.file.url });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1>Profile</h1>
      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
          <Avatar user={user} size="lg" />
          <div>
            <h3 style={{ margin: 0 }}>{user.name}</h3>
            <div className="muted">{user.email} · <span className="badge badge--gray">{user.role}</span></div>
            <label className="btn btn--sm" style={{ marginTop: 8, textTransform: 'none', letterSpacing: 0 }}>
              {uploading ? 'Uploading…' : 'Change avatar'}
              <input type="file" accept="image/*" hidden onChange={uploadAvatar} />
            </label>
          </div>
        </div>

        <form onSubmit={save}>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Frontend Engineer" />
          </div>
          <div className="field">
            <label>New password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Leave blank to keep current" />
          </div>
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
}
