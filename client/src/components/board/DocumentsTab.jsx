import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { fromNow } from '../../utils/helpers.js';

export default function DocumentsTab({ projectId }) {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });

  const load = async () => {
    const { data } = await api.get(`/projects/${projectId}/documents`);
    setDocs(data.documents);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const openDoc = (d) => {
    setActive(d._id);
    setDraft({ title: d.title, content: d.content });
  };

  const newDoc = () => {
    setActive('new');
    setDraft({ title: '', content: '' });
  };

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Title required');
    try {
      if (active === 'new') {
        await api.post(`/projects/${projectId}/documents`, draft);
      } else {
        await api.put(`/documents/${active}`, draft);
      }
      toast.success('Saved');
      setActive(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (d) => {
    if (!confirm(`Delete document "${d.title}"?`)) return;
    await api.delete(`/documents/${d._id}`);
    if (active === d._id) setActive(null);
    load();
  };

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="panel" style={{ maxWidth: 280, padding: 0 }}>
        <div className="flex items-center justify-between" style={{ padding: '12px 14px' }}>
          <strong>Documents</strong>
          <button className="btn btn--sm btn--primary" onClick={newDoc}>+ New</button>
        </div>
        {docs.length === 0 && <p className="muted text-sm" style={{ padding: '0 14px 14px' }}>No documents.</p>}
        {docs.map((d) => (
          <div
            key={d._id}
            className="list-item"
            style={{ cursor: 'pointer', background: active === d._id ? 'var(--surface-2)' : 'transparent' }}
            onClick={() => openDoc(d)}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{d.title}</div>
              <div className="text-sm muted">edited {fromNow(d.updatedAt)}</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); remove(d); }}>🗑</button>
          </div>
        ))}
      </div>

      <div className="panel" style={{ flex: 2 }}>
        {active === null ? (
          <div className="empty">Select or create a document.</div>
        ) : (
          <>
            <div className="field">
              <label>Title</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Content (markdown)</label>
              <textarea rows={14} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn btn--primary" onClick={save}>Save</button>
              <button className="btn" onClick={() => setActive(null)}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
