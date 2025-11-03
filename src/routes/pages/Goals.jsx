import React from "react";
import { GoalsApi } from "../../api/goalsApi";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal.jsx";
import { Modal } from "../../components/Modal.jsx";

function Tabs({ value, onChange }) {
  const items = [
    { key: "active", label: "Active Goals" },
    { key: "history", label: "Goal History" },
    { key: "notes", label: "Notes" },
  ];
  return (
    <div role="tablist" aria-label="Goals navigation" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          role="tab"
          aria-selected={value === t.key}
          style={{
            padding: "8px 16px",
            border: "none",
            background: "transparent",
            color: value === t.key ? "var(--primary)" : "var(--muted)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: value === t.key ? 600 : 400,
            borderBottom: value === t.key ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Empty({ title, action, onAction }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p style={{ color: "var(--muted)", marginBottom: 12 }}>{title}</p>
      {action && (
        <button className="btn primary" onClick={onAction}>{action}</button>
      )}
    </div>
  );
}

function GoalItem({ goal, onUpdate, onDelete, onEdit }) {
  const statusColor = {
    "on track": "success",
    completed: "secondary",
    paused: "warning",
    archived: "outline",
  }[String(goal.status || "on track").toLowerCase()] || "secondary";

  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600 }}>{goal.title}</div>
        {goal.description && (
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{goal.description}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {(() => {
          const current = String(goal.status || 'on track').toLowerCase();
          const all = ["on track", "completed", "paused", "archived"];
          const ordered = [current, ...all.filter(s => s !== current)];
          return (
            <select
              value={current}
              onChange={(e) => onUpdate(goal, { status: e.target.value })}
              style={{ height: 32, minWidth: 160 }}
              aria-label="Change status"
            >
              {ordered.map((s) => (
                <option key={s} value={s}>{s.replace(/^\w/, c => c.toUpperCase())}</option>
              ))}
            </select>
          );
        })()}
        <button
          className="icon-button"
          onClick={() => onEdit(goal)}
          title="Edit goal"
          aria-label="Edit goal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .9 }}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
        <button
          className="icon-button error"
          onClick={() => onDelete(goal)}
          title="Delete goal"
          aria-label="Delete goal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .9 }}>
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

function EditGoalModal({ open, goal, onClose, onSave }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [status, setStatus] = React.useState("on track");
  const [type, setType] = React.useState("");
  const [visibility, setVisibility] = React.useState("private");

  React.useEffect(() => {
    if (!goal) return;
    setTitle(goal.title || "");
    setDescription(goal.description || "");
    setTargetDate(goal.target_date || "");
    setStatus(goal.status || "on track");
    setType(goal.type || "");
    setVisibility(goal.visibility_scope || "private");
  }, [goal]);

  if (!open) return null;

  return (
    <Modal open={open} title="Edit Goal" onClose={onClose}>
      <div style={{ width: "100%", display: "grid", gap: 20 }}>
      <div className="form-field" style={{ width: "100%" }}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-field" style={{ width: "100%" }}>
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-row" style={{ width: "100%" }}>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Target date</label>
          <input type="date" placeholder="YYYY-MM-DD" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div className="form-field" style={{ width: 180 }}>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="on track">On Track</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="form-row" style={{ width: "100%" }}>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Type</label>
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder="fitness / diet / habit" />
        </div>
        <div className="form-field" style={{ width: 180 }}>
          <label>Visibility</label>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, width: "100%" }}>
        <button className="btn secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => onSave({
            title,
            description,
            status,
            target_date: targetDate || undefined,
            type,
            visibility_scope: visibility,
          })}
        >
          Save Changes
        </button>
      </div>
      </div>
    </Modal>
  );
}

function AddGoalForm({ onCreate, loading }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [type, setType] = React.useState("");
  const [visibility, setVisibility] = React.useState("private");

  const canSave = title.trim().length > 0;

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div className="form-field">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run 5km" />
      </div>
      <div className="form-field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details" />
      </div>
      <div className="form-row">
        <div className="form-field" style={{ flex: 1 }}>
          <label>Target date</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Type</label>
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder="fitness / diet / habit" />
        </div>
        <div className="form-field" style={{ width: 160 }}>
          <label>Visibility</label>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn primary" disabled={!canSave || loading} onClick={async () => {
          const ok = await onCreate({
            title,
            description,
            status: "on track",
            target_date: targetDate || undefined,
            type,
            visibility_scope: visibility,
          });
          if (ok) {
            setTitle("");
            setDescription("");
            setTargetDate("");
            setType("");
            setVisibility("private");
          }
        }}>Add Goal</button>
      </div>
    </div>
  );
}

