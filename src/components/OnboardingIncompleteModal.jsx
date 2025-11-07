import React from "react";
import { Modal } from "./Modal.jsx";

export function OnboardingIncompleteModal({ open, onContinue, onSkip }) {
  return (
    <Modal
      open={open}
      title="Incomplete Onboarding"
      onClose={onSkip}
    >
      <div style={{ padding: "20px 0" }}>
        <p style={{ marginBottom: "24px", color: "var(--text)", lineHeight: "1.6" }}>
          You have incomplete onboarding steps. Would you like to continue?
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            className="btn outline"
            onClick={onSkip}
            style={{ minWidth: "100px" }}
          >
            Skip
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onContinue) {
                onContinue(e);
              }
            }}
            style={{ minWidth: "100px" }}
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}

