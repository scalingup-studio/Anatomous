import React from "react";
import DatePicker from "../../../components/DatePicker.jsx";
import { Modal } from "../../../components/Modal.jsx";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal.jsx";
import { useNotes } from "../../../hooks/useNotes.js";
import { useNotifications } from "../../../api/NotificationContext.jsx";

export default function NotesTab() {
  const {
    filters, setFilters,
    items,
    note, setNote,
    mood, setMood,
    selectedNote, setSelectedNote,
    confirmNoteDelete, setConfirmNoteDelete,
    loading,
    add, openNote, saveNote, deleteNote,
    formatDisplayDate,
    load,
  } = useNotes();
  const { showNotification } = useNotifications();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="form-row">
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
          <div className="form-field" style={{ width: 180 }}>
            <label>Mood</label>
            <input 
              value={filters.mood_tag} 
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 200) {
                  setFilters(v => ({ ...v, mood_tag: value }));
                }
              }}
              maxLength={200}
              placeholder="e.g. energetic (max 200)"
            />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="btn secondary" onClick={load}>Filter</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="form-field">
          <label>Write a note</label>
          <textarea 
            value={note} 
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 500) {
                setNote(value);
              }
            }}
            maxLength={500}
            placeholder="How are you feeling today? (max 500 characters)"
            rows={4}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
            {note.length}/500
          </div>
        </div>
        <div className="form-row">
          <div className="form-field" style={{ width: 220 }}>
            <label>Mood tag</label>
            <input 
              value={mood} 
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 200) {
                  setMood(value);
                }
              }}
              maxLength={200}
              placeholder="calm / energetic / tired (max 200)"
            />
          
          </div>
          <div style={{ alignSelf: "end" }}>
            <button 
              className="btn primary" 
              onClick={() => {
                // Validate note length (max 500 characters)
                if (note.length > 500) {
                  showNotification("Note cannot exceed 500 characters", "error");
                  return;
                }
                // Validate mood tag length (max 200 characters)
                if (mood.length > 200) {
                  showNotification("Mood tag cannot exceed 200 characters", "error");
                  return;
                }
                add();
              }} 
              disabled={loading}
            >
              Save
            </button>
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
              <div style={{ color: "var(--muted)", fontSize: 10 }}>{formatDisplayDate(n)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>No notes yet</p>
        </div>
      )}

      {selectedNote && (
        <Modal open={!!selectedNote} title="Edit Note" onClose={() => setSelectedNote(null)}>
          <div className="form-field" style={{ width: "100%" }}>
            <label>Text</label>
            <textarea 
              value={selectedNote.text} 
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 500) {
                  setSelectedNote({ ...selectedNote, text: value });
                }
              }}
              maxLength={500}
              rows={4}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
              {selectedNote.text?.length || 0}/500
            </div>
          </div>
          <div className="form-row" style={{ width: "100%" }}>
            <div className="form-field" style={{ width: "100%"}}>
              <label>Mood tag</label>
              <input 
                value={selectedNote.mood_tag || ""} 
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 200) {
                    setSelectedNote({ ...selectedNote, mood_tag: value });
                  }
                }}
                maxLength={200}
              />
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
                {(selectedNote.mood_tag || "").length}/200
              </div>
            </div>
          </div>
          <div style={{ display: "flex",  width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%"}}>
              <button className="btn secondary" onClick={() => setSelectedNote(null)}>Cancel</button>
              <button 
                className="btn primary" 
                onClick={() => {
                  // Validate note length (max 500 characters)
                  if (selectedNote.text && selectedNote.text.length > 500) {
                    showNotification("Note cannot exceed 500 characters", "error");
                    return;
                  }
                  // Validate mood tag length (max 200 characters)
                  if (selectedNote.mood_tag && selectedNote.mood_tag.length > 200) {
                    showNotification("Mood tag cannot exceed 200 characters", "error");
                    return;
                  }
                  saveNote();
                }} 
                disabled={loading}
              >
                Save
              </button>
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


