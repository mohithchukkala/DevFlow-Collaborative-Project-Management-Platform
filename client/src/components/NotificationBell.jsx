import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useSocket } from '../context/SocketContext.jsx';
import { fromNow } from '../utils/helpers.js';

export default function NotificationBell() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setItems(data.notifications);
    setUnread(data.unread);
  };

  useEffect(() => {
    load();
  }, []);

  // Live notifications pushed to this user's socket room.
  useEffect(() => {
    const s = socket.current;
    if (!s) return undefined;
    const onNew = (n) => {
      setItems((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
    };
    s.on('notification:new', onNew);
    return () => s.off('notification:new', onNew);
  }, [socket]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const openNotif = async (n) => {
    if (!n.read) {
      await api.patch(`/notifications/${n._id}/read`);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.project) navigate(`/projects/${n.project}`);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="bell__dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown__head">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 && <div className="empty">You're all caught up 🎉</div>}
          {items.map((n) => (
            <div
              key={n._id}
              className={`notif ${n.read ? '' : 'unread'}`}
              onClick={() => openNotif(n)}
            >
              <div style={{ flex: 1 }}>
                <div>{n.message}</div>
                <div className="muted text-sm">{fromNow(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
