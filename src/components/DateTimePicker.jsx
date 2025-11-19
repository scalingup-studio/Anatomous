import React from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";

const DateTimePicker = React.memo(function DateTimePicker({ 
  value, 
  onChange, 
  placeholder, 
  minDate, 
  maxDate, 
  className, 
  style, 
  disabled, 
  allowClear = false 
}) {
  const flatpickrRef = React.useRef(null);

  // Parse ISO datetime string (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm)
  const parseLocalIsoDateTime = React.useCallback((iso) => {
    if (!iso || typeof iso !== 'string') return undefined;
    
    // Try to parse as datetime first (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm)
    if (iso.includes('T')) {
      const dateTimeParts = iso.split('T');
      const datePart = dateTimeParts[0];
      const timePart = dateTimeParts[1] || '00:00:00';
      
      const dateParts = datePart.split('-');
      if (dateParts.length !== 3) return undefined;
      
      const y = Number(dateParts[0]);
      const m = Number(dateParts[1]);
      const d = Number(dateParts[2]);
      
      const timeParts = timePart.split(':');
      const hours = Number(timeParts[0]) || 0;
      const minutes = Number(timeParts[1]) || 0;
      const seconds = Number(timeParts[2]) || 0;
      
      if (!y || !m || !d) return undefined;
      return new Date(y, m - 1, d, hours, minutes, seconds);
    }
    
    // Fallback to date-only format (YYYY-MM-DD)
    const parts = iso.split('-');
    if (parts.length !== 3) return undefined;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  }, []);

  // Format date object to ISO datetime string (YYYY-MM-DDTHH:mm)
  const formatLocalIsoDateTime = React.useCallback((dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hours}:${minutes}`;
  }, []);

  const parseDateForFlatpickr = React.useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return undefined;
    return parseLocalIsoDateTime(dateStr);
  }, [parseLocalIsoDateTime]);

  // Memoize parsed dates to avoid recalculation
  const parsedMinDate = React.useMemo(() => {
    return minDate ? parseDateForFlatpickr(minDate) : undefined;
  }, [minDate, parseDateForFlatpickr]);

  const parsedMaxDate = React.useMemo(() => {
    return maxDate ? parseDateForFlatpickr(maxDate) : undefined;
  }, [maxDate, parseDateForFlatpickr]);

  const options = React.useMemo(() => ({
    locale: 'en',
    dateFormat: "Y-m-d H:i", // Internal format for Flatpickr
    altInput: true, // Use alternative input for display
    altFormat: "m/d/Y h:i K", // Display format MM/DD/YYYY HH:MM AM/PM
    allowInput: false, // Disable manual input to prevent format issues
    enableTime: true, // Enable time picker
    time_24hr: false, // Use 12-hour format with AM/PM
    minDate: parsedMinDate,
    maxDate: parsedMaxDate,
    disableMobile: true,
    wrap: false,
  }), [parsedMinDate, parsedMaxDate]);

  // Memoize the parsed value to avoid recalculation on every render
  const parsedValue = React.useMemo(() => {
    return value ? parseLocalIsoDateTime(value) : "";
  }, [value, parseLocalIsoDateTime]);

  // Memoize onChange handler to prevent unnecessary re-renders
  const handleChange = React.useCallback((dates) => {
    const iso = dates?.[0] ? formatLocalIsoDateTime(dates[0]) : "";
    if (onChange) {
      onChange(iso);
    }
  }, [onChange, formatLocalIsoDateTime]);

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
        placeholder={placeholder || "MM/DD/YYYY HH:MM AM/PM"}
        disabled={!!disabled}
      />
      {allowClear && value && (
        <button type="button" className="btn ghost small" onClick={() => onChange && onChange("")}>Clear</button>
      )}
    </div>
  );
});

export default DateTimePicker;

