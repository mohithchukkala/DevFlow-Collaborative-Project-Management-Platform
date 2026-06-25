import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/Loader.jsx';
import KanbanBoard from '../components/board/KanbanBoard.jsx';
import TaskModal from '../components/board/TaskModal.jsx';
import CreateTaskModal from '../components/board/CreateTaskModal.jsx';
import SprintsTab from '../components/board/SprintsTab.jsx';
import MilestonesTab from '../components/board/MilestonesTab.jsx';
import DocumentsTab from '../components/board/DocumentsTab.jsx';
import ActivityTab from '../components/board/ActivityTab.jsx';
import MembersModal from '../components/board/MembersModal.jsx';
import { PRIORITIES, TYPES } from '../utils/helpers.js';

const TABS = ['Board', 'Sprints', 'Milestones', 'Documents', 'Activity'];

export default function ProjectBoard() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [projectRole, setProjectRole] = useState('Developer');
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Board');

  const [openTaskId, setOpenTaskId] = useState(null);
  const [createColumn, setCreateColumn] = useState(undefined);
  const [showMembers, setShowMembers] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: '', assignee: '', priority: '', type: '', sprint: '' });

  const canManage = user.role === 'Admin' || projectRole === 'owner' || projectRole === 'Manager';

  const members = useMemo(() => {
    if (!project) return [];
    return [project.owner, ...project.members.map((m) => m.user)];
  }, [project]);

  const loadProject = useCallback(async () => {
    const { data } = await api.get(`/projects/${projectId}`);
    setProject(data.project);
    setProjectRole(data.projectRole);
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    const { data } = await api.get(`/projects/${projectId}/tasks`);
    setTasks(data.tasks);
  }, [projectId]);

  const loadSprints = useCallback(async () => {
    const { data } = await api.get(`/projects/${projectId}/sprints`);
    setSprints(data.sprints);
  }, [projectId]);

  const loadMilestones = useCallback(async () => {
    const { data } = await api.get(`/projects/${projectId}/milestones`);
    setMilestones(data.milestones);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProject(), loadTasks(), loadSprints(), loadMilestones()])
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Join the project's socket room and subscribe to live task events.
  useEffect(() => {
    const s = socket.current;
    if (!s) return undefined;
    s.emit('project:join', projectId);

    const upsert = (task) =>
      setTasks((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        return exists ? prev.map((t) => (t._id === task._id ? task : t)) : [...prev, task];
      });
    const onCreated = (task) => task.project === projectId && upsert(task);
    const onUpdated = (task) => upsert(task);
    const onMoved = (task) => upsert(task);
    const onDeleted = ({ _id }) => setTasks((prev) => prev.filter((t) => t._id !== _id));

    s.on('task:created', onCreated);
    s.on('task:updated', onUpdated);
    s.on('task:moved', onMoved);
    s.on('task:deleted', onDeleted);
    return () => {
      s.emit('project:leave', projectId);
      s.off('task:created', onCreated);
      s.off('task:updated', onUpdated);
      s.off('task:moved', onMoved);
      s.off('task:deleted', onDeleted);
    };
  }, [socket, projectId]);

  // Drag & drop: optimistic local reorder, then persist.
  const handleMove = async (taskId, destColumnId, destIndex) => {
    setTasks((prev) => {
      const moving = prev.find((t) => t._id === taskId);
      if (!moving) return prev;
      const rest = prev.filter((t) => t._id !== taskId);
      const dest = rest
        .filter((t) => String(t.column) === String(destColumnId))
        .sort((a, b) => a.order - b.order);
      dest.splice(destIndex, 0, { ...moving, column: destColumnId });
      const reindexed = dest.map((t, i) => ({ ...t, order: i }));
      const others = rest.filter((t) => String(t.column) !== String(destColumnId));
      return [...others, ...reindexed];
    });
    try {
      await api.patch(`/tasks/${taskId}/move`, { column: destColumnId, order: destIndex });
    } catch (err) {
      toast.error(err.message);
      loadTasks();
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
      }
      if (filters.assignee) {
        if (filters.assignee === 'none' && t.assignee) return false;
        if (filters.assignee !== 'none' && t.assignee?._id !== filters.assignee) return false;
      }
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.type && t.type !== filters.type) return false;
      if (filters.sprint) {
        if (filters.sprint === 'none' && t.sprint) return false;
        if (filters.sprint !== 'none' && t.sprint?._id !== filters.sprint) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  if (loading || !project) return <Loader />;

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/projects" className="text-sm muted">← Projects</Link>
          <h1 style={{ margin: '4px 0 0' }}>
            <span className="chip" style={{ marginRight: 8 }}>{project.key}</span>
            {project.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setShowMembers(true)}>👥 Members ({members.length})</button>
          <Link className="btn" to={`/projects/${projectId}/analytics`}>📊 Analytics</Link>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </div>
        ))}
      </div>

      {tab === 'Board' && (
        <>
          <div className="toolbar">
            <input
              placeholder="🔍 Search tasks…"
              value={filters.search}
              onChange={setF('search')}
              style={{ minWidth: 200 }}
            />
            <select value={filters.assignee} onChange={setF('assignee')}>
              <option value="">All assignees</option>
              <option value="none">Unassigned</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <select value={filters.priority} onChange={setF('priority')}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.type} onChange={setF('type')}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filters.sprint} onChange={setF('sprint')}>
              <option value="">All sprints</option>
              <option value="none">No sprint</option>
              {sprints.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn--primary" onClick={() => setCreateColumn(null)}>+ Add Task</button>
          </div>

          <KanbanBoard
            columns={project.columns}
            tasks={filteredTasks}
            onMove={handleMove}
            onOpenTask={(t) => setOpenTaskId(t._id)}
            onAddTask={(colId) => setCreateColumn(colId)}
          />
        </>
      )}

      {tab === 'Sprints' && (
        <SprintsTab projectId={projectId} sprints={sprints} canManage={canManage} onChange={() => { loadSprints(); loadTasks(); }} />
      )}
      {tab === 'Milestones' && (
        <MilestonesTab projectId={projectId} milestones={milestones} canManage={canManage} onChange={() => { loadMilestones(); loadTasks(); }} />
      )}
      {tab === 'Documents' && <DocumentsTab projectId={projectId} />}
      {tab === 'Activity' && <ActivityTab projectId={projectId} />}

      {openTaskId && (
        <TaskModal
          taskId={openTaskId}
          project={project}
          members={members}
          sprints={sprints}
          milestones={milestones}
          onClose={() => setOpenTaskId(null)}
          onChanged={loadTasks}
        />
      )}

      {createColumn !== undefined && (
        <CreateTaskModal
          projectId={projectId}
          defaultColumn={createColumn}
          members={members}
          sprints={sprints}
          onClose={() => setCreateColumn(undefined)}
          onCreated={() => loadTasks()}
        />
      )}

      {showMembers && (
        <MembersModal
          project={project}
          canManage={canManage}
          onClose={() => setShowMembers(false)}
          onChange={loadProject}
        />
      )}
    </div>
  );
}
