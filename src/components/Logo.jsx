import React from "react";

export function Logo({ height = 40, className = "" }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}images/logo-anatomous.png`}
      alt="Anatomous"
      height={height}
      style={{ height }}
      className={className}
    />
  );
}


