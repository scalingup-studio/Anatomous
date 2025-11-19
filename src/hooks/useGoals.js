import React from "react";
import { GoalsApi } from "../api/goalsApi";
import { useNotifications } from "../api/NotificationContext.jsx";

export function useGoals() {
  const { addNotification } = useNotifications();

  const [loading, setLoading] = React.useState(false);
  const [goals, setGoals] = React.useState([]);
  const [confirm, setConfirm] = React.useState({ open: false, item: null });
  const [edit, setEdit] = React.useState({ open: false, item: null });

  const load = React.useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await GoalsApi.listGoals(params);
      setGoals(res?.result || res || []);
    } catch (e) {
      addNotification(e.message || "Failed to load goals", "error");
    } finally { setLoading(false); }
  }, [addNotification]);

  // Don't auto-load - let components call load() with params
  // React.useEffect(() => { load(); }, [load]);

  const createGoal = async (data) => {
    try {
      setLoading(true);
      await GoalsApi.createGoal(data);
      addNotification("Goal added", "success");
      // Don't auto-load - let components call load() with params
      return true;
    } catch (e) { addNotification(e.message, "error"); return false; } finally { setLoading(false); }
  };

  const updateGoal = async (goal, patch) => {
    try {
      setLoading(true);
      const id = goal.id || goal.goals_id || goal.goal_id;
      const payload = { ...patch, goals_id: id };
      console.log('Update Goal Status - Request payload:', payload);
      console.log('Update Goal Status - Endpoint: PATCH /goals/' + id);
      await GoalsApi.updateGoal(id, payload);
      addNotification("Goal updated", "success");
      // Don't auto-load - let components call load() with params
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const requestDelete = (goal) => setConfirm({ open: true, item: goal });
  const confirmDelete = async () => {
    const goal = confirm.item;
    if (!goal) return setConfirm({ open: false, item: null });
    try {
      setLoading(true);
      await GoalsApi.removeGoal(goal.id || goal.goals_id || goal.goal_id);
      addNotification("Goal deleted", "success");
      setConfirm({ open: false, item: null });
      // Don't auto-load - let components call load() with params
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const openEdit = (goal) => setEdit({ open: true, item: goal });
  const closeEdit = () => setEdit({ open: false, item: null });
  const saveEdit = async (payload) => {
    const goal = edit.item;
    if (!goal) return closeEdit();
    try {
      setLoading(true);
      const id = goal.id || goal.goals_id || goal.goal_id;
      const fullPayload = { ...payload, goals_id: id };
      console.log('Update Goal Edit - Request payload:', fullPayload);
      console.log('Update Goal Edit - Endpoint: PATCH /goals/' + id);
      await GoalsApi.updateGoal(id, fullPayload);
      addNotification("Goal updated", "success");
      closeEdit();
      // Don't auto-load - let components call load() with params
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  return {
    loading,
    goals,
    confirm, setConfirm,
    edit, openEdit, closeEdit,
    load,
    createGoal,
    updateGoal,
    requestDelete,
    confirmDelete,
    saveEdit,
  };
}


