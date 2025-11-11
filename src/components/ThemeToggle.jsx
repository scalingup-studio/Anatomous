import React from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";

/**
 * Theme Toggle Component
 * Allows users to switch between dark and light themes
 */
export function ThemeToggle({ showLabel = true, size = "default" }) {
  const { theme, toggleTheme, isDark, isLight } = useTheme();

  const buttonSize = size === "small" ? 32 : size === "large" ? 48 : 40;
  const iconSize = size === "small" ? 16 : size === "large" ? 24 : 20;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {showLabel && (
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
          {isDark ? "Dark" : "Light"}
        </span>
      )}
      <button
        onClick={toggleTheme}
        className="btn ghost"
        style={{
          width: buttonSize,
          height: buttonSize,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--card)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.background = "rgba(0, 186, 206, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--card)";
        }}
        title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
        aria-label={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      >
        {isDark ? (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text)" }}
          >
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text)" }}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>
    </div>
  );
}

