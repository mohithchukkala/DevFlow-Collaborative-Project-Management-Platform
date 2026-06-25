import { initials } from '../utils/helpers.js';

export default function Avatar({ user, size }) {
  const cls = `avatar${size ? ` avatar--${size}` : ''}`;
  if (!user) return <span className={cls} title="Unassigned">·</span>;
  return (
    <span className={cls} title={user.name}>
      {user.avatar ? <img src={user.avatar} alt={user.name} /> : initials(user.name)}
    </span>
  );
}
