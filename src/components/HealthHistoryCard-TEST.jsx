import React, { useState } from "react";
import DatePicker from "./DatePicker.jsx";

const HealthHistoryCard = ({ 
  title, 
  lastUpdated, 
  hasAddButton = false, 
  buttonLabel = "Add",
  data = [],
  onAdd,
  renderItem 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({});

  const handleAddClick = () => {
    console.log("Add button clicked for:", title);
    setIsAdding(true);
  };

  const handleSave = async () => {
    try {
      console.log("Saving new item:", newItem);
      let itemToSave = {};

      switch (true) {
        case title.includes("Condition"):
          itemToSave = {
            condition_name: newItem.condition_name,
            diagnosis_date: newItem.diagnosis_date || null,
            severity: newItem.severity || null,
            notes: newItem.notes || null,
            status: newItem.status || "active",
            treatment_plan: newItem.treatment_plan || "",
          };
          break;

        case title.includes("Medication"):
          itemToSave = {
            name: newItem.name,
            dosage: newItem.dosage || null,
            frequency: newItem.frequency || null,
            start_date: newItem.start_date || new Date().toISOString().split('T')[0],
            end_date: newItem.end_date || null,
            notes: newItem.notes || null,
          };
          break;

        case title.includes("Allerg"):
          itemToSave = {
            allergy_name: newItem.allergy_name,
            severity: newItem.severity || null,
            notes: newItem.notes || null,
            type: newItem.type || 'other'
          };
          break;

        case title.includes("Surg"):
          itemToSave = {
            procedure_name: newItem.procedure_name,
            surgery_date: newItem.surgery_date || null,
            hospital: newItem.hospital || null,
            surgeon: newItem.surgeon || null,
            reason: newItem.reason || null,
            outcome: newItem.outcome || null,
            complications: newItem.complications || null,
            notes: newItem.notes || null,
          };
          break;

        case title.includes("Vaccin"):
          itemToSave = {
            vaccine_name: newItem.vaccine_name,
            vaccination_date: newItem.vaccination_date || new Date().toISOString().split('T')[0],
            next_due_date: newItem.next_due_date || null,
            administrator: newItem.administrator || null,
            lot_number: newItem.lot_number || null,
            notes: newItem.notes || null,
          };
          break;

        case title.includes("Sensitiv"):
          itemToSave = {
            sensitivity_name: newItem.sensitivity_name,
            type: newItem.type || 'environmental',
            severity: newItem.severity || null,
            triggers: newItem.triggers || null,
            symptoms: newItem.symptoms || null,
            management: newItem.management || null,
            notes: newItem.notes || null,
          };
          break;

        case title.includes("Family"):
          itemToSave = {
            condition_name: newItem.condition_name,
            family_member: newItem.family_member || null,
            age_at_diagnosis: newItem.age_at_diagnosis || null,
            is_genetic: newItem.is_genetic || false,
            relationship_notes: newItem.relationship_notes || null,
            notes: newItem.notes || null,
          };
          break;

        default:
          itemToSave = { name: newItem.name, notes: newItem.notes || null };
      }

      console.log("Sending to API:", itemToSave);
      await onAdd(itemToSave);
      setIsAdding(false);
      setNewItem({});
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewItem({});
  };

  const handleInputChange = (field, value) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getTitleField = () => {
    switch (true) {
      case title.includes("Condition"):
        return "condition_name";
      case title.includes("Medication"):
        return "name";
      case title.includes("Allerg"):
        return "allergy_name";
      case title.includes("Surg"):
        return "procedure_name";
      case title.includes("Vaccin"):
        return "vaccine_name";
      case title.includes("Sensitiv"):
        return "sensitivity_name";
      case title.includes("Family"):
        return "condition_name";
      default:
        return "name";
    }
  };

  const titleField = getTitleField();

  return (
    <div className="border-b pb-6 last:border-b-0">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {lastUpdated && (
            <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
          )}
        </div>
        {hasAddButton && !isAdding && (
          <button
            onClick={handleAddClick}
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors"
          >
            {buttonLabel}
          </button>
        )}
      </div>

      {data && data.length > 0 ? (
        <div className="space-y-3">{data.map(renderItem)}</div>
      ) : (
        <p className="text-gray-500 text-sm">No records found</p>
      )}

      {isAdding && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-medium mb-3">Add New {title}</h4>
          <div className="space-y-3">
            {/* Основне поле назви */}
            <input
              type="text"
              placeholder={`Enter ${title.toLowerCase()}...`}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newItem[titleField] || ""}
              onChange={(e) => handleInputChange(titleField, e.target.value)}
            />

            {/* Медичні стани */}
            {title.includes("Condition") && (
              <>
                <DatePicker
                  value={newItem.diagnosis_date || ""}
                  onChange={(val) => handleInputChange("diagnosis_date", val)}
                />
                <select
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.severity || ""}
                  onChange={(e) => handleInputChange("severity", e.target.value)}
                >
                  <option value="">Select Severity</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
                <textarea
                  placeholder="Treatment plan (optional)"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  value={newItem.treatment_plan || ""}
                  onChange={(e) => handleInputChange("treatment_plan", e.target.value)}
                />
              </>
            )}

            {/* Медикаменти */}
            {title.includes("Medication") && (
              <>
                <input
                  type="text"
                  placeholder="Dosage (e.g., 10mg)"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.dosage || ""}
                  onChange={(e) => handleInputChange("dosage", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Frequency (e.g., once daily)"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.frequency || ""}
                  onChange={(e) => handleInputChange("frequency", e.target.value)}
                />
                <DatePicker 
                  value={newItem.start_date || ""} 
                  onChange={(val) => {
                    handleInputChange("start_date", val);
                    // If end_date is before new start_date, clear it
                    if (newItem.end_date && val && newItem.end_date < val) {
                      handleInputChange("end_date", "");
                    }
                  }}
                  maxDate={newItem.end_date || undefined}
                />
                <DatePicker 
                  value={newItem.end_date || ""} 
                  onChange={(val) => handleInputChange("end_date", val)}
                  minDate={newItem.start_date || undefined}
                />
              </>
            )}

            {/* Алергії */}
            {title.includes("Allerg") && (
              <select
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newItem.severity || ""}
                onChange={(e) => handleInputChange("severity", e.target.value)}
              >
                <option value="">Select Severity</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            )}

            {/* Хірургічні втручання */}
            {title.includes("Surg") && (
              <>
                <DatePicker value={newItem.surgery_date || ""} onChange={(val) => handleInputChange("surgery_date", val)} />
                <input
                  type="text"
                  placeholder="Hospital"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.hospital || ""}
                  onChange={(e) => handleInputChange("hospital", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Surgeon"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.surgeon || ""}
                  onChange={(e) => handleInputChange("surgeon", e.target.value)}
                />
              </>
            )}

            {/* Вакцинації */}
            {title.includes("Vaccin") && (
              <>
                <DatePicker value={newItem.vaccination_date || ""} onChange={(val) => handleInputChange("vaccination_date", val)} />
                <DatePicker value={newItem.next_due_date || ""} onChange={(val) => handleInputChange("next_due_date", val)} />
                <input
                  type="text"
                  placeholder="Administrator"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.administrator || ""}
                  onChange={(e) => handleInputChange("administrator", e.target.value)}
                />
              </>
            )}

            {/* Чутливості */}
            {title.includes("Sensitiv") && (
              <>
                <input
                  type="text"
                  placeholder="Type (e.g., environmental, chemical)"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.type || ""}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Severity"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newItem.severity || ""}
                  onChange={(e) => handleInputChange("severity", e.target.value)}
                />
                <textarea
                  placeholder="Triggers"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  value={newItem.triggers || ""}
                  onChange={(e) => handleInputChange("triggers", e.target.value)}
                />
              </>
            )}

            {/* Сімейна історія */}
            {title.includes("Family") && (
              <>
                <select
                  value={newItem.family_member || ""}
                  onChange={(e) => handleInputChange("family_member", e.target.value)}
                >
                  <option value="">Select Family Member</option>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="sibling">Sibling</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="child">Child</option>
                  <option value="aunt/uncle">Aunt/Uncle</option>
                  <option value="cousin">Cousin</option>
                </select>
                <input
                  type="number"
                  placeholder="Age at diagnosis"
                  value={newItem.age_at_diagnosis || ""}
                  onChange={(e) => handleInputChange("age_at_diagnosis", e.target.value)}
                />
                <div className="checkbox">
                  <input
                    type="checkbox"
                    id="is_genetic"
                    checked={newItem.is_genetic || false}
                    onChange={(e) => handleInputChange("is_genetic", e.target.checked)}
                  />
                  <label htmlFor="is_genetic">Genetic condition</label>
                </div>
              </>
            )}

            {/* Загальні нотатки для всіх типів */}
            <textarea
              placeholder="Additional notes (optional)"
              rows="2"
              value={newItem.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
            />

            <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={handleCancel}
                className="btn outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newItem[titleField]}
                className="btn success"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthHistoryCard;