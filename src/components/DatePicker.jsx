import React from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";

export default function DatePicker({ value, onChange, placeholder, minDate, maxDate, className, style, disabled, allowClear = false }) {
  const parseLocalIsoDate = React.useCallback((iso) => {
    if (!iso || typeof iso !== 'string') return undefined;
    const parts = iso.split('-');
    if (parts.length !== 3) return undefined;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d); // Local timezone, no UTC shift
  }, []);

  const formatLocalIsoDate = React.useCallback((dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`; // YYYY-MM-DD without timezone shift
  }, []);

  const parseDateForFlatpickr = React.useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return undefined;
    return parseLocalIsoDate(dateStr);
  }, [parseLocalIsoDate]);

  const options = React.useMemo(() => ({
    locale: 'en',
    dateFormat: "m/d/Y",
    // Use a single visible input to avoid duplicates
    allowInput: true,
    minDate: minDate ? parseDateForFlatpickr(minDate) : undefined,
    maxDate: maxDate ? parseDateForFlatpickr(maxDate) : undefined,
    disableMobile: true,
  }), [minDate, maxDate, parseDateForFlatpickr]);

  return (
    <div className={className} style={style}>
      <Flatpickr
        value={value ? parseLocalIsoDate(value) : ""}
        options={options}
        onChange={(dates) => {
          const iso = dates?.[0] ? formatLocalIsoDate(dates[0]) : "";
          onChange && onChange(iso);
        }}
        placeholder={placeholder || "MM/DD/YYYY"}
        disabled={!!disabled}
      />
      {allowClear && value && (
        <button type="button" className="btn ghost small" onClick={() => onChange && onChange("")}>Clear</button>
      )}
    </div>
  );
}


