import React from "react";
import DatePicker from "../../../components/DatePicker.jsx";
import "../Goals.css";
import { Modal } from "../../../components/Modal.jsx";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal.jsx";
import { useGoals } from "../../../hooks/useGoals.js";
import { useNotifications } from "../../../api/NotificationContext.jsx";

function GoalItem({ goal, onUpdate, onDelete, onEdit }) {
  const formatDate = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString();
    } catch {
      return String(v);
    }
  };
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
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6, display:'flex', gap:12, flexWrap:'wrap' }}>
          {(() => {
            const created = goal.created_at || goal.createdAt || goal.created || goal.created_date;
            const target = goal.target_date || goal.targetDate;
            const updated = goal.updated_at || goal.updatedAt;
            const parts = [];
            if (created) parts.push(`Created: ${formatDate(created)}`);
            if (target) parts.push(`Target: ${formatDate(target)}`);
            if (goal.completed_at) parts.push(`Completed: ${formatDate(goal.completed_at)}`);
            else if (updated) parts.push(`Updated: ${formatDate(updated)}`);
            return parts.length ? <span>{parts.join(' · ')}</span> : null;
          })()}
        </div>
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
  const { showNotification } = useNotifications();

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
          <input 
            value={title} 
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 200) {
                setTitle(value);
              }
            }}
            maxLength={200}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
            {title.length}/200
          </div>
        </div>
        <div className="form-field" style={{ width: "100%" }}>
          <label>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 500) {
                setDescription(value);
              }
            }}
            maxLength={500}
            rows={4}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
            {description.length}/500
          </div>
        </div>
        <div className="form-row" style={{ width: "100%" }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Target date</label>
            <DatePicker value={targetDate} onChange={(val) => setTargetDate(val)} />
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
            onClick={() => {
              // Validate title length (max 200 characters)
              if (title.length > 200) {
                showNotification("Title cannot exceed 200 characters", "error");
                return;
              }
              // Validate description length (max 500 characters)
              if (description.length > 500) {
                showNotification("Description cannot exceed 500 characters", "error");
                return;
              }
              onSave({
                title,
                description,
                status,
                target_date: targetDate || undefined,
                type,
                visibility_scope: visibility,
              });
            }}
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
  const { showNotification } = useNotifications();

  const canSave = title.trim().length > 0;

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div className="form-field">
        <label>Title</label>
        <input 
          value={title} 
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= 200) {
              setTitle(value);
            }
          }}
          maxLength={200}
          placeholder="e.g. Run 5km (max 200 characters)"
        />
       
      </div>
      <div className="form-field">
        <label>Description</label>
        <textarea 
          value={description} 
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= 500) {
              setDescription(value);
            }
          }}
          maxLength={500}
          placeholder="Details (max 500 characters)"
          rows={4}
        />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
            {description.length}/500
          </div>
      </div>
      <div className="form-row">
        <div className="form-field" style={{ flex: 1 }}>
          <label>Target date</label>
          <DatePicker value={targetDate} onChange={(val) => setTargetDate(val)} />
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
          // Validate title length (max 200 characters)
          if (title.length > 200) {
            showNotification("Title cannot exceed 200 characters", "error");
            return;
          }
          // Validate description length (max 500 characters)
          if (description.length > 500) {
            showNotification("Description cannot exceed 500 characters", "error");
            return;
          }
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

export default function ActiveGoalsTab() {
  const {
    loading,
    goals,
    confirm, setConfirm,
    edit, openEdit, closeEdit,
    createGoal,
    updateGoal,
    requestDelete,
    confirmDelete,
    saveEdit,
  } = useGoals();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <AddGoalForm onCreate={createGoal} loading={loading} />
      {loading && <div className="card">Loading…</div>}
      {!loading && goals?.length === 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>No goals yet</p>
        </div>
      )}
      {!loading && goals?.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {goals.map((g) => (
            <GoalItem key={g.id} goal={g} onUpdate={updateGoal} onDelete={requestDelete} onEdit={openEdit} />
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
        onClose={closeEdit}
        onSave={saveEdit}
      />
    </div>
  );
}


