import React from "react";
import DatePicker from "../../../components/DatePicker.jsx";
import "../Goals.css";
import { Modal } from "../../../components/Modal.jsx";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal.jsx";
import { useGoals } from "../../../hooks/useGoals.js";
import { useNotifications } from "../../../api/NotificationContext.jsx";
import { GoalsApi } from "../../../api/goalsApi.js";

function GoalItem({ goal, onUpdate, onDelete, onEdit }) {
  const formatDate = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      // Format to consistent US format (MM/DD/YYYY)
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
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

  // Normalize description - remove "Goal: " prefix if present for consistent display
  const normalizedDescription = goal.description 
    ? goal.description.replace(/^Goal:\s*/i, '').trim() 
    : null;

  return (
    <div className="card goal-item" style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
        <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{goal.title}</div>
        {normalizedDescription && (
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, wordBreak: 'break-word' }}>{normalizedDescription}</div>
        )}
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6, display:'flex', gap:12, flexWrap:'wrap' }}>
          {(() => {
            const created = goal.created_at || goal.createdAt || goal.created || goal.created_date;
            const target = goal.target_date || goal.targetDate;
            const updated = goal.updated_at || goal.updatedAt;
            const parts = [];
            // Always show Created date if available
            if (created) parts.push(`Created: ${formatDate(created)}`);
            // Always show Target date if available
            if (target) parts.push(`Target: ${formatDate(target)}`);
            // Show Completed date if goal is completed, otherwise show Updated if available
            if (goal.completed_at) {
              parts.push(`Completed: ${formatDate(goal.completed_at)}`);
            } else if (updated && goal.status !== 'on track') {
              // Only show Updated for non-active goals (paused, archived, etc.)
              parts.push(`Updated: ${formatDate(updated)}`);
            }
            return parts.length ? <span>{parts.join(' · ')}</span> : null;
          })()}
        </div>
      </div>
      <div className="goal-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
  const [noTargetDate, setNoTargetDate] = React.useState(false);
  const [status, setStatus] = React.useState("on track");
  const [type, setType] = React.useState("");
  const [visibility, setVisibility] = React.useState("private");
  const { showNotification } = useNotifications();

  React.useEffect(() => {
    if (!goal) return;
    setTitle(goal.title || "");
    setDescription(goal.description || "");
    // Check if no_target_date is true, or if target_date is missing/empty
    const noTargetDateValue = goal.no_target_date === true || (!goal.target_date || goal.target_date.trim() === "");
    setNoTargetDate(noTargetDateValue);
    setTargetDate(noTargetDateValue ? "" : (goal.target_date || ""));
    setStatus(goal.status || "on track");
    setType(goal.type || "");
    setVisibility(goal.visibility_scope || "private");
  }, [goal]);

  if (!open) return null;

  return (
    <Modal open={open} title="Edit Goal" onClose={onClose}>
      <div className="edit-goal-modal" style={{ width: "100%", display: "grid", gap: 20 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <DatePicker 
                value={targetDate} 
                onChange={(val) => setTargetDate(val)} 
                disabled={noTargetDate}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={noTargetDate}
                  onChange={(e) => {
                    setNoTargetDate(e.target.checked);
                    if (e.target.checked) {
                      setTargetDate("");
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: 'var(--muted)' }}>No target date (ongoing goal)</span>
              </label>
            </div>
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
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Select Type</option>
              <option value="Fitness">Fitness</option>
              <option value="Nutrition">Nutrition</option>
              <option value="Habit / Routine">Habit / Routine</option>
              <option value="Wellness / General Health">Wellness / General Health</option>
            </select>
          </div>
          <div className="form-field" style={{ width: 180 }}>
            <label>Visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, width: "100%", flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={onClose} style={{ flex: 1, minWidth: '120px' }}>Cancel</button>
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
              const payload = {
                title,
                description,
                status,
                target_date: noTargetDate ? undefined : (targetDate || undefined),
                no_target_date: noTargetDate,
                type,
                visibility_scope: visibility,
              };
              // SECURITY: Commented to prevent sensitive payload data leakage
              // console.log('Update Goal - Request payload:', payload);
              onSave(payload);
            }}
            style={{ flex: 1, minWidth: '120px' }}
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
  const [noTargetDate, setNoTargetDate] = React.useState(false);
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
      <div className="form-row" style={{ alignItems: 'flex-start' }}>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Target date</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <DatePicker 
              value={targetDate} 
              onChange={(val) => setTargetDate(val)} 
              disabled={noTargetDate}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={noTargetDate}
                onChange={(e) => {
                  setNoTargetDate(e.target.checked);
                  if (e.target.checked) {
                    setTargetDate("");
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--muted)' }}>No target date (ongoing goal)</span>
            </label>
          </div>
        </div>
        <div className="form-field" style={{ flex: 1 }}>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Select Type</option>
            <option value="Fitness">Fitness</option>
            <option value="Nutrition">Nutrition</option>
            <option value="Habit / Routine">Habit / Routine</option>
            <option value="Wellness / General Health">Wellness / General Health</option>
          </select>
        </div>
        <div className="form-field" style={{ width: 160 }}>
          <label>Visibility</label>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: 'wrap' }}>
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
          const payload = {
            title,
            description,
            status: "on track",
            target_date: noTargetDate ? undefined : (targetDate || undefined),
            no_target_date: noTargetDate,
            type,
            visibility_scope: visibility,
          };
          // SECURITY: Commented to prevent sensitive payload data leakage
          // console.log('Create Goal - Request payload:', payload);
          const ok = await onCreate(payload);
          if (ok) {
            setTitle("");
            setDescription("");
            setTargetDate("");
            setNoTargetDate(false);
            setType("");
            setVisibility("private");
          }
        }} style={{ width: '100%', minWidth: '120px' }}>Add Goal</button>
      </div>
    </div>
  );
}

