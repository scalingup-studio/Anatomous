import { authRequest } from "./apiClient";
import { ENDPOINTS, CUSTOM_ENDPOINTS } from "./apiConfig";

export const GoalsApi = {
  // GET /goals - Query all goals records
  getAll: () => authRequest(ENDPOINTS.goals.getAll),

  // GET /goals?user_id={user_id} - Filter by user_id
  getByUserId: (user_id) => authRequest(`${ENDPOINTS.goals.getAll}?user_id=${user_id}`),

  // GET /goals/{user_id} - Get goals record
  getById: (user_id) => authRequest(ENDPOINTS.goals.getById(user_id)),

  // POST /goals - Add goals record
  create: (data) => authRequest(ENDPOINTS.goals.create, {
    method: "POST",
    body: data,
  }),

  // PATCH /goals/{user_id} - Edit goals record
  update: (user_id, data) => authRequest(ENDPOINTS.goals.update(user_id), {
    method: "PATCH",
    body: data,
  }),

  // DELETE /goals/{user_id} - Delete goals record
  delete: (user_id) => authRequest(ENDPOINTS.goals.remove(user_id), {
    method: "DELETE",
  }),

  // ---- Custom endpoints from Goals.md ----
  // POST /goals - create goal (alias)
  createGoal: (data) => authRequest(ENDPOINTS.goals.create, { method: "POST", body: data }),
  // GET goals list
  listGoals: () => authRequest(CUSTOM_ENDPOINTS.goals.getGoals),
  // PATCH /goals/{goal_id}
  updateGoal: (goal_id, data) => authRequest(ENDPOINTS.goals.update(goal_id), { method: "PATCH", body: data }),
  // DELETE /goals/{goal_id}
  removeGoal: (goal_id) => authRequest(ENDPOINTS.goals.remove(goal_id), { method: "DELETE" }),

  // Goal Progress
  addProgress: (data) => authRequest(CUSTOM_ENDPOINTS.goalProgress.create, { method: "POST", body: data }),
  getProgress: (params) => {
    const q = new URLSearchParams(params).toString();
    return authRequest(`${CUSTOM_ENDPOINTS.goalProgress.getProgress}?${q}`);
  },
  deleteProgress: (goal_progress_id) => authRequest(CUSTOM_ENDPOINTS.goalProgress.remove(goal_progress_id), { method: "DELETE" }),

  // Goals History & Readd
  getHistory: (params) => {
    const q = new URLSearchParams(params).toString();
    return authRequest(`${CUSTOM_ENDPOINTS.goals.getHistory}?${q}`);
  },
  readd: (goal_id) => authRequest(CUSTOM_ENDPOINTS.goals.readd, { method: "POST", body: { goal_id } }),

  // Notes
  createNote: (data) => {
    const body = Object.fromEntries(Object.entries({ text: data.text, mood_tag: data.mood_tag }).filter(([_, v]) => v !== undefined && v !== null));
    return authRequest(CUSTOM_ENDPOINTS.notes.create, { method: "POST", body });
  },
  listNotes: (params) => {
    const cleaned = Object.fromEntries(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    );
    const q = Object.keys(cleaned).length ? `?${new URLSearchParams(cleaned).toString()}` : "";
    return authRequest(`${CUSTOM_ENDPOINTS.notes.list}${q}`);
  },
  updateNote: (note_id, data) => {
    const body = Object.fromEntries(Object.entries({ text: data.text, mood_tag: data.mood_tag }).filter(([_, v]) => v !== undefined && v !== null));
    return authRequest(CUSTOM_ENDPOINTS.notes.update(note_id), { method: "PATCH", body });
  },
  getNote: (note_id) => authRequest(`${CUSTOM_ENDPOINTS.notes.getNote}?note_id=${note_id}`),
  deleteNote: (note_id, data) => authRequest(CUSTOM_ENDPOINTS.notes.update(note_id), { method: "DELETE", body: data }),
};