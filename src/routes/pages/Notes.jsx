import React from "react";
import ReactDOM from "react-dom";
import DatePicker from "../../components/DatePicker.jsx";
import { Modal } from "../../components/Modal.jsx";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal.jsx";
import { useNotes } from "../../hooks/useNotes.js";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { NotesApi } from "../../api/notesApi.js";

export default function NotesPage() {
  const {
    filters, setFilters,
    items,
    note, setNote,
    mood, setMood,
    selectedNote, setSelectedNote,
    confirmNoteDelete, setConfirmNoteDelete,
    noteToDelete, setNoteToDelete,
    loading,
    add, openNote, saveNote, deleteNote,
    formatDisplayDate,
    load,
  } = useNotes();
  const { showNotification } = useNotifications();
  
  // Mood dropdown options
  const moodOptions = [
    'Calm',
    'Energetic',
    'Tired',
    'Stressed',
    'Relaxed',
    'Focused',
    'Anxious',
    'Low Mood',
    'Neutral',
    'In Pain',
    'Grateful',
    'Motivated'
  ];
  
  // State for mood selection
  const [moodInput, setMoodInput] = React.useState('');
  const [showMoodDropdown, setShowMoodDropdown] = React.useState(false);
  const moodInputRef = React.useRef(null);
  
  // Separate state for edit modal dropdown
  const [showEditMoodDropdown, setShowEditMoodDropdown] = React.useState(false);
  const [editDropdownPosition, setEditDropdownPosition] = React.useState(null);
  
  // Keyword search is now part of filters and handled by API

  // Function to add note with mood
  const addNoteWithMood = React.useCallback(async (moodValue) => {
    if (!note.trim()) return;
    try {
      await NotesApi.create({ text: note, mood_tag: moodValue || undefined, date: undefined });
      setNote("");
      setMood("");
      showNotification("Note added", "success");
      load();
      // Clear mood field
      setMoodInput('');
    } catch (e) {
      // Show error notification with message from API
      const errorMessage = e.message || "Failed to add note";
      showNotification(errorMessage, "error");
    }
  }, [note, setNote, setMood, showNotification, load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Notes</h1>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
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
              placeholder="Write any thoughts, symptoms, or observations…"
              rows={4}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
              {note.length}/500
            </div>
          </div>
          <div className="form-field" style={{ width: '100%', position: 'relative' }}>
            <label>Mood tag</label>
            <input
              ref={moodInputRef}
              type="text"
              value={moodInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 200) {
                  setMoodInput(value);
                  setShowMoodDropdown(true);
                }
              }}
              onFocus={() => setShowMoodDropdown(true)}
              onBlur={(e) => {
                // Delay to allow click on dropdown item
                setTimeout(() => {
                  setShowMoodDropdown(false);
                }, 200);
              }}
              placeholder="Select or type a mood"
              maxLength={200}
              style={{ 
                width: '100%',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'textfield',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '16px',
                paddingRight: '32px'
              }}
            />
            {showMoodDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 100,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                {moodOptions
                  .filter(option => 
                    !moodInput || option.toLowerCase().includes(moodInput.toLowerCase())
                  )
                  .map(option => (
                    <div
                      key={option}
                      onClick={() => {
                        setMoodInput(option);
                        setShowMoodDropdown(false);
                        moodInputRef.current?.blur();
                      }}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {option}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn primary" 
              onClick={() => {
                // Validate note length (max 500 characters)
                if (note.length > 500) {
                  showNotification("Note cannot exceed 500 characters", "error");
                  return;
                }
                  // Use mood input value
                  const moodToSave = moodInput.trim();
                // Validate mood tag length (max 200 characters)
                if (moodToSave.length > 200) {
                  showNotification("Mood tag cannot exceed 200 characters", "error");
                  return;
                }
                // Call addNoteWithMood directly with mood value
                addNoteWithMood(moodToSave);
              }} 
              disabled={loading}
            >
              Save
            </button>
          </div>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div className="form-row">
            <div className="form-field" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <label>Search</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="text"
                  value={filters.search || ''} 
                  onChange={(e) => setFilters(v => ({ ...v, search: e.target.value }))}
                  placeholder="Search notes by text, mood, or keywords..."
                  style={{ width: '100%', paddingRight: filters.search ? '32px' : '8px' }}
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => setFilters(v => ({ ...v, search: '' }))}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      fontSize: '16px'
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
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
          </div>
        </div>

        {(() => {
          // Items are now filtered by API, no need for client-side filtering
          return items?.length > 0 ? (
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
                      onClick={(e) => { e.stopPropagation(); setNoteToDelete(n); setConfirmNoteDelete(true); }}
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
              <p style={{ color: "var(--muted)", marginBottom: 12 }}>
                {items?.length === 0 
                  ? (filters.search || filters.start_date || filters.end_date || filters.mood_tag)
                    ? "No notes match your filters" 
                    : "No notes yet"
                  : "No notes yet"}
              </p>
            </div>
          );
        })()}

        {selectedNote && (
          <Modal open={!!selectedNote} title="Edit Note" onClose={() => {
            setSelectedNote(null);
            setShowEditMoodDropdown(false);
          }}>
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
            <div className="form-field" style={{ width: "100%", position: 'relative' }}>
              <label>Mood tag</label>
              <input
                type="text"
                value={selectedNote.mood_tag || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 200) {
                    setSelectedNote({ ...selectedNote, mood_tag: value });
                  }
                }}
                onFocus={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setEditDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width
                  });
                  setShowEditMoodDropdown(true);
                }}
                onBlur={(e) => {
                  setTimeout(() => {
                    setShowEditMoodDropdown(false);
                  }, 200);
                }}
                placeholder="Select or type a mood"
                maxLength={200}
                style={{ 
                  width: '100%',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '16px',
                  paddingRight: '32px'
                }}
              />
              {showEditMoodDropdown && editDropdownPosition && ReactDOM.createPortal(
                <div
                  style={{
                    position: 'fixed',
                    top: `${editDropdownPosition.top}px`,
                    left: `${editDropdownPosition.left}px`,
                    width: `${editDropdownPosition.width}px`,
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10000,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {moodOptions
                    .filter(option => {
                      const currentValue = (selectedNote.mood_tag || '').toLowerCase();
                      // Show all options if field is empty or matches an option exactly, otherwise filter by input
                      if (!currentValue) return true;
                      if (moodOptions.includes(selectedNote.mood_tag || '')) {
                        // If current value is an exact match, show all options
                        return true;
                      }
                      // Otherwise filter by what user is typing
                      return option.toLowerCase().includes(currentValue);
                    })
                    .map(option => (
                      <div
                        key={option}
                        onClick={() => {
                          setSelectedNote({ ...selectedNote, mood_tag: option });
                          setShowEditMoodDropdown(false);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          transition: 'background-color 0.2s',
                          backgroundColor: (selectedNote.mood_tag || '').toLowerCase() === option.toLowerCase() 
                            ? 'var(--background-secondary, rgba(0, 0, 0, 0.05))' 
                            : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if ((selectedNote.mood_tag || '').toLowerCase() !== option.toLowerCase()) {
                            e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if ((selectedNote.mood_tag || '').toLowerCase() !== option.toLowerCase()) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {option}
                      </div>
                    ))}
                </div>,
                document.body
              )}
            </div>
            <div style={{ display: "flex",  width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%"}}>
                <button className="btn secondary" onClick={() => {
                  setSelectedNote(null);
                  setShowEditMoodDropdown(false);
                }}>Cancel</button>
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
          onClose={() => {
            setConfirmNoteDelete(false);
            setNoteToDelete(null);
          }}
          onConfirm={deleteNote}
          title="Delete note"
          message="This action cannot be undone. Are you sure?"
        />
      </div>
    </div>
  );
}