function ActiveGoalsTab() {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = React.useState(false);
  const [goals, setGoals] = React.useState([]);
  const [confirm, setConfirm] = React.useState({ open: false, item: null });
  const [edit, setEdit] = React.useState({ open: false, item: null });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await GoalsApi.listGoals();
      setGoals(res?.result || res || []);
    } catch (e) {
      addNotification(e.message || "Failed to load goals", "error");
    } finally { setLoading(false); }
  }, [addNotification]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    try {
      setLoading(true);
      await GoalsApi.createGoal(data);
      addNotification("Goal added", "success");
      load();
      return true;
    } catch (e) { addNotification(e.message, "error"); return false; } finally { setLoading(false); }
  };

  const handleUpdate = async (goal, patch) => {
    try {
      setLoading(true);
      await GoalsApi.updateGoal(goal.id || goal.goals_id || goal.goal_id, { ...patch, goals_id: goal.id || goal.goals_id || goal.goal_id });
      addNotification("Goal updated", "success");
      load();
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const handleDelete = (goal) => setConfirm({ open: true, item: goal });
  const confirmDelete = async () => {
    const goal = confirm.item;
    if (!goal) return setConfirm({ open: false, item: null });
    try {
      setLoading(true);
      await GoalsApi.removeGoal(goal.id || goal.goals_id || goal.goal_id);
      addNotification("Goal deleted", "success");
      setConfirm({ open: false, item: null });
      load();
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const handleEdit = (goal) => setEdit({ open: true, item: goal });
  const saveEdit = async (payload) => {
    const goal = edit.item;
    if (!goal) return setEdit({ open: false, item: null });
    try {
      setLoading(true);
      await GoalsApi.updateGoal(goal.id || goal.goals_id || goal.goal_id, { ...payload, goals_id: goal.id || goal.goals_id || goal.goal_id });
      addNotification("Goal updated", "success");
      setEdit({ open: false, item: null });
      load();
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <AddGoalForm onCreate={handleCreate} loading={loading} />
      {loading && <div className="card">Loading…</div>}
      {!loading && goals?.length === 0 && <Empty title="No goals yet" />}
      {!loading && goals?.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {goals.map((g) => (
            <GoalItem key={g.id} goal={g} onUpdate={handleUpdate} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, item: null })}
        onConfirm={confirmDelete}
        title="Delete goal"
        message="This action cannot be undone. Are you sure?"
      />

      <EditGoalModal
        open={edit.open}
        goal={edit.item}
        onClose={() => setEdit({ open: false, item: null })}
        onSave={saveEdit}
      />
    </div>
  );
}

function HistoryTab() {
  const { addNotification } = useNotifications();
  const [items, setItems] = React.useState([]);
  const [filters, setFilters] = React.useState({ status: "Completed", start_date: "", end_date: "" });

  const load = React.useCallback(async () => {
    if (!filters.status) return;
    try {
      const params = { status: String(filters.status).toLowerCase() };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const res = await GoalsApi.getHistory(params);
      setItems(res?.result || res || []);
    } catch (e) { addNotification(e.message, "error"); }
  }, [filters, addNotification]);

  React.useEffect(() => { load(); }, [load]);

  const readd = async (goal) => {
    try {
      await GoalsApi.readd(goal.id || goal.goal_id);
      addNotification("Goal re-added", "success");
    } catch (e) { addNotification(e.message, "error"); }
  };

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div className="form-row">
        <div className="form-field" style={{ width: 180 }}>
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters(v => ({ ...v, status: e.target.value.toLowerCase() }))}>
            <option>Completed</option>
            <option>Archived</option>
          </select>
        </div>
        <div className="form-field" style={{ width: 180 }}>
          <label>Start date</label>
          <input type="date" placeholder="YYYY-MM-DD" value={filters.start_date} onChange={(e) => setFilters(v => ({ ...v, start_date: e.target.value }))} />
        </div>
        <div className="form-field" style={{ width: 180 }}>
          <label>End date</label>
          <input type="date" placeholder="YYYY-MM-DD" value={filters.end_date} onChange={(e) => setFilters(v => ({ ...v, end_date: e.target.value }))} />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button className="btn secondary" onClick={load}>Filter</button>
        </div>
      </div>

      {items?.length === 0 && <Empty title="No results for selected filters" />}
      {items?.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((g) => (
            <div key={g.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{g.title}</div>
                {g.completed_at && <div style={{ color: "var(--muted)", fontSize: 13 }}>Completed: {new Date(g.completed_at).toLocaleDateString()}</div>}
              </div>
              <button className="btn outline small" onClick={() => readd(g)}>Re-add</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab() {
  const { addNotification } = useNotifications();
  const [filters, setFilters] = React.useState({ start_date: "", end_date: "", mood_tag: "" });
  const [items, setItems] = React.useState([]);
  const [note, setNote] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [selectedNote, setSelectedNote] = React.useState(null);
  const [confirmNoteDelete, setConfirmNoteDelete] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const hasFilters = (filters.start_date && filters.start_date.trim()) || (filters.end_date && filters.end_date.trim()) || (filters.mood_tag && filters.mood_tag.trim());
      const res = await GoalsApi.listNotes(
        hasFilters ? { start_date: filters.start_date, end_date: filters.end_date, mood_tag: filters.mood_tag } : undefined
      );
      setItems(res?.result || res || []);
    } catch (e) { addNotification(e.message, "error"); }
  }, [filters, addNotification]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!note.trim()) return;
    try {
      await GoalsApi.createNote({ text: note, mood_tag: mood || undefined });
      setNote("");
      setMood("");
      addNotification("Note added", "success");
      load();
    } catch (e) { addNotification(e.message, "error"); }
  };

  const openNote = async (n) => {
    try {
      const res = await GoalsApi.getNote(n.id || n.note_id);
      setSelectedNote(res?.result || res || n);
    } catch (e) { addNotification(e.message, "error"); }
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    try {
      const noteId = selectedNote.id || selectedNote.note_id;
      await GoalsApi.updateNote(noteId, { text: selectedNote.text, mood_tag: selectedNote.mood_tag || undefined });
      addNotification("Note updated", "success");
      setSelectedNote(null);
      load();
    } catch (e) { addNotification(e.message, "error"); }
  };

  const deleteNote = async () => {
    if (!selectedNote) return;
    try {
      // user_id is required by API for delete
      const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : undefined;
      const noteId = selectedNote.id || selectedNote.note_id;
      await GoalsApi.deleteNote(noteId, { user_id: userId });
      addNotification("Note deleted", "success");
      setSelectedNote(null);
      setConfirmNoteDelete(false);
      load();
    } catch (e) { addNotification(e.message, "error"); }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="form-row">
          <div className="form-field" style={{ width: 180 }}>
            <label>Start date</label>
            <input type="date" value={filters.start_date} onChange={(e) => setFilters(v => ({ ...v, start_date: e.target.value }))} />
          </div>
          <div className="form-field" style={{ width: 180 }}>
            <label>End date</label>
            <input type="date" value={filters.end_date} onChange={(e) => setFilters(v => ({ ...v, end_date: e.target.value }))} />
          </div>
          <div className="form-field" style={{ width: 180 }}>
            <label>Mood</label>
            <input value={filters.mood_tag} onChange={(e) => setFilters(v => ({ ...v, mood_tag: e.target.value }))} placeholder="e.g. energetic" />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="btn secondary" onClick={load}>Filter</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="form-field">
          <label>Write a note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="How are you feeling today?" />
        </div>
        <div className="form-row">
          <div className="form-field" style={{ width: 220 }}>
            <label>Mood tag</label>
            <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="calm / energetic / tired" />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="btn primary" onClick={add}>Save</button>
          </div>
        </div>
      </div>

      {items?.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((n) => (
            <div key={n.id} className="card" style={{ cursor: "default"}}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems:'center', gap:8, marginBottom: 8  }}>
              <div>{n.text}</div>
               
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {n.mood_tag && <div className="btn outline small">{n.mood_tag}</div>}
                  <button
                    className="icon-button"
                    title="Edit note"
                    aria-label="Edit note"
                    onClick={(e) => { e.stopPropagation(); openNote(n); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .9 }}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    className="icon-button error"
                    title="Delete note"
                    aria-label="Delete note"
                    onClick={(e) => { e.stopPropagation(); setSelectedNote(n); setConfirmNoteDelete(true); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .9 }}>
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>{new Date(n.created_at || n.date || Date.now()).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No notes yet" />
      )}

      {selectedNote && (
        <Modal open={!!selectedNote} title="Edit Note" onClose={() => setSelectedNote(null)}>
          <div className="form-field" style={{ width: "100%" }}>
            <label>Text</label>
            <textarea value={selectedNote.text} onChange={(e) => setSelectedNote({ ...selectedNote, text: e.target.value })} />
          </div>
          <div className="form-row" style={{ width: "100%" }}>
            <div className="form-field" style={{ width: "100%"}}>
              <label>Mood tag</label>
              <input value={selectedNote.mood_tag || ""} onChange={(e) => setSelectedNote({ ...selectedNote, mood_tag: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex",  width: "100%" }}>
           
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%"}}>
              <button className="btn secondary" onClick={() => setSelectedNote(null)}>Cancel</button>
              <button className="btn primary" onClick={saveNote}>Save</button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDeleteModal
        isOpen={confirmNoteDelete}
        onClose={() => setConfirmNoteDelete(false)}
        onConfirm={deleteNote}
        title="Delete note"
        message="This action cannot be undone. Are you sure?"
      />
    </div>
  );
}

export default function GoalsPage() {
  const [tab, setTab] = React.useState("active");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Goals</h1>
      </div>

      <Tabs value={tab} onChange={setTab} />

      {tab === "active" && <ActiveGoalsTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "notes" && <NotesTab />}
    </div>
  );
}