export default function ActiveGoalsTab() {
  const { addNotification } = useNotifications();
  const {
    loading: goalsLoading,
    goals: goalsFromHook,
    confirm, setConfirm,
    edit, openEdit, closeEdit,
    createGoal,
    updateGoal,
    requestDelete,
    confirmDelete,
    saveEdit,
    load,
  } = useGoals();

  // Filter for active goals (On Track and Paused only)
  const [statusFilter, setStatusFilter] = React.useState("all"); // "all", "on track", "paused"
  const [limit, setLimit] = React.useState(5); // Start with 5, increase by 5 on "Load more"
  const [meta, setMeta] = React.useState(null); // Store meta from API response
  const [loading, setLoading] = React.useState(false); // Loading state for initial load
  const [goals, setGoals] = React.useState([]); // Local goals state to work with meta
  const previousLimitRef = React.useRef(0); // Track previous limit to detect "Load More"
  const previousFilterRef = React.useRef(statusFilter); // Track previous filter
  const goalsRef = React.useRef([]); // Track current goals for "Load More" detection

  // Map UI filter values to API filter values
  const getApiFilter = (filter) => {
    if (filter === "all") return "all active";
    return filter; // "on track" or "paused"
  };

  // Store current params for reloading after mutations
  const getCurrentParams = React.useCallback(() => {
    return {
      limit: limit,
      filter: getApiFilter(statusFilter)
    };
  }, [statusFilter, limit]);

  // Load goals with API parameters and save meta
  const loadWithMeta = React.useCallback(async (isLoadMore = false) => {
    // Don't show loading state - keep existing goals visible during filter changes
    // Only set loading for initial load (when goals array is empty)
    const isInitialLoad = goalsRef.current.length === 0;
    if (isInitialLoad && !isLoadMore) {
      setLoading(true);
    }
    
    try {
      const res = await GoalsApi.listGoals(getCurrentParams());
      const newGoals = res?.result || res || [];
      
      if (isLoadMore) {
        // Append new goals to existing ones (silently, no loading indicator)
        setGoals(prev => {
          // Create a map to avoid duplicates
          const existingIds = new Set(prev.map(g => g.id || g.goal_id));
          const uniqueNewGoals = newGoals.filter(g => !existingIds.has(g.id || g.goal_id));
          const updated = [...prev, ...uniqueNewGoals];
          goalsRef.current = updated;
          return updated;
        });
      } else {
        // Replace goals on initial load or filter change
        // Keep opacity transition smooth
        setGoals(newGoals);
        goalsRef.current = newGoals;
      }
      
      // Save meta data from response
      if (res?.meta) {
        setMeta(res.meta);
      } else {
        setMeta(null);
      }
    } catch (e) {
      addNotification(e.message || "Failed to load goals", "error");
    } finally {
      if (isInitialLoad && !isLoadMore) {
        setLoading(false);
      }
    }
  }, [getCurrentParams, addNotification]);

  React.useEffect(() => {
    // Check if this is a "Load More" action (limit increased, filter unchanged) or initial/filter change
    const filterChanged = previousFilterRef.current !== statusFilter;
    const limitIncreased = previousLimitRef.current > 0 && limit > previousLimitRef.current;
    const isLoadMoreAction = !filterChanged && limitIncreased && goalsRef.current.length > 0;
    
    loadWithMeta(isLoadMoreAction);
    
    // Update refs
    previousLimitRef.current = limit;
    previousFilterRef.current = statusFilter;
  }, [statusFilter, limit, loadWithMeta]);

  // Reset limit when filter changes (but don't clear goals immediately - let them fade out)
  React.useEffect(() => {
    setLimit(5);
    // Don't clear goals immediately - keep them visible until new ones load
    // This prevents the list from disappearing when filter changes
  }, [statusFilter]);

  // Wrap createGoal to reload with current params
  const handleCreateGoal = React.useCallback(async (data) => {
    const success = await createGoal(data);
    if (success) {
      await loadWithMeta();
    }
    return success;
  }, [createGoal, loadWithMeta]);

  // Wrap updateGoal to reload with current params
  const handleUpdateGoal = React.useCallback(async (goal, patch) => {
    await updateGoal(goal, patch);
    await loadWithMeta();
  }, [updateGoal, loadWithMeta]);

  // Wrap confirmDelete to reload with current params
  const handleConfirmDelete = React.useCallback(async () => {
    await confirmDelete();
    await loadWithMeta();
  }, [confirmDelete, loadWithMeta]);

  // Wrap saveEdit to reload with current params
  const handleSaveEdit = React.useCallback(async (payload) => {
    await saveEdit(payload);
    await loadWithMeta();
  }, [saveEdit, loadWithMeta]);

  // Use goals directly from API (already filtered and limited)
  const displayedGoals = goals || [];

  // Check if there are more goals to load using meta.total_active_goals
  const totalActiveGoals = meta?.total_active_goals || 0;
  const hasMore = totalActiveGoals > displayedGoals.length;
  const remainingCount = totalActiveGoals - displayedGoals.length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <AddGoalForm onCreate={handleCreateGoal} loading={loading} />
      
      {/* Filter Section - Always visible, never hidden */}
      <div className="card" style={{ display: "grid", gap: 16, padding: 20 }}>
        {/* Filter Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "var(--muted)", marginRight: 4 }}>Filter:</span>
          <button
            onClick={() => {
              setStatusFilter("all");
            }}
            disabled={loading}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: statusFilter === "all" ? "var(--primary)" : "transparent",
              color: statusFilter === "all" ? "white" : "var(--text)",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: statusFilter === "all" ? 600 : 400,
              transition: "all 0.2s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            All Active
          </button>
          <button
            onClick={() => {
              setStatusFilter("on track");
            }}
            disabled={loading}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: statusFilter === "on track" ? "var(--success)" : "transparent",
              color: statusFilter === "on track" ? "white" : "var(--text)",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: statusFilter === "on track" ? 600 : 400,
              transition: "all 0.2s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            On Track
          </button>
          <button
            onClick={() => {
              setStatusFilter("paused");
            }}
            disabled={loading}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: statusFilter === "paused" ? "var(--warning)" : "transparent",
              color: statusFilter === "paused" ? "white" : "var(--text)",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: statusFilter === "paused" ? 600 : 400,
              transition: "all 0.2s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Paused
          </button>
        </div>

      </div>

      {/* Show empty state only when not loading and no goals */}
      {!loading && displayedGoals.length === 0 && totalActiveGoals === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎯</div>
          <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: 16 }}>No active goals yet</p>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Create your first goal above to get started!</p>
        </div>
      )}
      
      {/* Show filter mismatch message only when not loading, no goals, but total > 0 */}
      {!loading && displayedGoals.length === 0 && totalActiveGoals > 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔍</div>
          <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: 16 }}>No goals match the selected filter</p>
          <button 
            className="btn outline" 
            onClick={() => setStatusFilter("all")}
            style={{ marginTop: 8 }}
          >
            Show All Active Goals
          </button>
        </div>
      )}
      
      {/* Always show goals list, even during loading - never hide it */}
      {displayedGoals.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {displayedGoals.map((g, index) => (
            <div 
              key={g.id} 
              style={{ 
                animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`,
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.3s ease-in-out',
                pointerEvents: loading ? 'none' : 'auto'
              }}
            >
              <GoalItem goal={g} onUpdate={handleUpdateGoal} onDelete={requestDelete} onEdit={openEdit} />
            </div>
          ))}
          
          {/* Load More Button at the bottom of the list */}
          {hasMore && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
              <button 
                className="btn outline" 
                onClick={() => {
                  // If less than 5 remaining, load the exact amount, otherwise load 5 more
                  const loadAmount = remainingCount < 5 ? remainingCount : 5;
                  setLimit(prev => prev + loadAmount);
                }}
                disabled={loading}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  padding: "10px 20px",
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
                {loading ? 'Loading...' : (
                  remainingCount < 5 ? (
                    `Load ${remainingCount} more ${remainingCount === 1 ? 'goal' : 'goals'}`
                  ) : (
                    'Load 5 more goals'
                  )
                )}
              </button>
            </div>
          )}
          
          {/* Subtle loading indicator when loading (only show if there are goals) */}
          {loading && displayedGoals.length > 0 && (
            <div style={{ 
              textAlign: "center", 
              padding: 12,
              color: "var(--muted)",
              fontSize: 13
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ 
                  width: 14, 
                  height: 14, 
                  border: "2px solid var(--muted)", 
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }}></div>
                <span>Updating...</span>
              </div>
            </div>
          )}
          
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, item: null })}
        onConfirm={handleConfirmDelete}
        title="Delete goal"
        message="This action cannot be undone. Are you sure?"
      />

      <EditGoalModal
        open={edit.open}
        goal={edit.item}
        onClose={closeEdit}
        onSave={handleSaveEdit}
      />
    </div>
  );
}


