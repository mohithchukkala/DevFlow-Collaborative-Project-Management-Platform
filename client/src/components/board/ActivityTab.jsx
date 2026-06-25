import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useSocket } from '../../context/SocketContext.jsx';
import Avatar from '../Avatar.jsx';
import { fromNow } from '../../utils/helpers.js';

export default function ActivityTab({ projectId }) {
  const { socket } = useSocket();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get(`/projects/${projectId}/activity`).then(({ data }) => setItems(data.activity));
  }, [projectId]);

  // Live activity feed.
  useEffect(() => {
    const s = socket.current;
    if (!s) return undefined;
    const onNew = (a) => setItems((prev) => [a, ...prev].slice(0, 200));
    s.on('activity:new', onNew);
    return () => s.off('activity:new', onNew);
  }, [socket]);

  return (
    <div className="panel" style={{ padding: 0 }}>
      {items.length === 0 && <div className="empty">No activity yet.</div>}
      {items.map((a) => (
        <div className="list-item" key={a._id}>
          <Avatar user={a.actor} size="sm" />
          <div style={{ flex: 1 }}>
            <span><strong>{a.actor?.name}</strong> {a.message}</span>
            <div className="text-sm muted">{fromNow(a.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
