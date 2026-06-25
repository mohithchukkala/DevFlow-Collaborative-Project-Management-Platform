import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard.jsx';

// Renders columns from the project definition and groups tasks under each.
// Calls onMove(taskId, destColumnId, destIndex) after a drag completes.
export default function KanbanBoard({ columns, tasks, onMove, onOpenTask, onAddTask }) {
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const tasksFor = (columnId) =>
    tasks
      .filter((t) => String(t.column) === String(columnId))
      .sort((a, b) => a.order - b.order);

  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    onMove(draggableId, destination.droppableId, destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="board">
        {sortedColumns.map((col) => {
          const colTasks = tasksFor(col._id);
          return (
            <div className="column" key={col._id}>
              <div className="column__head">
                <span>{col.name}</span>
                <span className="column__count">{colTasks.length}</span>
              </div>
              <Droppable droppableId={String(col._id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column__list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {colTasks.map((task, i) => (
                      <TaskCard key={task._id} task={task} index={i} onOpen={onOpenTask} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button className="btn btn--ghost btn--sm column__add" onClick={() => onAddTask(col._id)}>
                + Add task
              </button>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
