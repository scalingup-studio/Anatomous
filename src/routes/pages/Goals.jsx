import React from "react";
import DatePicker from "../../components/DatePicker.jsx";
import "./Goals.css";
import { useSearchParams } from "react-router-dom";
import { GoalsApi } from "../../api/goalsApi";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal.jsx";
import { Modal } from "../../components/Modal.jsx";
import ActiveGoalsTab from "./goals/ActiveGoalsTab.jsx";

function Tabs({ value, onChange }) {
  const items = [
    { key: "active", label: "Active Goals" },
    { key: "history", label: "Goal History" },
  ];
  return (
    <>
      <style>{`
        .goals-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .goals-tabs::-webkit-scrollbar {
          display: none;
        }
        .goals-tabs button {
          white-space: nowrap;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .goals-tabs {
            gap: 6px;
          }
          .goals-tabs button {
            padding: 6px 12px !important;
            font-size: 13px !important;
          }
        }
        @media (max-width: 480px) {
          .goals-tabs button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
      <div role="tablist" aria-label="Goals navigation" className="goals-tabs">
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
    </>
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
    <div className="card goal-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
      <div className="goal-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {(() => {
          const current = String(goal.status || 'on track').toLowerCase();
          const all = ["on track", "completed", "paused", "archived"];
          const ordered = [current, ...all.filter(s => s !== current)];
          return (
            <select
              value={current}
              onChange={(e) => onUpdate(goal, { status: e.target.value })}
              className="status-select"
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
    <div className="card goals-form" style={{ display: "grid", gap: 12 }}>
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
          placeholder="e.g., Daily Step Goal"
        />
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
          {title.length}/200
        </div>
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
          placeholder="Example: Walk 8,000 steps daily or Strength train 3x/week."
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

// ActiveGoalsTab moved to ./goals/ActiveGoalsTab.jsx

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
    <div className="card history-filters" style={{ display: "grid", gap: 12 }}>
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
          <DatePicker 
            value={filters.start_date} 
            onChange={(val) => {
              setFilters(v => {
                const updated = { ...v, start_date: val };
                // If end_date is before new start_date, clear it
                if (updated.end_date && val && updated.end_date < val) {
                  updated.end_date = '';
                }
                return updated;
              });
            }}
            maxDate={filters.end_date || undefined}
          />
        </div>
        <div className="form-field" style={{ width: 180 }}>
          <label>End date</label>
          <DatePicker 
            value={filters.end_date} 
            onChange={(val) => setFilters(v => ({ ...v, end_date: val }))}
            minDate={filters.start_date || undefined}
          />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button className="btn secondary" onClick={load}>Filter</button>
        </div>
      </div>

      {items?.length === 0 && <Empty title="No results for selected filters" />}
      {items?.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((g) => (
            <div key={g.id} className="card history-goal-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{g.title}</div>
                {g.completed_at && (() => {
                  try {
                    const d = new Date(g.completed_at);
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const year = d.getFullYear();
                    return <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Completed: {`${month}/${day}/${year}`}</div>;
                  } catch {
                    return <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Completed: {g.completed_at}</div>;
                  }
                })()}
              </div>
              <button className="btn outline small" onClick={() => readd(g)} style={{ flexShrink: 0 }}>Re-add</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// NotesTab moved to ./goals/NotesTab.jsx

export default function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    return ["active", "history"].includes(t) ? t : "active";
  })();
  const [tab, setTab] = React.useState(initialTab);

  React.useEffect(() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    if (["active", "history"].includes(t) && t !== tab) {
      setTab(t);
    }
  }, [searchParams]);

  const handleChangeTab = (next) => {
    if (next === tab) return;
    setTab(next);
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      sp.set('tab', next);
      return sp;
    }, { replace: true });
    // Scroll to top when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Also try to scroll dash-content if available
    const dashContent = document.querySelector('.dash-content');
    if (dashContent) {
      dashContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="goals-page" style={{ display: "grid", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Goals</h1>
      </div>

      <Tabs value={tab} onChange={handleChangeTab} />

      {tab === "active" && <ActiveGoalsTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}


