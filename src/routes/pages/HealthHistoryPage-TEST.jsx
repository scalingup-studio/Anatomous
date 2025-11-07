import React, { useState, useEffect } from "react";
import DatePicker from "../../components/DatePicker.jsx";
import HealthHistoryCard from "../../components/HealthHistoryCard-TEST";
import { HealthHistoryApi } from "../../api/healthHistoryApi";
import { useAuth } from "../../api/AuthContext";

const HealthHistoryPage = () => {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState({
    user_medical_condition: [],
    user_medications: [],
    user_allergies: [],
    user_surgical_history: [],
    user_vaccinations: [],
    user_sensitivities: [],
    user_family_history: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });

  // Завантаження даних при монтуванні
  useEffect(() => {
    if (user?.id) {
      loadHealthDataSummary();
    }
  }, [user]);

  const loadHealthDataSummary = async () => {
    try {
      setLoading(true);
      const data = await HealthHistoryApi.getHealthHistorySummary(user.id);
      setHealthData(data);
    } catch (error) {
      console.error("Error loading health data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Функції додавання елементів
  const handleAddMedicalCondition = async (conditionData) => {
    try {
      await HealthHistoryApi.addMedicalCondition({
        user_id: user.id,
        condition_name: conditionData.condition_name,
        diagnosis_date: conditionData.diagnosis_date || null,
        severity: conditionData.severity || null,
        notes: conditionData.notes || null,
        status: conditionData.status || 'active',
        treatment_plan: conditionData.treatment_plan || ""
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding medical condition:", error);
    }
  };

  const handleAddMedication = async (medicationData) => {
    try {
      await HealthHistoryApi.addMedication({
        user_id: user.id,
        name: medicationData.name,
        dosage: medicationData.dosage || null,
        frequency: medicationData.frequency || null,
        start_date: medicationData.start_date || new Date().toISOString().split('T')[0],
        end_date: medicationData.end_date || null,
        notes: medicationData.notes || null
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding medication:", error);
    }
  };

  const handleAddAllergy = async (allergyData) => {
    try {
      await HealthHistoryApi.addAllergy({
        user_id: user.id,
        allergy_name: allergyData.allergy_name,
        severity: allergyData.severity || null,
        notes: allergyData.notes || null,
        type: allergyData.type || 'other'
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding allergy:", error);
    }
  };

  const handleAddSurgicalHistory = async (surgeryData) => {
    try {
      await HealthHistoryApi.addSurgicalHistory({
        user_id: user.id,
        procedure_name: surgeryData.procedure_name,
        surgery_date: surgeryData.surgery_date || null,
        hospital: surgeryData.hospital || null,
        surgeon: surgeryData.surgeon || null,
        reason: surgeryData.reason || null,
        outcome: surgeryData.outcome || null,
        complications: surgeryData.complications || null,
        notes: surgeryData.notes || null
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding surgical history:", error);
    }
  };

  const handleAddVaccination = async (vaccinationData) => {
    try {
      await HealthHistoryApi.addVaccination({
        user_id: user.id,
        vaccine_name: vaccinationData.vaccine_name,
        vaccination_date: vaccinationData.vaccination_date || new Date().toISOString().split('T')[0],
        next_due_date: vaccinationData.next_due_date || null,
        administrator: vaccinationData.administrator || null,
        lot_number: vaccinationData.lot_number || null,
        notes: vaccinationData.notes || null
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding vaccination:", error);
    }
  };

  const handleAddSensitivity = async (sensitivityData) => {
    try {
      await HealthHistoryApi.addSensitivity({
        user_id: user.id,
        sensitivity_name: sensitivityData.sensitivity_name,
        type: sensitivityData.type || 'environmental',
        severity: sensitivityData.severity || null,
        triggers: sensitivityData.triggers || null,
        symptoms: sensitivityData.symptoms || null,
        management: sensitivityData.management || null,
        notes: sensitivityData.notes || null
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding sensitivity:", error);
    }
  };

  const handleAddFamilyHistory = async (familyHistoryData) => {
    try {
      await HealthHistoryApi.addFamilyHistory({
        user_id: user.id,
        condition_name: familyHistoryData.condition_name,
        family_member: familyHistoryData.family_member || null,
        age_at_diagnosis: familyHistoryData.age_at_diagnosis || null,
        is_genetic: familyHistoryData.is_genetic || false,
        relationship_notes: familyHistoryData.relationship_notes || null,
        notes: familyHistoryData.notes || null
      });
      await loadHealthDataSummary();
    } catch (error) {
      console.error("Error adding family history:", error);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading health data...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-red-500">User not authenticated</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Health History</h1>
        <div className="flex items-center space-x-2">
          <DatePicker 
            value={dateRange.startDate} 
            onChange={(val) => {
              handleDateRangeChange('startDate', val);
              // If endDate is before new startDate, clear it
              if (dateRange.endDate && val && dateRange.endDate < val) {
                handleDateRangeChange('endDate', '');
              }
            }}
            maxDate={dateRange.endDate || undefined}
          />
          <span>→</span>
          <DatePicker 
            value={dateRange.endDate} 
            onChange={(val) => handleDateRangeChange('endDate', val)}
            minDate={dateRange.startDate || undefined}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6 max-w-2xl space-y-6">
        {/* Medical Conditions */}
        <HealthHistoryCard 
          title="Medical Conditions" 
          lastUpdated={healthData.user_medical_condition?.[0]?.last_updated ? new Date(healthData.user_medical_condition[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_medical_condition || []}
          hasAddButton 
          buttonLabel="Add Condition"
          onAdd={handleAddMedicalCondition}
          renderItem={(condition) => (
            <div key={condition.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{condition.condition_name}</p>
              {condition.diagnosis_date && (
                <p className="text-sm text-gray-600">
                  Diagnosed: {new Date(condition.diagnosis_date).toLocaleDateString()}
                </p>
              )}
              {condition.severity && (
                <p className="text-sm text-gray-600">
                  Severity: <span className={`font-medium ${
                    condition.severity === 'Severe' ? 'text-red-600' : 
                    condition.severity === 'Moderate' ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {condition.severity}
                  </span>
                </p>
              )}
              {condition.status && (
                <p className="text-sm text-gray-600">Status: {condition.status}</p>
              )}
              {condition.treatment_plan && (
                <p className="text-sm text-gray-600">Treatment: {condition.treatment_plan}</p>
              )}
              {condition.notes && (
                <p className="text-sm text-gray-600">{condition.notes}</p>
              )}
            </div>
          )}
        />

        {/* Current Medications */}
        <HealthHistoryCard 
          title="Current Medications" 
          lastUpdated={healthData.user_medications?.[0]?.last_updated ? new Date(healthData.user_medications[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_medications || []}
          hasAddButton 
          buttonLabel="Add Medication"
          onAdd={handleAddMedication}
          renderItem={(medication) => (
            <div key={medication.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{medication.name}</p>
              <p className="text-sm text-gray-600">
                {medication.dosage && `${medication.dosage} •`} {medication.frequency}
              </p>
              {medication.start_date && (
                <p className="text-sm text-gray-600">
                  Start: {new Date(medication.start_date).toLocaleDateString()}
                </p>
              )}
              {medication.end_date && (
                <p className="text-sm text-gray-600">
                  End: {new Date(medication.end_date).toLocaleDateString()}
                </p>
              )}
              {medication.notes && (
                <p className="text-sm text-gray-600">{medication.notes}</p>
              )}
            </div>
          )}
        />

        {/* Known Allergies */}
        <HealthHistoryCard 
          title="Known Allergies" 
          lastUpdated={healthData.user_allergies?.[0]?.last_updated ? new Date(healthData.user_allergies[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_allergies || []}
          hasAddButton 
          buttonLabel="Add Allergy"
          onAdd={handleAddAllergy}
          renderItem={(allergy) => (
            <div key={allergy.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{allergy.allergy_name}</p>
              {allergy.severity && (
                <p className="text-sm text-gray-600">
                  Severity: <span className={`font-medium ${
                    allergy.severity === 'Severe' ? 'text-red-600' : 
                    allergy.severity === 'Moderate' ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {allergy.severity}
                  </span>
                </p>
              )}
              {allergy.type && (
                <p className="text-sm text-gray-600">Type: {allergy.type}</p>
              )}
              {allergy.notes && (
                <p className="text-sm text-gray-600">{allergy.notes}</p>
              )}
            </div>
          )}
        />

        {/* Surgical History */}
        <HealthHistoryCard 
          title="Surgical History" 
          lastUpdated={healthData.user_surgical_history?.[0]?.last_updated ? new Date(healthData.user_surgical_history[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_surgical_history || []}
          hasAddButton 
          buttonLabel="Add Surgery"
          onAdd={handleAddSurgicalHistory}
          renderItem={(surgery) => (
            <div key={surgery.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{surgery.procedure_name}</p>
              {surgery.surgery_date && (
                <p className="text-sm text-gray-600">
                  Date: {new Date(surgery.surgery_date).toLocaleDateString()}
                </p>
              )}
              {surgery.hospital && (
                <p className="text-sm text-gray-600">Hospital: {surgery.hospital}</p>
              )}
              {surgery.surgeon && (
                <p className="text-sm text-gray-600">Surgeon: {surgery.surgeon}</p>
              )}
              {surgery.reason && (
                <p className="text-sm text-gray-600">Reason: {surgery.reason}</p>
              )}
              {surgery.notes && (
                <p className="text-sm text-gray-600">{surgery.notes}</p>
              )}
            </div>
          )}
        />

        {/* Vaccination History */}
        <HealthHistoryCard 
          title="Vaccination History" 
          lastUpdated={healthData.user_vaccinations?.[0]?.last_updated ? new Date(healthData.user_vaccinations[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_vaccinations || []}
          hasAddButton 
          buttonLabel="Add Vaccination"
          onAdd={handleAddVaccination}
          renderItem={(vaccination) => (
            <div key={vaccination.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{vaccination.vaccine_name}</p>
              {vaccination.vaccination_date && (
                <p className="text-sm text-gray-600">
                  Date: {new Date(vaccination.vaccination_date).toLocaleDateString()}
                </p>
              )}
              {vaccination.next_due_date && (
                <p className="text-sm text-gray-600">
                  Next due: {new Date(vaccination.next_due_date).toLocaleDateString()}
                </p>
              )}
              {vaccination.administrator && (
                <p className="text-sm text-gray-600">Administered by: {vaccination.administrator}</p>
              )}
              {vaccination.notes && (
                <p className="text-sm text-gray-600">{vaccination.notes}</p>
              )}
            </div>
          )}
        />

        {/* Environmental & Chemical Sensitivities */}
        <HealthHistoryCard 
          title="Environmental & Chemical Sensitivities" 
          lastUpdated={healthData.user_sensitivities?.[0]?.last_updated ? new Date(healthData.user_sensitivities[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_sensitivities || []}
          hasAddButton 
          buttonLabel="Add Sensitivity"
          onAdd={handleAddSensitivity}
          renderItem={(sensitivity) => (
            <div key={sensitivity.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{sensitivity.sensitivity_name}</p>
              {sensitivity.type && (
                <p className="text-sm text-gray-600">Type: {sensitivity.type}</p>
              )}
              {sensitivity.severity && (
                <p className="text-sm text-gray-600">Severity: {sensitivity.severity}</p>
              )}
              {sensitivity.triggers && (
                <p className="text-sm text-gray-600">Triggers: {sensitivity.triggers}</p>
              )}
              {sensitivity.notes && (
                <p className="text-sm text-gray-600">{sensitivity.notes}</p>
              )}
            </div>
          )}
        />

        {/* Family Health History */}
        <HealthHistoryCard 
          title="Family Health History" 
          lastUpdated={healthData.user_family_history?.[0]?.last_updated ? new Date(healthData.user_family_history[0].last_updated).toLocaleDateString() : "Not updated"}
          data={healthData.user_family_history || []}
          hasAddButton 
          buttonLabel="Add Family History"
          onAdd={handleAddFamilyHistory}
          renderItem={(familyHistory) => (
            <div key={familyHistory.id} className="border-b pb-2 mb-2">
              <p className="font-medium">{familyHistory.condition_name}</p>
              <p className="text-sm text-gray-600">
                Family Member: {familyHistory.family_member}
              </p>
              {familyHistory.age_at_diagnosis && (
                <p className="text-sm text-gray-600">Age at diagnosis: {familyHistory.age_at_diagnosis}</p>
              )}
              {familyHistory.is_genetic && (
                <p className="text-sm text-gray-600">Genetic condition: Yes</p>
              )}
              {familyHistory.notes && (
                <p className="text-sm text-gray-600">{familyHistory.notes}</p>
              )}
            </div>
          )}
        />
      </div>
    </main>
  );
};

export default HealthHistoryPage;