import React from "react";
import DatePicker from "./DatePicker.jsx";

const MetricsTable = ({ metrics = [], onChange, onSave }) => {
  if (!metrics.length) return <p>No health metrics available.</p>;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        color: "white",
      }}
    >
      <thead>
        <tr>
          <th>Date</th>
          <th>Heart Rate</th>
          <th>BP SYS/DIA</th>
          <th>Sleep Hours</th>
          <th>Activity</th>
          <th>Visibility</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m, index) => {
          const key = m.id || m.tempId || `metric-${index}`;
          return (
            <tr key={key} style={{ borderBottom: "1px solid #ccc" }}>
              <td>
                <DatePicker value={m.date || ""} onChange={(val) => onChange(key, "date", val)} />
              </td>
              <td>
                <input
                  type="number"
                  value={m.heart_rate || 0}
                  onChange={(e) => onChange(key, "heart_rate", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={m.blood_pressure_systolic || 0}
                  onChange={(e) =>
                    onChange(key, "blood_pressure_systolic", e.target.value)
                  }
                  style={{ width: "60px" }}
                />
                /
                <input
                  type="number"
                  value={m.blood_pressure_diastolic || 0}
                  onChange={(e) =>
                    onChange(key, "blood_pressure_diastolic", e.target.value)
                  }
                  style={{ width: "60px" }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={m.sleep_hours || 0}
                  onChange={(e) => onChange(key, "sleep_hours", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={m.activity_level || 0}
                  onChange={(e) => onChange(key, "activity_level", e.target.value)}
                />
              </td>
              <td>
                <select
                  value={m.visibility_scope || "private"}
                  onChange={(e) =>
                    onChange(key, "visibility_scope", e.target.value)
                  }
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                  <option value="family">Family</option>
                </select>
              </td>
              <td>
                <button onClick={() => onSave(m)}>Save</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default MetricsTable;
