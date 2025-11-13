import React from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

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
  const { isLight } = useTheme();
  
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
        background: isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)',
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
          background: isLight ? '#ffffff' : '#111',
          border: isLight ? '1px solid #e5e7eb' : '1px solid #333',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%',
          padding: '20px',
          boxShadow: isLight 
            ? '0 10px 25px rgba(0, 0, 0, 0.15)' 
            : '0 10px 25px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="modal-header" style={{ 
          marginBottom: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <h3 style={{ 
            margin: 0, 
            color: isLight ? '#111827' : '#fff',
            fontSize: '18px',
            fontWeight: 600
          }}>{title}</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isLight ? '#6b7280' : '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isLight ? '#111827' : '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isLight ? '#6b7280' : '#fff';
            }}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body" style={{ marginBottom: '20px' }}>
          <p style={{ 
            margin: 0, 
            color: isLight ? '#374151' : '#fff',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>{message}</p>
        </div>
        
        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: isLight ? '#f3f4f6' : '#333',
              color: isLight ? '#374151' : '#fff',
              border: isLight ? '1px solid #d1d5db' : '1px solid #555',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLight ? '#e5e7eb' : '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isLight ? '#f3f4f6' : '#333';
            }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#b91c1c';
                e.currentTarget.style.borderColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.borderColor = '#dc2626';
              }
            }}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
