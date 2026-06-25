import Notification from '../models/Notification.js';
import { emitToUser } from '../socket/io.js';

// Creates a notification and pushes it to the recipient over their socket room.
// Skips self-notifications (when actor === recipient).
export const notify = async ({ recipient, actor, type, message, project = null, task = null }) => {
  if (!recipient) return null;
  if (actor && String(recipient) === String(actor)) return null;

  const notification = await Notification.create({
    recipient,
    actor,
    type,
    message,
    project,
    task,
  });
  const populated = await notification.populate('actor', 'name email avatar');
  emitToUser(recipient, 'notification:new', populated);
  return populated;
};

export const notifyMany = async (recipients = [], payload) => {
  const unique = [...new Set(recipients.map(String))];
  return Promise.all(unique.map((recipient) => notify({ ...payload, recipient })));
};
