import React from "react";
import { useAuth } from "../api/AuthContext.jsx";
import { NotesApi } from "../api/notesApi.js";
import { useNotifications } from "../api/NotificationContext.jsx";

export function useNotes() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [filters, setFilters] = React.useState({ start_date: "", end_date: "", mood_tag: "" });
  const [items, setItems] = React.useState([]);
  const [note, setNote] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [selectedNote, setSelectedNote] = React.useState(null);
  const [confirmNoteDelete, setConfirmNoteDelete] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      // Server supports optional filters on /notes
      const cleaned = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
      );
      const list = await NotesApi.list(cleaned);
      setItems(list || []);
    } catch (e) {
      addNotification(e.message || "Failed to load notes", "error");
    } finally { setLoading(false); }
  }, [filters, addNotification]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!note.trim()) return;
    try {
      setLoading(true);
      await NotesApi.create({ text: note, mood_tag: mood || undefined, date: undefined });
      setNote("");
      setMood("");
      addNotification("Note added", "success");
      load();
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const openNote = (n) => {
    // Simply set the selected note with existing data - no API call needed
    setSelectedNote(n);
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    try {
      setLoading(true);
      await NotesApi.update(selectedNote.id, { text: selectedNote.text, mood_tag: selectedNote.mood_tag || undefined });
      addNotification("Note updated", "success");
      setSelectedNote(null);
      load();
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const deleteNote = async () => {
    const note = noteToDelete || selectedNote;
    if (!note) return;
    try {
      setLoading(true);
      await NotesApi.delete(note.id, { user_id: user?.id });
      addNotification("Note deleted", "success");
      setSelectedNote(null);
      setNoteToDelete(null);
      setConfirmNoteDelete(false);
      load();
    } catch (e) { addNotification(e.message, "error"); } finally { setLoading(false); }
  };

  const formatDisplayDate = (n) => {
    const source = n.data || n.date || n.created_at;
    try {
      if (!source) return "";
      if (n.data && /^\d{4}-\d{2}-\d{2}$/.test(String(n.data))) return String(n.data);
      const d = new Date(source);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
      return String(source);
    } catch { return String(source || ""); }
  };

  return {
    // state
    filters, setFilters,
    items,
    note, setNote,
    mood, setMood,
    selectedNote, setSelectedNote,
    confirmNoteDelete, setConfirmNoteDelete,
    noteToDelete, setNoteToDelete,
    loading,
    // actions
    load,
    add,
    openNote,
    saveNote,
    deleteNote,
    formatDisplayDate,
  };
}


