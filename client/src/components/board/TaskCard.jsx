import { Draggable } from '@hello-pangea/dnd';
import Avatar from '../Avatar.jsx';
import { typeIcon, priorityClass } from '../../utils/helpers.js';

export default function TaskCard({ task, index, onOpen }) {
  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
          onClick={() => onOpen(task)}
        >
          {task.labels?.length > 0 && (
            <div className="task-card__labels">
              {task.labels.map((l) => (
                <span className="label-tag" key={l}>{l}</span>
              ))}
            </div>
          )}
          <div className="task-card__title">{task.title}</div>
          <div className="task-card__meta">
            <div className="task-card__left">
              <span className="type-icon" title={task.type}>{typeIcon(task.type)}</span>
              <span>{task.key}</span>
              <span className={priorityClass(task.priority)}>{task.priority}</span>
            </div>
            <div className="flex items-center gap-2">
              {task.storyPoints != null && <span className="chip">{task.storyPoints}</span>}
              <Avatar user={task.assignee} size="sm" />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
