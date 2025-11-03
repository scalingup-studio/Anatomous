import React from 'react';

export function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Delete", 
  message = "Are you sure you want to delete this item?", 
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false 
}) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          padding: '20px'
        }}
      >
        <div className="modal-header" style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{title}</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body" style={{ marginBottom: '20px' }}>
          <p style={{ margin: 0, color: '#fff' }}>{message}</p>
        </div>
        
        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
