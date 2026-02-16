// Centralized access to environment-based API configuration
// Main Xano base URL (without per-group :slug suffixes)
// Example value: "https://xu6p-ejbd-2ew4.n7e.xano.io"
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL && typeof console !== "undefined") {
  console.warn(
    "[configEnv] VITE_API_BASE_URL is not defined. " +
    "Please set it in your .env files (e.g. .env.local, .env.production)."
  );
}


