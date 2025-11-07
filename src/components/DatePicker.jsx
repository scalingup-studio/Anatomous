import React from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";

const DatePicker = React.memo(function DatePicker({ value, onChange, placeholder, minDate, maxDate, className, style, disabled, allowClear = false }) {
  const flatpickrRef = React.useRef(null);

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

  // Memoize parsed dates to avoid recalculation
  const parsedMinDate = React.useMemo(() => {
    return minDate ? parseDateForFlatpickr(minDate) : undefined;
  }, [minDate, parseDateForFlatpickr]);

  const parsedMaxDate = React.useMemo(() => {
    return maxDate ? parseDateForFlatpickr(maxDate) : undefined;
  }, [maxDate, parseDateForFlatpickr]);

  const options = React.useMemo(() => ({
    locale: 'en',
    dateFormat: "Y-m-d", // Internal format for Flatpickr
    altInput: true, // Use alternative input for display
    altFormat: "m/d/Y", // Display format MM/DD/YYYY
    allowInput: false, // Disable manual input to prevent format issues
    minDate: parsedMinDate,
    maxDate: parsedMaxDate,
    disableMobile: true,
    // Disable time picker to avoid time in display
    enableTime: false,
    // Ensure consistent format
    wrap: false,
  }), [parsedMinDate, parsedMaxDate]);

  // Memoize the parsed value to avoid recalculation on every render
  const parsedValue = React.useMemo(() => {
    return value ? parseLocalIsoDate(value) : "";
  }, [value, parseLocalIsoDate]);

  // Memoize onChange handler to prevent unnecessary re-renders
  const handleChange = React.useCallback((dates) => {
    const iso = dates?.[0] ? formatLocalIsoDate(dates[0]) : "";
    if (onChange) {
      onChange(iso);
    }
  }, [onChange, formatLocalIsoDate]);

  // Store instance reference when ready
  const handleReady = React.useCallback((selectedDates, dateStr, instance) => {
    if (instance) {
      flatpickrRef.current = instance;
    }
  }, []);

  return (
    <div className={className} style={style}>
      <Flatpickr
        value={parsedValue}
        options={options}
        onChange={handleChange}
        onReady={handleReady}
        placeholder={placeholder || "MM/DD/YYYY"}
        disabled={!!disabled}
      />
      {allowClear && value && (
        <button type="button" className="btn ghost small" onClick={() => onChange && onChange("")}>Clear</button>
      )}
    </div>
  );
});

export default DatePicker;


