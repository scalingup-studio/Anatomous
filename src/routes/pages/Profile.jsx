import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { authRequest } from "../../api/apiClient.js";
import { useAuth } from "../../api/AuthContext.jsx";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { ProfilesApi } from "../../api/profilesApi.js";
import { UploadFileApi } from "../../api/uploadFileApi.js";
import { HealthApi } from "../../api/healthApi.js";
import { ENDPOINTS, CUSTOM_ENDPOINTS } from "../../api/apiConfig.js";
import { HealthHistoryApi, HealthHistoryConsolidated } from "../../api/healthHistoryApi.js";
import HealthHistoryCard from "../../components/HealthHistoryCard-TEST.jsx";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal.jsx";

export default function DashboardProfile() {
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotifications();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const fileInputRef = useRef(null);
  const [formValues, setFormValues] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    dob: "",
    gender: "",
    sex_of_birth: "",
    height_cm: "",
    weight_kg: "",
    zip_code: "",
    user_id: "",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    const allowed = ['personal', 'health_history', 'health_data'];
    return allowed.includes(t) ? t : 'personal';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    const allowed = ['personal', 'health_history', 'health_data'];
    if (allowed.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const changeTab = (next) => {
    if (next === activeTab) return;
    setActiveTab(next);
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      sp.set('tab', next);
      return sp;
    }, { replace: true });
  };
  const [healthHistory, setHealthHistory] = useState({
    medical_conditions: [],
    medications: [],
    allergies: [],
    surgical_history: [],
    vaccinations: [],
    sensitivities: [],
    family_history: [],
  });

  // Track last updated timestamps for each section
  const [lastUpdated, setLastUpdated] = useState({
    medical_conditions: null,
    medications: null,
    allergies: null,
    surgical_history: null,
    vaccinations: null,
    sensitivities: null,
    family_history: null,
  });

  // Health Data state
  const [healthData, setHealthData] = useState({
    date: new Date().toISOString().split('T')[0],
    heart_rate: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    weekly_activity_minutes: '',
    activity_level: '',
    visibility_scope: 'private',
    hydration_liters: '',
    pulse_oximetry: '',
    respiratory_rate: '',
    body_weight_trend: '',
    body_mass_index: '',
    fasting_glucose: '',
    body_temperature: ''
  });

  const [healthDataRecords, setHealthDataRecords] = useState([]);
  const [loadingHealthData, setLoadingHealthData] = useState(false);
  const [isHealthDataModalOpen, setIsHealthDataModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Health history add modal state
  const [isAddHistoryModalOpen, setIsAddHistoryModalOpen] = useState(false);
  const [addHistorySectionKey, setAddHistorySectionKey] = useState(null);
  const [addHistoryForm, setAddHistoryForm] = useState({});
  const [editingHistoryItem, setEditingHistoryItem] = useState(null);
  const [editingHistorySectionKey, setEditingHistorySectionKey] = useState(null);
  // Per-section saving states to avoid disabling neighboring blocks
  const [savingHistory, setSavingHistory] = useState({
    medical_conditions: false,
    medications: false,
    allergies: false,
    surgical_history: false,
    vaccinations: false,
    sensitivities: false,
    family_history: false,
  });
  // Dedicated saving state for Add modal
  const [savingAddHistory, setSavingAddHistory] = useState(false);
  // Delete confirmation modal state for Health History
  const [isDeleteHistoryModalOpen, setIsDeleteHistoryModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [sectionKeyToDelete, setSectionKeyToDelete] = useState(null);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  // Delete modal management
  useEffect(() => {
    if (isDeleteModalOpen && recordToDelete) {
      // Create modal directly in DOM
      const modal = document.createElement('div');
      modal.id = 'delete-confirmation-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
      `;
      
      // Add CSS animation
      if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { 
              opacity: 0;
              transform: scale(0.9) translateY(-20px);
            }
            to { 
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: rgba(17, 17, 17, 0.95);
        border: 1px solid #222222;
        border-radius: 16px;
        max-width: 420px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 186, 206, 0.1);
        animation: slideIn 0.3s ease-out;
        position: relative;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      `;
      
      modalContent.innerHTML = `
        <!-- Header -->
        <div style="padding: 24px 24px 20px; border-bottom: 1px solid #222222; background: linear-gradient(135deg, rgba(255, 76, 76, 0.1) 0%, rgba(17, 17, 17, 0.8) 100%); position: relative;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 40px; height: 40px; background: rgba(255, 76, 76, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 76, 76, 0.3);">
              <span style="font-size: 20px;">⚠️</span>
            </div>
            <h3 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">
              Delete Health Data Record
            </h3>
          </div>
          <p style="margin: 0; color: #cccccc; font-size: 14px; line-height: 1.5;">
            This action cannot be undone. Please confirm that you want to permanently delete this health data record.
          </p>
          <button id="close-modal-btn" style="
            position: absolute;
            top: 20px;
            right: 20px;
            width: 32px;
            height: 32px;
            background: rgba(34, 34, 34, 0.8);
            border: 1px solid #333333;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #cccccc;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(0, 186, 206, 0.2)'; this.style.borderColor='#00bace'; this.style.color='#ffffff';" onmouseout="this.style.background='rgba(34, 34, 34, 0.8)'; this.style.borderColor='#333333'; this.style.color='#cccccc';">
            ✕
          </button>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <!-- Record Details -->
          <div style="background: rgba(17, 17, 17, 0.6); border: 1px solid #333333; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 16px 0; color: #00bace; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              Record Details
            </h4>
            <div style="space-y: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333333;">
                <span style="color: #777777; font-size: 13px; font-weight: 500;">Date:</span>
                <span style="color: #ffffff; font-size: 13px; font-weight: 600;">${recordToDelete.date || 'Unknown'}</span>
              </div>
              ${recordToDelete.heart_rate ? `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333333;">
                  <span style="color: #777777; font-size: 13px; font-weight: 500;">Heart Rate:</span>
                  <span style="color: #ffffff; font-size: 13px; font-weight: 600;">${recordToDelete.heart_rate} bpm</span>
                </div>
              ` : ''}
              ${recordToDelete.blood_pressure_systolic && recordToDelete.blood_pressure_diastolic ? `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                  <span style="color: #777777; font-size: 13px; font-weight: 500;">Blood Pressure:</span>
                  <span style="color: #ffffff; font-size: 13px; font-weight: 600;">${recordToDelete.blood_pressure_systolic}/${recordToDelete.blood_pressure_diastolic}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 24px 24px; border-top: 1px solid #222222; background: rgba(17, 17, 17, 0.8); display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-delete-btn" style="
            padding: 12px 20px;
            background: transparent;
            color: #cccccc;
            border: 1px solid #333333;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 80px;
          " onmouseover="this.style.background='rgba(0, 186, 206, 0.1)'; this.style.borderColor='#00bace'; this.style.color='#ffffff';" onmouseout="this.style.background='transparent'; this.style.borderColor='#333333'; this.style.color='#cccccc';">
            Cancel
          </button>
          <button id="confirm-delete-btn" style="
            padding: 12px 20px;
            background: linear-gradient(135deg, #ff4c4c 0%, #cc3a3a 100%);
            color: white;
            border: 1px solid #ff4c4c;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            min-width: 80px;
            box-shadow: 0 4px 12px rgba(255, 76, 76, 0.3);
          " onmouseover="this.style.filter='brightness(1.1)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(255, 76, 76, 0.4)';" onmouseout="this.style.filter='brightness(1)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(255, 76, 76, 0.3)';">
            Delete Record
          </button>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Add event listeners
      const cancelBtn = document.getElementById('cancel-delete-btn');
      const confirmBtn = document.getElementById('confirm-delete-btn');
      const closeBtn = document.getElementById('close-modal-btn');
      
      const closeModal = () => {
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
        modal.remove();
      };
      
      cancelBtn.addEventListener('click', closeModal);
      closeBtn.addEventListener('click', closeModal);
      confirmBtn.addEventListener('click', async () => {
        try {
          await HealthApi.deleteRecord(user.id, recordToDelete.id);
          showSuccess('Health data record deleted successfully!');
          await loadHealthData();
          closeModal();
        } catch (error) {
          console.error('Error deleting health data:', error);
          showError('Failed to delete health data record. Please try again.');
        }
      });
      
      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
      
    } else if (!isDeleteModalOpen) {
      // Remove modal if exists
      const existingModal = document.getElementById('delete-confirmation-modal');
      if (existingModal) {
        existingModal.remove();
      }
    }
  }, [isDeleteModalOpen, recordToDelete]);

  // Test data for HealthHistoryCard
  const [testData, setTestData] = useState({
    medical_conditions: [
      { id: 1, condition_name: "Hypertension", diagnosis_date: "2020-01-15", severity: "moderate", notes: "Controlled with medication" },
      { id: 2, condition_name: "Diabetes Type 2", diagnosis_date: "2019-03-20", severity: "mild", notes: "Diet controlled" }
    ],
    medications: [
      { id: 1, name: "Metformin", dosage: "500mg", frequency: "twice daily", start_date: "2019-03-20", notes: "For diabetes management" },
      { id: 2, name: "Lisinopril", dosage: "10mg", frequency: "once daily", start_date: "2020-01-15", notes: "For blood pressure" }
    ],
    allergies: [
      { id: 1, allergy_name: "Penicillin", severity: "severe", notes: "Causes rash and difficulty breathing" },
      { id: 2, allergy_name: "Shellfish", severity: "moderate", notes: "Causes stomach upset" }
    ],
    surgical_history: [
      { id: 1, procedure_name: "Appendectomy", surgery_date: "2015-06-10", hospital: "City General Hospital", surgeon: "Dr. Smith", notes: "Recovery was smooth" }
    ],
    vaccinations: [
      { id: 1, vaccine_name: "COVID-19", vaccination_date: "2021-03-15", administrator: "Dr. Johnson", notes: "Pfizer vaccine" },
      { id: 2, vaccine_name: "Flu Shot", vaccination_date: "2023-10-01", administrator: "CVS Pharmacy", notes: "Annual vaccination" }
    ],
    sensitivities: [
      { id: 1, sensitivity_name: "Latex", type: "environmental", severity: "mild", notes: "Causes skin irritation" }
    ],
    family_history: [
      { id: 1, condition_name: "Heart Disease", family_member: "father", age_at_diagnosis: 55, is_genetic: true, notes: "Father had heart attack at 55" }
    ]
  });

  // Function to handle adding new items to test data
  const handleAddTestItem = async (itemData) => {
    console.log('Adding test item:', itemData);
    
    // Determine which category based on the data structure
    let category = 'medical_conditions';
    if (itemData.name) category = 'medications';
    else if (itemData.allergy_name) category = 'allergies';
    else if (itemData.procedure_name) category = 'surgical_history';
    else if (itemData.vaccine_name) category = 'vaccinations';
    else if (itemData.sensitivity_name) category = 'sensitivities';
    else if (itemData.family_member) category = 'family_history';
    
    // Add new item with unique ID
    const newItem = {
      id: Date.now(), // Simple ID generation
      ...itemData
    };
    
    setTestData(prev => ({
      ...prev,
      [category]: [...prev[category], newItem]
    }));
    
    showSuccess(`${category.replace('_', ' ')} added successfully!`);
  };

  // Health Data functions
  const handleHealthDataChange = (field, value) => {
    setHealthData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveHealthData = async () => {
    // If editing, use update function
    if (editingRecord) {
      await handleUpdateHealthData();
      return;
    }

    try {
      setSaving(true);
      
      // Validate data before sending
      const validateHealthData = (data) => {
        const errors = [];
        
        if (data.heart_rate && (data.heart_rate < 30 || data.heart_rate > 200)) {
          errors.push('Heart rate should be between 30-200 bpm');
        }
        if (data.blood_pressure_systolic && (data.blood_pressure_systolic < 70 || data.blood_pressure_systolic > 250)) {
          errors.push('Systolic blood pressure should be between 70-250 mmHg');
        }
        if (data.blood_pressure_diastolic && (data.blood_pressure_diastolic < 40 || data.blood_pressure_diastolic > 150)) {
          errors.push('Diastolic blood pressure should be between 40-150 mmHg');
        }
        if (data.pulse_oximetry && (data.pulse_oximetry < 70 || data.pulse_oximetry > 100)) {
          errors.push('Pulse oximetry should be between 70-100%');
        }
        if (data.respiratory_rate && (data.respiratory_rate < 8 || data.respiratory_rate > 40)) {
          errors.push('Respiratory rate should be between 8-40 breaths/min');
        }
        if (data.body_mass_index && (data.body_mass_index < 10 || data.body_mass_index > 60)) {
          errors.push('BMI should be between 10-60');
        }
        if (data.fasting_glucose && (data.fasting_glucose < 50 || data.fasting_glucose > 500)) {
          errors.push('Fasting glucose should be between 50-500 mg/dL');
        }
        if (data.body_temperature && (data.body_temperature < 30 || data.body_temperature > 45)) {
          errors.push('Body temperature should be between 30-45°C');
        }
        if (data.activity_level && (data.activity_level < 1 || data.activity_level > 5)) {
          errors.push('Activity level should be between 1-5');
        }
        
        return errors;
      };
      
      // Prepare data for API
      const healthDataPayload = {
        user_id: user.id,
        ...healthData,
        // Convert string values to appropriate types
        heart_rate: healthData.heart_rate ? parseInt(healthData.heart_rate) : null,
        blood_pressure_systolic: healthData.blood_pressure_systolic ? parseInt(healthData.blood_pressure_systolic) : null,
        blood_pressure_diastolic: healthData.blood_pressure_diastolic ? parseInt(healthData.blood_pressure_diastolic) : null,
        weekly_activity_minutes: healthData.weekly_activity_minutes ? parseFloat(healthData.weekly_activity_minutes) : null,
        activity_level: healthData.activity_level ? parseInt(healthData.activity_level) : null,
        hydration_liters: healthData.hydration_liters ? parseFloat(healthData.hydration_liters) : null,
        pulse_oximetry: healthData.pulse_oximetry ? parseInt(healthData.pulse_oximetry) : null,
        respiratory_rate: healthData.respiratory_rate ? parseInt(healthData.respiratory_rate) : null,
        body_mass_index: healthData.body_mass_index ? parseFloat(healthData.body_mass_index) : null,
        fasting_glucose: healthData.fasting_glucose ? parseFloat(healthData.fasting_glucose) : null,
        body_temperature: healthData.body_temperature ? parseFloat(healthData.body_temperature) : null,
      };
      
      // Validate data
      const validationErrors = validateHealthData(healthDataPayload);
      if (validationErrors.length > 0) {
        showError(`Please check your data: ${validationErrors.join(', ')}`);
        return;
      }

      console.log('Saving health data:', healthDataPayload);

      // Call API endpoint using HealthApi
      const response = await HealthApi.create(healthDataPayload);

      console.log('Health data API response:', response);

      // Add to local state for immediate UI update
      const newRecord = {
        id: response.id || Date.now(),
        ...healthDataPayload,
        created_at: response.created_at || new Date().toISOString()
      };

      setHealthDataRecords(prev => [newRecord, ...prev]);
      
      // Reset form
      setHealthData({
        date: new Date().toISOString().split('T')[0],
        heart_rate: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        weekly_activity_minutes: '',
        activity_level: '',
        visibility_scope: 'private',
        hydration_liters: '',
        pulse_oximetry: '',
        respiratory_rate: '',
        body_weight_trend: '',
        body_mass_index: '',
        fasting_glucose: '',
        body_temperature: ''
      });

      showSuccess('Health data saved successfully!');
      setIsHealthDataModalOpen(false); // Close modal after successful save
    } catch (error) {
      console.error('Error saving health data:', error);
      showError('Failed to save health data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete health data record
  const handleDeleteHealthData = async (recordId) => {
    const record = healthDataRecords.find(r => r.id === recordId);
    if (record) {
      setRecordToDelete(record);
      setIsDeleteModalOpen(true);
    }
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      setDeletingRecordId(recordToDelete.id);
      await HealthApi.deleteRecord(user.id, recordToDelete.id);
      showSuccess('Health data record deleted successfully!');
      // Reload data after deletion
      await loadHealthData();
    } catch (error) {
      console.error('Error deleting health data:', error);
      showError('Failed to delete health data record. Please try again.');
    } finally {
      setDeletingRecordId(null);
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  };

  // Confirm delete Health History item
  const handleConfirmDeleteHistory = async () => {
    if (!itemToDelete || !sectionKeyToDelete) return;

    try {
      setIsDeletingHistory(true);
      const id = itemToDelete?.id || itemToDelete?.medical_conditions_id || itemToDelete?.medical_condition_id 
        || itemToDelete?.allergies_id || itemToDelete?.allergy_id
        || itemToDelete?.medications_id || itemToDelete?.medication_id
        || itemToDelete?.surgical_history_id || itemToDelete?.surgical_id || itemToDelete?.surgery_id
        || itemToDelete?.vaccinations_id || itemToDelete?.vaccination_id
        || itemToDelete?.sensitivities_id || itemToDelete?.sensitivity_id
        || itemToDelete?.family_history_id || itemToDelete?.family_id;
      
      if (!id) {
        throw new Error('Cannot delete: record ID not found');
      }

      const numericId = Number(id);
      if (!Number.isFinite(numericId)) {
        throw new Error('Invalid record ID: must be a number');
      }

      // Delete based on section type
      switch (sectionKeyToDelete) {
        case 'medical_conditions':
          await HealthHistoryApi.deleteMedicalCondition(numericId);
          break;
        case 'allergies':
          await HealthHistoryApi.deleteAllergy(numericId);
          break;
        case 'medications':
          await HealthHistoryApi.deleteMedication(numericId);
          break;
        case 'sensitivities':
          await HealthHistoryApi.deleteSensitivity(numericId);
          break;
        case 'family_history':
          await HealthHistoryApi.deleteFamilyHistory(numericId);
          break;
        case 'vaccinations':
          await HealthHistoryApi.deleteVaccination(numericId);
          break;
        case 'surgical_history':
          await HealthHistoryApi.deleteSurgicalHistory(numericId);
          break;
        // TODO: Add delete methods for other sections when endpoints are available
        default:
          console.warn(`Delete not implemented for section: ${sectionKeyToDelete}`);
          throw new Error(`Delete operation not available for ${sectionKeyToDelete}`);
      }

      // Reload health history summary
      await loadHealthHistorySummary();
      showSuccess('Record deleted successfully');
    } catch (err) {
      // Handle ACCESS_DENIED error specifically
      if (err?.code === 'ERROR_CODE_ACCESS_DENIED' || err?.message?.includes('ACCESS_DENIED')) {
        showError('Access denied. You may not have permission to delete this record, or it may belong to another user.');
      } else {
        showError(err?.message || 'Failed to delete record');
      }
    } finally {
      setIsDeletingHistory(false);
      setIsDeleteHistoryModalOpen(false);
      setItemToDelete(null);
      setSectionKeyToDelete(null);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setRecordToDelete(null);
  };


  // Edit health data record
  const handleEditHealthData = (record) => {
    setEditingRecord(record);
    // Populate form with record data
    setHealthData({
      date: record.date || '',
      heart_rate: record.heart_rate?.toString() || '',
      blood_pressure_systolic: record.blood_pressure_systolic?.toString() || '',
      blood_pressure_diastolic: record.blood_pressure_diastolic?.toString() || '',
      weekly_activity_minutes: record.weekly_activity_minutes?.toString() || '',
      activity_level: record.activity_level?.toString() || '',
      visibility_scope: record.visibility_scope || 'private',
      hydration_liters: record.hydration_liters?.toString() || '',
      pulse_oximetry: record.pulse_oximetry?.toString() || '',
      respiratory_rate: record.respiratory_rate?.toString() || '',
      body_weight_trend: record.body_weight_trend || '',
      body_mass_index: record.body_mass_index?.toString() || '',
      fasting_glucose: record.fasting_glucose?.toString() || '',
      body_temperature: record.body_temperature?.toString() || ''
    });
    setIsHealthDataModalOpen(true);
  };

  // Update health data record
  const handleUpdateHealthData = async () => {
    if (!editingRecord) return;

    try {
      setSaving(true);
      
      // Prepare data for API
      const healthDataPayload = {
        user_id: user.id,
        ...healthData,
        // Convert string values to appropriate types
        heart_rate: healthData.heart_rate ? parseInt(healthData.heart_rate) : null,
        blood_pressure_systolic: healthData.blood_pressure_systolic ? parseInt(healthData.blood_pressure_systolic) : null,
        blood_pressure_diastolic: healthData.blood_pressure_diastolic ? parseInt(healthData.blood_pressure_diastolic) : null,
        weekly_activity_minutes: healthData.weekly_activity_minutes ? parseFloat(healthData.weekly_activity_minutes) : null,
        activity_level: healthData.activity_level ? parseInt(healthData.activity_level) : null,
        hydration_liters: healthData.hydration_liters ? parseFloat(healthData.hydration_liters) : null,
        pulse_oximetry: healthData.pulse_oximetry ? parseInt(healthData.pulse_oximetry) : null,
        respiratory_rate: healthData.respiratory_rate ? parseInt(healthData.respiratory_rate) : null,
        body_mass_index: healthData.body_mass_index ? parseFloat(healthData.body_mass_index) : null,
        fasting_glucose: healthData.fasting_glucose ? parseFloat(healthData.fasting_glucose) : null,
        body_temperature: healthData.body_temperature ? parseFloat(healthData.body_temperature) : null
      };

      await HealthApi.updateRecord(user.id, editingRecord.id, healthDataPayload);
      showSuccess('Health data updated successfully!');
      setIsHealthDataModalOpen(false);
      setEditingRecord(null);
      // Reset form
      setHealthData({
        date: '',
        heart_rate: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        weekly_activity_minutes: '',
        activity_level: '',
        visibility_scope: 'private',
        hydration_liters: '',
        pulse_oximetry: '',
        respiratory_rate: '',
        body_weight_trend: '',
        body_mass_index: '',
        fasting_glucose: '',
        body_temperature: ''
      });
      // Reload data
      await loadHealthData();
    } catch (error) {
      console.error('Error updating health data:', error);
      showError('Failed to update health data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Load health data from API
  const loadHealthData = async () => {
    try {
      setLoadingHealthData(true);
      console.log('Loading health data from API...');
      console.log('API URL:', ENDPOINTS.healthData.getAll);
      console.log('User ID:', user?.id);
      
      // First, let's test if the API is working with a known endpoint
      try {
        console.log('Testing API with users endpoint...');
        const testResponse = await authRequest(ENDPOINTS.users.getAll);
        console.log('Users API test successful:', testResponse);
      } catch (testError) {
        console.error('Users API test failed:', testError);
      }
      
      // Try to get health data by user ID first
      let response;
      try {
        response = await HealthApi.getByUserId(user.id);
        console.log('Health data by user ID response:', response);
      } catch (userError) {
        console.log('getByUserId failed, trying getAll...', userError);
        response = await HealthApi.getAll();
        console.log('Health data getAll response:', response);
      }
      
      // Handle API response format: { result: [...], succes: true }
      const healthDataArray = response?.result || response;
      
      if (healthDataArray && Array.isArray(healthDataArray)) {
        // Filter out records with all zero values (empty records)
        const filteredRecords = healthDataArray.filter(record => {
          const hasValidData = record.heart_rate > 0 || 
                              record.blood_pressure_systolic > 0 || 
                              record.blood_pressure_diastolic > 0 ||
                              record.weekly_activity_minutes > 0 ||
                              record.hydration_liters > 0 ||
                              record.pulse_oximetry > 0 ||
                              record.respiratory_rate > 0 ||
                              record.body_mass_index > 0 ||
                              record.fasting_glucose > 0 ||
                              record.body_temperature > 0 ||
                              (record.body_weight_trend && record.body_weight_trend.trim() !== '');
          return hasValidData;
        });
        
        setHealthDataRecords(filteredRecords);
        console.log('Health data loaded successfully:', filteredRecords.length, 'valid records out of', healthDataArray.length, 'total');
      } else {
        console.log('No health data found or invalid response format');
        console.log('Response structure:', response);
        setHealthDataRecords([]);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        url: ENDPOINTS.healthData.getAll
      });
      
      // Try alternative endpoints
      console.log('Trying alternative health data endpoints...');
      try {
        // Try with user_id as path parameter
        const altResponse = await authRequest(`${ENDPOINTS.healthData.getAll}/${user?.id}`);
        console.log('Alternative endpoint response:', altResponse);
        const altHealthDataArray = altResponse?.result || altResponse;
        if (altHealthDataArray && Array.isArray(altHealthDataArray)) {
          // Filter out records with all zero values (empty records)
          const filteredAltRecords = altHealthDataArray.filter(record => {
            const hasValidData = record.heart_rate > 0 || 
                                record.blood_pressure_systolic > 0 || 
                                record.blood_pressure_diastolic > 0 ||
                                record.weekly_activity_minutes > 0 ||
                                record.hydration_liters > 0 ||
                                record.pulse_oximetry > 0 ||
                                record.respiratory_rate > 0 ||
                                record.body_mass_index > 0 ||
                                record.fasting_glucose > 0 ||
                                record.body_temperature > 0 ||
                                (record.body_weight_trend && record.body_weight_trend.trim() !== '');
            return hasValidData;
          });
          
          setHealthDataRecords(filteredAltRecords);
          return;
        }
      } catch (altError) {
        console.error('Alternative endpoint also failed:', altError);
      }
      
      // Don't show error to user as this is background loading
      setHealthDataRecords([]);
    } finally {
      setLoadingHealthData(false);
    }
  };
  const healthOptions = {
    medical_conditions: [
      "Hypertension", "Diabetes Type 1", "Diabetes Type 2", "Asthma", "COPD", 
      "Cardiovascular Disease", "High Cholesterol", "Arthritis", "Depression", 
      "Anxiety", "Migraine", "Epilepsy", "Thyroid Disorders", "Autoimmune Diseases"
    ],
    medications: [
      "Metformin", "Lisinopril", "Atorvastatin", "Ibuprofen", "Aspirin", 
      "Levothyroxine", "Metoprolol", "Omeprazole", "Sertraline", "Albuterol",
      "Warfarin", "Furosemide", "Amlodipine", "Simvastatin", "Losartan"
    ],
    allergies: [
      "Penicillin", "Sulfa drugs", "Peanuts", "Tree nuts", "Shellfish", 
      "Dust mites", "Pollen", "Pet dander", "Latex", "Mold", "Eggs", "Milk",
      "Soy", "Wheat", "Insect stings", "Contrast dye"
    ],
    surgical_history: [
      "Appendectomy", "C-section", "Knee surgery", "Hip replacement", 
      "Gallbladder removal", "Hernia repair", "Cataract surgery", 
      "Tonsillectomy", "Cholecystectomy", "Hysterectomy", "Prostate surgery",
      "Heart surgery", "Spine surgery", "Shoulder surgery"
    ],
    vaccinations: [
      "COVID-19", "Influenza (Flu)", "Hepatitis A", "Hepatitis B", "MMR", 
      "Tdap", "Varicella", "Pneumococcal", "Meningococcal", "HPV", 
      "Shingles", "Polio", "Tetanus", "Diphtheria", "Pertussis"
    ],
    sensitivities: [
      "Latex", "Nickel", "Fragrances", "Cleaning products", "Pesticides",
      "Formaldehyde", "Dyes", "Preservatives", "Sulfites", "MSG",
      "Artificial sweeteners", "Food additives", "Chemicals", "Smoke"
    ],
    family_history: [
      "Heart disease", "Diabetes", "Cancer", "Alzheimer's", "Depression",
      "High blood pressure", "Stroke", "Kidney disease", "Liver disease",
      "Mental health disorders", "Autoimmune diseases", "Blood disorders",
      "Genetic conditions", "Obesity", "Substance abuse"
    ],
  };


const calculateAgeFromDOB = (dob) => {
  if (!dob) return null;
  
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};
  useEffect(() => {
    async function fetchProfile() {
      if (!user || !user.id) {
        const msg = "User not authenticated";
        setError(msg);
        showError(msg);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Fetching profile for user ID:', user.id);
        
        // Try to get profile by user_id using ProfilesApi
        let profileData = null;
        try {
          // First try to get profile by user_id
          profileData = await ProfilesApi.getById(user.id);
          console.log('✅ Profile found by ID:', profileData);
        } catch (idError) {
          console.log('⚠️ Profile not found by ID, trying to get all profiles:', idError.message);
          // If not found by ID, try to get all profiles and filter by user_id
          const allProfilesResponse = await ProfilesApi.getAll();
          console.log('📋 All profiles response:', allProfilesResponse);
          
          // Handle API response format: { result: [...], success: true }
          const allProfiles = allProfilesResponse?.result || allProfilesResponse;
          console.log('📋 All profiles array:', allProfiles);
          
          if (Array.isArray(allProfiles)) {
            profileData = allProfiles.find(p => p.user_id === user.id || p.id === user.id);
            console.log('🔍 Found profile in list:', profileData);
          } else if (allProfiles && (allProfiles.user_id === user.id || allProfiles.id === user.id)) {
            profileData = allProfiles;
            console.log('🔍 Single profile found:', profileData);
          }
        }
        
        setProfile(profileData);
        const preview = (
          profileData?.avatar_url ||
          profileData?.avatar ||
          profileData?.photo_url ||
          (typeof profileData?.profile_photo === 'string' ? profileData?.profile_photo : (profileData?.profile_photo?.url || profileData?.profile_photo?.path)) ||
          ""
        );
        if (preview) setPhotoPreview(preview);
        
        // Use profile data if available, otherwise fallback to user data
        const dataToUse = profileData || user;
        console.log('📊 Data to use for form:', dataToUse);
        console.log('📊 Profile data:', profileData);
        console.log('📊 User data:', user);
        
        const formData = {
          first_name: dataToUse?.first_name || dataToUse?.firstName || "",
          last_name: dataToUse?.last_name || dataToUse?.lastName || "",
          phone_number: dataToUse?.phone_number || dataToUse?.phone || "",
          dob: dataToUse?.dob || dataToUse?.date_of_birth || "",
          gender: dataToUse?.gender || "",
          sex_of_birth: dataToUse?.sex_of_birth || "",
          height_cm: (dataToUse?.height_cm ?? "") === 0 ? "" : (dataToUse?.height_cm ?? ""),
          weight_kg: (dataToUse?.weight_kg ?? "") === 0 ? "" : (dataToUse?.weight_kg ?? ""),
          zip_code: dataToUse?.zip_code ?? "",
          user_id: dataToUse?.user_id || user?.id || "",
        };
        
        console.log('📊 Form data to set:', formData);
        setFormValues(formData);
        setError(null);
        
        if (!profileData) {
          console.log('ℹ️ No profile found, using user data as fallback');
        }
      } catch (err) {
        console.warn('❌ Failed to fetch profile from API, using user data:', err.message);
        // Fallback to user data if API fails
        const profileData = user;
        setProfile(profileData);
        const preview = (
          profileData?.avatar_url ||
          profileData?.avatar ||
          profileData?.photo_url ||
          (typeof profileData?.profile_photo === 'string' ? profileData?.profile_photo : (profileData?.profile_photo?.url || profileData?.profile_photo?.path)) ||
          ""
        );
        if (preview) setPhotoPreview(preview);
        setFormValues({
          first_name: profileData?.first_name || profileData?.firstName || "",
          last_name: profileData?.last_name || profileData?.lastName || "",
          phone_number: profileData?.phone_number || profileData?.phone || "",
          dob: profileData?.dob || profileData?.date_of_birth || "",
          gender: profileData?.gender || "",
          height_cm: (profileData?.height_cm ?? "") === 0 ? "" : (profileData?.height_cm ?? ""),
          weight_kg: (profileData?.weight_kg ?? "") === 0 ? "" : (profileData?.weight_kg ?? ""),
          zip_code: profileData?.zip_code ?? "",
          user_id: profileData?.user_id || user?.id || "",
        });
        console.log('📊 Fallback form data set:', {
          first_name: profileData?.first_name || profileData?.firstName || "",
          last_name: profileData?.last_name || profileData?.lastName || "",
          phone_number: profileData?.phone_number || profileData?.phone || "",
          dob: profileData?.dob || profileData?.date_of_birth || "",
          gender: profileData?.gender || "",
        });
        const msg = `Profile API unavailable: ${err.message}`;
        setError(msg);
        showError(msg);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user?.id]);

  // Load health data when switching to health_data tab or when user changes
  useEffect(() => {
    if (activeTab === 'health_data' && user?.id) {
      loadHealthData();
    }
    if (activeTab === 'health_history' && user?.id) {
      loadHealthHistorySummary();
    }
  }, [activeTab, user?.id]);

  // Helper: load health history summary and set state
  const loadHealthHistorySummary = async () => {
    try {
      const res = await HealthHistoryApi.getHealthHistorySummary(user.id);
      const summary = res?.result || res || {};
      const toObjects = (arr) => Array.isArray(arr) ? arr.filter(Boolean) : [];
      setHealthHistory({
        medical_conditions: toObjects(summary.user_medical_condition),
        medications: toObjects(summary.user_medications),
        allergies: toObjects(summary.user_allergies),
        surgical_history: toObjects(summary.user_surgical_history),
        vaccinations: toObjects(summary.user_vaccinations),
        sensitivities: toObjects(summary.user_sensitivities),
        family_history: toObjects(summary.user_family_history),
      });
      const nowIso = new Date().toISOString();
      setLastUpdated((prev) => ({
        ...prev,
        medical_conditions: nowIso,
        medications: nowIso,
        allergies: nowIso,
        surgical_history: nowIso,
        vaccinations: nowIso,
        sensitivities: nowIso,
        family_history: nowIso,
      }));
    } catch (e) {
      const isNetworkError = e?.message?.includes('ERR_CONNECTION_REFUSED') || 
                             e?.message?.includes('Network error') ||
                             e?.message?.includes('Unable to connect');
      if (!isNetworkError) {
        console.warn('Failed to load health history summary:', e?.message);
      }
      setHealthHistory({
        medical_conditions: [],
        medications: [],
        allergies: [],
        surgical_history: [],
        vaccinations: [],
        sensitivities: [],
        family_history: [],
      });
    }
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e?.preventDefault?.();
    if (!user?.id) return;
    try {
      setSaving(true);
      setError(null);
      
      // Handle photo upload separately if user selected a new photo
      let uploadedPhotoData = null;
      if (pendingPhotoFile) {
        try {
          setUploadingPhoto(true);
          console.log('📸 UPLOADING photo:');
          console.log('📍 Endpoint:', `${CUSTOM_ENDPOINTS.uploudFile.uploudFile}`);
          console.log('📦 File:', {
            name: pendingPhotoFile.name,
            size: pendingPhotoFile.size,
            type: pendingPhotoFile.type
          });
          console.log('📦 User ID:', user.id);
          console.log('📦 Category:', 'profile');
          
          const res = await UploadFileApi.uploadAvatar(pendingPhotoFile, 'profile');
          const uploaded = res?.result || res;
          const url = uploaded?.url || uploaded?.path || '';
          
          console.log('✅ Photo upload response:', uploaded);
          console.log('🔗 Photo URL:', url);
          
          // Store photo data for profile update
          uploadedPhotoData = {
            access: uploaded?.access || 'public',
            path: uploaded?.path || url,
            name: uploaded?.name || pendingPhotoFile.name,
            type: uploaded?.type || pendingPhotoFile.type,
            size: uploaded?.size || pendingPhotoFile.size,
            mime: uploaded?.mime || pendingPhotoFile.type,
            meta: uploaded?.meta || {},
            url,
          };
          
          // Update photo preview
          setPhotoPreview(url);
          showSuccess("Photo uploaded successfully!");
        } catch (uploadErr) {
          const msg = uploadErr?.message || 'Failed to upload photo';
          setError(msg);
          showError(msg);
          return;
        } finally {
          setUploadingPhoto(false);
          setPendingPhotoFile(null);
        }
      }

      // Prepare profile data payload (excluding photo - photo is handled separately)
      const basePayload = {
        first_name: formValues.first_name?.trim(),
        last_name: formValues.last_name?.trim(),
        phone_number: formValues.phone_number?.trim(),
        dob: formValues.dob || null,
        gender: formValues.gender || "",
        sex_of_birth: formValues.sex_of_birth || "",
        height_cm: formValues.height_cm === "" ? 0 : Number(formValues.height_cm),
        weight_kg: formValues.weight_kg === "" ? 0 : Number(formValues.weight_kg),
        zip_code: formValues.zip_code?.trim() || "",
        // Note: profile_photo is handled separately via photo upload API
      };

      // For UPDATE the API expects profiles_id in the body
      let payload = basePayload;
      if (profile && profile.id) {
        payload = { profiles_id: profile.id, ...basePayload };
      } else {
        // For CREATE we keep user_id
        payload = { user_id: formValues.user_id || user.id, ...basePayload };
      }
      
      console.log('💾 Saving profile with payload (no photo):', payload);
      console.log('📸 Photo handling:', {
        uploadedPhotoData: uploadedPhotoData ? 'Photo uploaded separately' : 'No new photo',
        existingPhoto: profile?.profile_photo ? 'Preserved in UI' : 'No existing photo'
      });
      
      let updated;
      if (profile && profile.id) {
        // Update existing profile using user_id
        console.log('🔄 UPDATING existing profile:');
        console.log('📍 Endpoint:', `PATCH ${ENDPOINTS.profiles.update(user.id)}`);
        console.log('📦 Request Body:', JSON.stringify(payload, null, 2));
        console.log('📦 Request Body (formatted):', payload);
        
        updated = await ProfilesApi.update(user.id, payload);
        console.log('✅ Profile updated successfully:', updated);
      } else {
        // Create new profile
        console.log('🆕 CREATING new profile:');
        console.log('📍 Endpoint:', `POST ${ENDPOINTS.profiles.create}`);
        console.log('📦 Request Body:', JSON.stringify(payload, null, 2));
        console.log('📦 Request Body (formatted):', payload);
        
        updated = await ProfilesApi.create(payload);
        console.log('✅ Profile created successfully:', updated);
      }
      
      setProfile(updated);
      // Immediately reflect avatar URL from server in the UI after save
      try {
        const newPreview = (
          updated?.avatar_url ||
          updated?.avatar ||
          updated?.photo_url ||
          (typeof updated?.profile_photo === 'string' ? updated?.profile_photo : (updated?.profile_photo?.url || updated?.profile_photo?.path)) ||
          ''
        );
        if (newPreview) setPhotoPreview(newPreview);
      } catch {}
      const successMessage = uploadedPhotoData 
        ? "Profile updated and photo uploaded successfully!" 
        : "Profile updated successfully!";
      showSuccess(successMessage);
    } catch (err) {
      const errorMessage = err.message || "Failed to save profile";
      console.error('❌ Profile save error:', err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-profile">
      <div className="dash-toolbar" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <h1 style={{ margin: 0 }}>Profile</h1>
      </div>
      
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, paddingBottom:8, borderBottom: "1px solid var(--border)" }}>
        <button 
          onClick={() => changeTab('personal')} 
          className={`btn ${activeTab === 'personal' ? 'primary' : 'outline'}`}
          style={{ width:'auto', padding:'8px 16px', height:38 }}
        >
          Personal Info
        </button>
        <button 
          onClick={() => changeTab('health_history')} 
          className={`btn ${activeTab === 'health_history' ? 'primary' : 'outline'}`}
          style={{ width:'auto', padding:'8px 16px', height:38 }}
        >
          Health History
        </button>
        <button 
          onClick={() => changeTab('health_data')} 
          className={`btn ${activeTab === 'health_data' ? 'primary' : 'outline'}`}
          style={{ width:'auto', padding:'8px 16px', height:38 }}
        >
          Health Data
        </button>
        {/* Medical Records tab hidden per request */}
        <span style={{ marginLeft:'auto' }} />
        <button className="btn outline" style={{ width:'auto', padding:'8px 16px', height:38 }} onClick={() => navigate('/onboarding?force=true')}>Go to Onboarding</button>
      </div>

      {activeTab === 'personal' && (
      <div className="card" style={{ display: "flex", gap: 16, marginBottom: 24,  alignItems:'flex-start' }}>
        <div 
          style={{ width: 120, height: 120, backgroundColor: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border:'1px solid var(--border)', overflow:'hidden', cursor:'pointer', position:'relative' }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          title="Change photo"
          aria-label="Change profile photo"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <span style={{ fontSize: 48 }}>👤</span>
          )}
          {uploadingPhoto && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>Uploading…</div>
          )}
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*"
            style={{ display:'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              // Create a local preview and defer actual upload until Save
              try {
                if (photoPreview?.startsWith('blob:')) {
                  URL.revokeObjectURL(photoPreview);
                }
                const localUrl = URL.createObjectURL(file);
                setPhotoPreview(localUrl);
                setPendingPhotoFile(file);
                showInfo('Photo selected. Click "Save changes" to upload.');
              } finally {
                e.target.value = '';
              }
            }}
          />
        </div>
        <div style={{ flex:1 }}>
          {loading ? (
            <p>Loading profile...</p>
          ) : (
            <>
              <h2 style={{ marginTop:0 }}>
                {profile?.name || 
                 (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : 
                  profile?.first_name || profile?.last_name || 
                  user?.name || 
                  (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : 
                   user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` :
                   user?.first_name || user?.last_name || user?.firstName || user?.lastName || 
                   (formValues.first_name || formValues.last_name ? 
                    `${formValues.first_name || ''} ${formValues.last_name || ''}`.trim() : 
                    "Loading...")))}
              </h2>
              
        
              
              {error && (
                <p style={{ color: "var(--error)", fontSize: "14px", marginTop: "8px" }}>
                  ⚠️ {error}
                </p>
              )}
              <form onSubmit={handleSave} className="form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, maxWidth: 720 }}>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6}}>
                  <span>First name</span>
                  <input name="first_name" value={formValues.first_name} onChange={handleChange} placeholder="John" />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column", gap:6 }}>
                  <span>Last name</span>
                  <input name="last_name" value={formValues.last_name} onChange={handleChange} placeholder="Doe" />
                </label>
                {/* User ID hidden from UI by request */}
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Phone</span>
                  <input name="phone_number" value={formValues.phone_number} onChange={handleChange} placeholder="+1 555-1234" />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Date of birth</span>
                  <input type="date" name="dob" value={formValues.dob || ""} onChange={handleChange} />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Gender Identity</span>
                  <select name="gender" value={formValues.gender || ""} onChange={handleChange}>
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Sex at Birth</span>
                  <select name="sex_of_birth" value={formValues.sex_of_birth || ""} onChange={handleChange}>
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="intersex">Intersex</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6  }}>
                  <span>Height (cm)</span>
                  <input type="number" inputMode="numeric" name="height_cm" value={formValues.height_cm} onChange={handleChange} placeholder="e.g. 175" />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Weight (kg)</span>
                  <input type="number" inputMode="numeric" name="weight_kg" value={formValues.weight_kg} onChange={handleChange} placeholder="e.g. 70" />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>ZIP Code</span>
                  <input name="zip_code" value={formValues.zip_code} onChange={handleChange} placeholder="e.g. 94105" />
                </label>
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="submit" className="btn primary full" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      )}

      {activeTab === 'health_history' && (
        <div style={{ maxWidth: 920 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding:16, borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ margin: 0 }}>Health History</h2>
              <p style={{ color:'var(--muted)', margin: '8px 0 0 0', fontSize: '14px' }}>
                Comprehensive health intake form. Each section can be collapsed/expanded for easy navigation.
              </p>
            </div>
            <div style={{ padding:16 }}>
              {([
                ['medical_conditions','Medical Conditions', 'Chronic conditions, diseases, and ongoing health issues'],
                ['medications','Current Medications', 'Prescription and over-the-counter medications with dosage and frequency'],
                ['allergies','Known Allergies', 'Medications, foods, and environmental triggers'],
                ['surgical_history','Surgical History', 'Past surgeries, procedures, and hospitalizations'],
                ['vaccinations','Vaccination History', 'Immunizations and vaccination records'],
                ['sensitivities','Environmental & Chemical Sensitivities', 'Chemical, environmental, and other sensitivities'],
                ['family_history','Family Health History', 'Genetic predispositions and family medical conditions'],
              ]).map(([key,label,description]) => (
                <HealthSection
                  key={key}
                  title={label}
                  description={description}
                  options={healthOptions[key]}
                  values={healthHistory[key]}
                  lastUpdated={lastUpdated[key]}
                  onToggle={(item) => {
                    // Handle deletion: if item is an object, remove by id; if string, remove directly
                    setHealthHistory(prev => {
                      const current = prev[key] || [];
                      const itemId = typeof item === 'object' ? (item.id || item.condition_name || item.name) : item;
                      return { ...prev, [key]: current.filter(i => {
                        const currId = typeof i === 'object' ? (i.id || i.condition_name || i.name) : i;
                        return currId !== itemId;
                      })};
                    });
                  }}
                  sectionKey={key}
                  onEdit={(item) => {
                    setEditingHistoryItem(item);
                    setEditingHistorySectionKey(key);
                    setAddHistorySectionKey(key);
                    // Prefill modal form with item fields
                    const base = { ...(item || {}), user_id: user?.id };
                    setAddHistoryForm(base);
                    setIsAddHistoryModalOpen(true);
                  }}
                  onDelete={(item) => {
                    // Open confirmation modal instead of window.confirm
                    setItemToDelete(item);
                    setSectionKeyToDelete(key);
                    setIsDeleteHistoryModalOpen(true);
                  }}
                  onSave={async () => {
                    try {
                      setSavingHistory(prev => ({ ...prev, [key]: true }));
                      const values = healthHistory[key] || [];
                      for (const v of values) {
                        // Skip if item is already an object with id (already saved to API)
                        if (typeof v === 'object' && v !== null && v.id) {
                          continue;
                        }
                        
                        // Handle string values (old format) - should not happen with new structure
                        const conditionName = typeof v === 'string' ? v : (v.condition_name || v.name || '');
                        if (key === 'medical_conditions') {
                          const today = new Date().toISOString().split('T')[0];
                          await HealthHistoryApi.addMedicalCondition({ 
                            user_id: user.id, 
                            condition_name: conditionName,
                            diagnosis_date: today,
                            status: 'active',
                            severity: 'mild',
                            notes: '',
                            treatment_plan: '',
                            last_updated: Date.now()
                          });
                        } else if (key === 'medications') {
                          const today = new Date().toISOString().split('T')[0];
                          await HealthHistoryApi.addMedication({ 
                            user_id: user.id, 
                            name: v,
                            dosage: '',
                            frequency: '',
                            start_date: today,
                            end_date: null,
                            notes: ''
                          });
                        } else if (key === 'allergies') {
                          await HealthHistoryApi.addAllergy({ user_id: user.id, allergy_name: v, severity: 'mild', notes: '' });
                        } else if (key === 'surgical_history') {
                          const today = new Date().toISOString().split('T')[0];
                          await HealthHistoryApi.addSurgicalHistory({ user_id: user.id, procedure_name: v, surgery_date: today, surgeon: '', hospital: '', notes: '' });
                        } else if (key === 'vaccinations') {
                          const today = new Date().toISOString().split('T')[0];
                          await HealthHistoryApi.addVaccination({ user_id: user.id, vaccine_name: v, vaccination_date: today, lot_number: '', next_due_date: '' });
                        } else if (key === 'sensitivities') {
                          await HealthHistoryApi.addSensitivity({ user_id: user.id, sensitivity_name: v, type: 'environmental', symptoms: '', severity: 'mild' });
                        } else if (key === 'family_history') {
                          await HealthHistoryApi.addFamilyHistory({ user_id: user.id, condition_name: v, family_member: '', age_at_diagnosis: null, is_genetic: false, notes: '' });
                        }
                      }
                      setLastUpdated(prev => ({ ...prev, [key]: new Date().toISOString() }));
                      showSuccess(`${label} saved successfully!`);
                    } catch (e) {
                      showError(e.message || `Failed to save ${label.toLowerCase()}`);
                    } finally {
                      setSavingHistory(prev => ({ ...prev, [key]: false }));
                    }
                  }}
                  onAddNew={() => {
                    setAddHistorySectionKey(key);
                    // Initialize form with sensible defaults based on section
                    const today = new Date().toISOString().split('T')[0];
                    const initial = {
                      user_id: user?.id,
                    };
                    if (key === 'medical_conditions') Object.assign(initial, { condition_name: '', diagnosis_date: '', status: 'active', severity: '', notes: '', treatment_plan: '', last_updated: Date.now(), useToday: false });
                    if (key === 'medications') Object.assign(initial, { name: '', dosage: '', frequency: '', start_date: today, end_date: null, notes: '' });
                    if (key === 'allergies') Object.assign(initial, { allergy_name: '', severity: 'mild', notes: '' });
                    if (key === 'surgical_history') Object.assign(initial, { procedure_name: '', surgery_date: today, surgeon: '', hospital: '', notes: '' });
                    if (key === 'vaccinations') Object.assign(initial, { vaccine_name: '', vaccination_date: today, lot_number: '', next_due_date: '' });
                    if (key === 'sensitivities') Object.assign(initial, { sensitivity_name: '', type: 'environmental', symptoms: '', severity: 'mild' });
                    if (key === 'family_history') Object.assign(initial, { family_member: '', condition_name: '', age_at_diagnosis: '', is_genetic: false, notes: '' });
                    setAddHistoryForm(initial);
                    setIsAddHistoryModalOpen(true);
                  }}
                  saving={savingHistory[key]}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Health History Modal */}
      {isAddHistoryModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddHistoryModalOpen(false); }}
        >
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {editingHistoryItem ? (
                  addHistorySectionKey === 'medical_conditions' ? 'Edit Medical Condition' : `Edit ${addHistorySectionKey?.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}`
                ) : (
                  addHistorySectionKey === 'medical_conditions' ? 'Add New Medical Conditions' : `Add New ${addHistorySectionKey?.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}`
                )}
              </h3>
              <button className="btn outline" onClick={() => setIsAddHistoryModalOpen(false)} style={{ padding: '6px 10px', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto' }}>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setSavingAddHistory(true);
                    let payload = { ...addHistoryForm, user_id: user?.id };
                    // Convert empty date strings to null for API compatibility
                    if (payload.end_date === '' || payload.end_date === undefined) payload.end_date = null;
                    if (payload.diagnosis_date === '' || payload.diagnosis_date === undefined) payload.diagnosis_date = null;
                    if (payload.start_date === '' || payload.start_date === undefined) payload.start_date = null;
                    if (payload.surgery_date === '' || payload.surgery_date === undefined) payload.surgery_date = null;
                    if (payload.vaccination_date === '' || payload.vaccination_date === undefined) payload.vaccination_date = null;
                    if (payload.next_due_date === '' || payload.next_due_date === undefined) payload.next_due_date = null;
                    
                    let newItem = null;
                    if (addHistorySectionKey === 'medical_conditions') {
                      // Remove useToday from payload before sending
                      const { useToday, ...medicalPayload } = payload;
                      // Ensure required fields are present
                      if (!medicalPayload.diagnosis_date) {
                        medicalPayload.diagnosis_date = new Date().toISOString().split('T')[0];
                      }
                      if (!medicalPayload.status) medicalPayload.status = 'active';
                      if (!medicalPayload.severity) medicalPayload.severity = 'mild'; // Default to mild if not selected
                      medicalPayload.last_updated = Date.now();
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || medicalPayload.medical_conditions_id || editingHistoryItem.medical_conditions_id)) {
                        // Update existing condition via PATCH /medical_conditions/{user_id}
                        const targetId = editingHistoryItem.id || editingHistoryItem.medical_conditions_id || medicalPayload.medical_conditions_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid medical_conditions_id: must be a number');
                        }
                        // Prepare update payload according to API spec (without medical_conditions_id in body, it's in URL)
                        const updatePayload = {
                          condition_name: medicalPayload.condition_name,
                          diagnosis_date: medicalPayload.diagnosis_date || new Date().toISOString().split('T')[0],
                          status: medicalPayload.status || 'active',
                          severity: medicalPayload.severity || 'mild',
                          notes: medicalPayload.notes || '',
                          treatment_plan: medicalPayload.treatment_plan || '',
                          last_updated: Date.now(),
                        };
                        // Update existing condition via PATCH /medical_conditions/{medical_conditions_id}
                        response = await HealthHistoryApi.updateMedicalCondition(numericId, updatePayload);
                      } else {
                        response = await HealthHistoryApi.addMedicalCondition(medicalPayload);
                      }
                      // Use response object if available, otherwise use payload
                      newItem = response?.result || response || medicalPayload;
                    } else if (addHistorySectionKey === 'medications') {
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || editingHistoryItem.medications_id || editingHistoryItem.medication_id)) {
                        // Update existing medication via PATCH /medications/{medications_id}
                        const targetId = editingHistoryItem.id || editingHistoryItem.medications_id || editingHistoryItem.medication_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid medications_id: must be a number');
                        }
                        const updatePayload = {
                          name: payload.name || payload.medication_name || '',
                          dosage: payload.dosage || '',
                          frequency: payload.frequency || '',
                          start_date: payload.start_date || null,
                          end_date: payload.end_date || null,
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateMedication(numericId, updatePayload);
                      } else {
                        response = await HealthHistoryApi.addMedication(payload);
                      }
                      newItem = response?.result || response || payload;
                    } else if (addHistorySectionKey === 'allergies') {
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || editingHistoryItem.allergies_id || editingHistoryItem.allergy_id)) {
                        // Update existing allergy via PATCH /allergies/{allergies_id}
                        const targetId = editingHistoryItem.id || editingHistoryItem.allergies_id || editingHistoryItem.allergy_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid allergies_id: must be a number');
                        }
                        const updatePayload = {
                          allergy_name: payload.allergy_name,
                          severity: payload.severity || '',
                          notes: payload.notes || '',
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateAllergy(numericId, updatePayload);
                      } else {
                        response = await HealthHistoryApi.addAllergy(payload);
                      }
                      newItem = response?.result || response || payload;
                    } else if (addHistorySectionKey === 'surgical_history') {
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || editingHistoryItem.surgical_history_id || editingHistoryItem.surgical_id || editingHistoryItem.surgery_id)) {
                        // Update existing surgical history via PATCH /surgical_history/{surgical_history_id}
                        const targetId = editingHistoryItem.id || editingHistoryItem.surgical_history_id || editingHistoryItem.surgical_id || editingHistoryItem.surgery_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid surgical_history_id: must be a number');
                        }
                        const updatePayload = {
                          procedure_name: payload.procedure_name || '',
                          surgery_date: payload.surgery_date || null,
                          surgeon: payload.surgeon || '',
                          hospital: payload.hospital || '',
                          reason: payload.reason || '',
                          outcome: payload.outcome || '',
                          complications: payload.complications || '',
                          notes: payload.notes || '',
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateSurgicalHistory(numericId, updatePayload);
                      } else {
                        response = await HealthHistoryApi.addSurgicalHistory(payload);
                      }
                      newItem = response?.result || response || payload;
                    } else if (addHistorySectionKey === 'vaccinations') {
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || editingHistoryItem.vaccinations_id || editingHistoryItem.vaccination_id)) {
                        // Update existing vaccination via PATCH /vaccinations (id in body)
                        const targetId = editingHistoryItem.id || editingHistoryItem.vaccinations_id || editingHistoryItem.vaccination_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid vaccinations_id: must be a number');
                        }
                        const updatePayload = {
                          vaccinations_id: numericId,
                          vaccine_name: payload.vaccine_name || '',
                          vaccination_date: payload.vaccination_date || null,
                          lot_number: payload.lot_number || '',
                          administrator: payload.administrator || '',
                          next_due_date: payload.next_due_date || null,
                          notes: payload.notes || '',
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateVaccination(updatePayload);
                      } else {
                        response = await HealthHistoryApi.addVaccination(payload);
                      }
                      newItem = response?.result || response || payload;
                    } else if (addHistorySectionKey === 'sensitivities') {
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || editingHistoryItem.sensitivities_id || editingHistoryItem.sensitivity_id)) {
                        // Update existing sensitivity via PATCH /sensitivities/{sensitivities_id}
                        const targetId = editingHistoryItem.id || editingHistoryItem.sensitivities_id || editingHistoryItem.sensitivity_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid sensitivities_id: must be a number');
                        }
                        const updatePayload = {
                          sensitivity_name: payload.sensitivity_name || '',
                          type: payload.type || '',
                          triggers: payload.triggers || '',
                          symptoms: payload.symptoms || '',
                          management: payload.management || '',
                          severity: payload.severity || '',
                          notes: payload.notes || '',
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateSensitivity(numericId, updatePayload);
                      } else {
                        response = await HealthHistoryApi.addSensitivity(payload);
                      }
                      newItem = response?.result || response || payload;
                    } else if (addHistorySectionKey === 'family_history') {
                      let response;
                      if (editingHistoryItem && (editingHistoryItem.id || editingHistoryItem.family_history_id || editingHistoryItem.family_id)) {
                        // Update existing family history via PATCH /family_history/{family_history_id}
                        const targetId = editingHistoryItem.id || editingHistoryItem.family_history_id || editingHistoryItem.family_id;
                        const numericId = Number(targetId);
                        if (!Number.isFinite(numericId)) {
                          throw new Error('Invalid family_history_id: must be a number');
                        }
                        const updatePayload = {
                          family_member: payload.family_member || '',
                          condition_name: payload.condition_name || '',
                          age_at_diagnosis: payload.age_at_diagnosis || 0,
                          relationship_notes: payload.relationship_notes || '',
                          notes: payload.notes || '',
                          is_genetic: payload.is_genetic || false,
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateFamilyHistory(numericId, updatePayload);
                      } else {
                        response = await HealthHistoryApi.addFamilyHistory(payload);
                      }
                      newItem = response?.result || response || payload;
                    }
                    if (newItem) {
                      await loadHealthHistorySummary();
                    }
                    setLastUpdated(prev => ({ ...prev, [addHistorySectionKey]: new Date().toISOString() }));
                    showSuccess('Saved successfully');
                    setIsAddHistoryModalOpen(false);
                    setEditingHistoryItem(null);
                    setEditingHistorySectionKey(null);
                  } catch (err) {
                    showError(err?.message || 'Failed to save');
                  } finally {
                    setSavingAddHistory(false);
                  }
                }}
                className="form"
                style={{ display:'flex', flexDirection:'column', gap:16 }}
              >
                {/* Fields per section */}
                {addHistorySectionKey === 'medical_conditions' && (
                  <>
                    {/* Condition name */}
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Condition name</span>
                      <input 
                        value={addHistoryForm.condition_name || ''} 
                        onChange={(e)=>setAddHistoryForm(v=>({...v, condition_name: e.target.value}))} 
                        placeholder="Enter medical conditions..."
                        required 
                        style={{ padding: '10px 12px', fontSize: '14px' }}
                      />
                    </label>

                    {/* Diagnosis date with Today checkbox */}
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Diagnosis date</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input 
                          type="date" 
                          value={addHistoryForm.diagnosis_date || ''} 
                          onChange={(e)=>{
                            setAddHistoryForm(v=>({...v, diagnosis_date: e.target.value, useToday: false}));
                          }}
                          style={{ flex: 1, padding: '10px 12px', fontSize: '14px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '13px', color: 'var(--muted)' }}>
                          <input 
                            type="checkbox" 
                            checked={addHistoryForm.useToday || false}
                            onChange={(e)=>{
                              const today = new Date().toISOString().split('T')[0];
                              setAddHistoryForm(v=>({...v, useToday: e.target.checked, diagnosis_date: e.target.checked ? today : v.diagnosis_date}));
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                          <span>Today</span>
                        </label>
                      </div>
                    </label>

                    {/* Severity dropdown */}
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Severity</span>
                      <select 
                        value={addHistoryForm.severity || ''} 
                        onChange={(e)=>setAddHistoryForm(v=>({...v, severity: e.target.value}))}
                        required
                        style={{ padding: '10px 12px', fontSize: '14px', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px', paddingRight: '36px' }}
                      >
                        <option value="" disabled>Select Severity</option>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </label>

                    {/* Treatment plan textarea */}
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Treatment plan</span>
                      <textarea 
                        value={addHistoryForm.treatment_plan || ''} 
                        onChange={(e)=>setAddHistoryForm(v=>({...v, treatment_plan: e.target.value}))}
                        placeholder="Treatment plan (optional)"
                        rows={4}
                        style={{ padding: '10px 12px', fontSize: '14px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    </label>

                    {/* Additional notes textarea */}
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Additional notes</span>
                      <textarea 
                        value={addHistoryForm.notes || ''} 
                        onChange={(e)=>setAddHistoryForm(v=>({...v, notes: e.target.value}))}
                        placeholder="Additional notes (optional)"
                        rows={4}
                        style={{ padding: '10px 12px', fontSize: '14px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    </label>

                    {/* Hidden fields for API */}
                    <input type="hidden" value={addHistoryForm.status || 'active'} />
                    <input type="hidden" value={addHistoryForm.last_updated || Date.now()} />
                  </>
                )}

                {addHistorySectionKey === 'medications' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Name</span>
                      <input value={addHistoryForm.name || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, name: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Dosage</span>
                      <input value={addHistoryForm.dosage || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, dosage: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Frequency</span>
                      <input value={addHistoryForm.frequency || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, frequency: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Start date</span>
                      <input type="date" value={addHistoryForm.start_date || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, start_date: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>End date</span>
                      <input type="date" value={addHistoryForm.end_date || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, end_date: e.target.value || null}))} />
                    </label>
                    <label className="form-field" style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column' }}>
                      <span>Notes</span>
                      <input value={addHistoryForm.notes || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, notes: e.target.value}))} />
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'allergies' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Allergy name</span>
                      <input value={addHistoryForm.allergy_name || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, allergy_name: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Severity</span>
                      <select value={addHistoryForm.severity || 'mild'} onChange={(e)=>setAddHistoryForm(v=>({...v, severity: e.target.value}))}>
                        <option value="mild">mild</option>
                        <option value="moderate">moderate</option>
                        <option value="severe">severe</option>
                      </select>
                    </label>
                    <label className="form-field" style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column' }}>
                      <span>Notes</span>
                      <input value={addHistoryForm.notes || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, notes: e.target.value}))} />
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'surgical_history' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Procedure name</span>
                      <input value={addHistoryForm.procedure_name || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, procedure_name: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Surgery date</span>
                      <input type="date" value={addHistoryForm.surgery_date || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, surgery_date: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Surgeon</span>
                      <input value={addHistoryForm.surgeon || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, surgeon: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Hospital</span>
                      <input value={addHistoryForm.hospital || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, hospital: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column' }}>
                      <span>Notes</span>
                      <input value={addHistoryForm.notes || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, notes: e.target.value}))} />
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'vaccinations' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Vaccine name</span>
                      <input value={addHistoryForm.vaccine_name || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, vaccine_name: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Vaccination date</span>
                      <input type="date" value={addHistoryForm.vaccination_date || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, vaccination_date: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Lot number</span>
                      <input value={addHistoryForm.lot_number || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, lot_number: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Next due date</span>
                      <input type="date" value={addHistoryForm.next_due_date || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, next_due_date: e.target.value}))} />
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'sensitivities' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Sensitivity name</span>
                      <input value={addHistoryForm.sensitivity_name || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, sensitivity_name: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Type</span>
                      <select value={addHistoryForm.type || 'environmental'} onChange={(e)=>setAddHistoryForm(v=>({...v, type: e.target.value}))}>
                        <option value="environmental">environmental</option>
                        <option value="chemical">chemical</option>
                        <option value="food">food</option>
                        <option value="other">other</option>
                      </select>
                    </label>
                    <label className="form-field" style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column' }}>
                      <span>Symptoms</span>
                      <input value={addHistoryForm.symptoms || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, symptoms: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Severity</span>
                      <select value={addHistoryForm.severity || 'mild'} onChange={(e)=>setAddHistoryForm(v=>({...v, severity: e.target.value}))}>
                        <option value="mild">mild</option>
                        <option value="moderate">moderate</option>
                        <option value="severe">severe</option>
                      </select>
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'family_history' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Family member</span>
                      <input value={addHistoryForm.family_member || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, family_member: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Condition name</span>
                      <input value={addHistoryForm.condition_name || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, condition_name: e.target.value}))} required />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Age at diagnosis</span>
                      <input type="number" value={addHistoryForm.age_at_diagnosis || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, age_at_diagnosis: e.target.value ? parseInt(e.target.value, 10) : ''}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:8 }}>
                      <input type="checkbox" checked={!!addHistoryForm.is_genetic} onChange={(e)=>setAddHistoryForm(v=>({...v, is_genetic: e.target.checked}))} />
                      <span>Genetic</span>
                    </label>
                    <label className="form-field" style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column' }}>
                      <span>Notes</span>
                      <input value={addHistoryForm.notes || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, notes: e.target.value}))} />
                    </label>
                  </>
                )}

                <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, justifyContent:'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn outline" onClick={()=>setIsAddHistoryModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn primary" disabled={savingAddHistory}>{savingAddHistory ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Health History Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteHistoryModalOpen}
        onClose={() => {
          setIsDeleteHistoryModalOpen(false);
          setItemToDelete(null);
          setSectionKeyToDelete(null);
        }}
        onConfirm={handleConfirmDeleteHistory}
        title="Delete Record"
        message={itemToDelete 
          ? `Are you sure you want to delete "${itemToDelete.condition_name || itemToDelete.name || itemToDelete.allergy_name || itemToDelete.procedure_name || itemToDelete.vaccine_name || itemToDelete.sensitivity_name || 'this record'}"? This action cannot be undone.`
          : "Are you sure you want to delete this record? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingHistory}
      />

      {activeTab === 'health_data' && (
        <div style={{ maxWidth: 1200 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding:16, borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ margin: 0 }}>Health Data</h2>
              <p style={{ color:'var(--muted)', margin: '8px 0 0 0', fontSize: '14px' }}>
                Track your health metrics, vitals, and wellness data over time.
              </p>
            </div>
            <div style={{ padding:16 }}>
              {/* Add New Health Data Button */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Health Data Management</h3>
                  <button 
                    className="btn primary" 
                    onClick={() => setIsHealthDataModalOpen(true)}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    Add New Health Data
                  </button>
                </div>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
                  Click the button above to add new health data entries. You can track various health metrics including heart rate, blood pressure, activity levels, and more.
                </p>
              </div>

              {/* Health Data Modal */}
              {isHealthDataModalOpen && (
                <div 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(250, 250, 250, 0.1)',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    
                    zIndex: 1000,
                    padding: '20px'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setIsHealthDataModalOpen(false);
                      setEditingRecord(null);
                    }
                  }}
                >
                  <div style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    maxWidth: '800px',
                    width: '100%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Fixed Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '24px 24px 16px 24px',
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      borderRadius: '12px 12px 0 0',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <h2 style={{ margin: 0 }}>
                        {editingRecord ? 'Edit Health Data' : 'Add New Health Data'}
                      </h2>
                      <button 
                        className="btn outline" 
                        onClick={() => {
                          setIsHealthDataModalOpen(false);
                          setEditingRecord(null);
                        }}
                        style={{ padding: '8px 12px' }}
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Scrollable Content */}
                    <div style={{ 
                      padding: '24px',
                      overflowY: 'auto',
                      flex: 1
                    }}>
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveHealthData(); }} className="form" style={{ maxWidth: '100%' }}>
  
                        {/* Two Column Layout */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                          
                          {/* Left Column */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Date */}
                    <label className="form-field">
                      <span>Date</span>
                      <input 
                        type="date" 
                        value={healthData.date} 
                        onChange={(e) => handleHealthDataChange('date', e.target.value)}
                        required
                      />
                    </label>

                    {/* Heart Rate */}
                    <label className="form-field">
                      <span>Heart Rate (bpm)</span>
                      <input 
                        type="number" 
                        value={healthData.heart_rate} 
                        onChange={(e) => handleHealthDataChange('heart_rate', e.target.value)}
                        placeholder="72"
                        min="30" max="200"
                      />
                    </label>

                    {/* Blood Pressure */}
                    <label className="form-field">
                      <span>Blood Pressure Systolic</span>
                      <input 
                        type="number" 
                        value={healthData.blood_pressure_systolic} 
                        onChange={(e) => handleHealthDataChange('blood_pressure_systolic', e.target.value)}
                        placeholder="120"
                        min="70" max="250"
                      />
                    </label>

                    <label className="form-field">
                      <span>Blood Pressure Diastolic</span>
                      <input 
                        type="number" 
                        value={healthData.blood_pressure_diastolic} 
                        onChange={(e) => handleHealthDataChange('blood_pressure_diastolic', e.target.value)}
                        placeholder="80"
                        min="40" max="150"
                      />
                    </label>

                    {/* Activity */}
                    <label className="form-field">
                      <span>Weekly Activity (minutes)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.weekly_activity_minutes} 
                        onChange={(e) => handleHealthDataChange('weekly_activity_minutes', e.target.value)}
                        placeholder="150"
                        min="0" max="10080"
                      />
                    </label>

                    <label className="form-field">
                      <span>Activity Level (1-5)</span>
                      <select 
                        value={healthData.activity_level} 
                        onChange={(e) => handleHealthDataChange('activity_level', e.target.value)}
                      >
                        <option value="">Select Level</option>
                        <option value="1">1 - Sedentary</option>
                        <option value="2">2 - Light Activity</option>
                        <option value="3">3 - Moderate Activity</option>
                        <option value="4">4 - Active</option>
                        <option value="5">5 - Very Active</option>
                      </select>
                    </label>

  {/* Body Temperature */}
  <label className="form-field">
                      <span>Body Temperature (°C)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.body_temperature} 
                        onChange={(e) => handleHealthDataChange('body_temperature', e.target.value)}
                        placeholder="36.6"
                        min="30" max="45"
                      />
                    </label>
                          </div>
                          
                          {/* Right Column */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Hydration */}
                    <label className="form-field">
                      <span>Hydration (liters)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.hydration_liters} 
                        onChange={(e) => handleHealthDataChange('hydration_liters', e.target.value)}
                        placeholder="2.5"
                        min="0" max="10"
                      />
                    </label>

                    {/* Pulse Oximetry */}
                    <label className="form-field">
                      <span>Pulse Oximetry (%)</span>
                      <input 
                        type="number" 
                        value={healthData.pulse_oximetry} 
                        onChange={(e) => handleHealthDataChange('pulse_oximetry', e.target.value)}
                        placeholder="98"
                        min="70" max="100"
                      />
                    </label>

                    {/* Respiratory Rate */}
                    <label className="form-field">
                      <span>Respiratory Rate (breaths/min)</span>
                      <input 
                        type="number" 
                        value={healthData.respiratory_rate} 
                        onChange={(e) => handleHealthDataChange('respiratory_rate', e.target.value)}
                        placeholder="16"
                        min="8" max="40"
                      />
                    </label>

                    {/* Body Weight Trend */}
                    <label className="form-field">
                      <span>Body Weight Trend</span>
                      <select 
                        value={healthData.body_weight_trend} 
                        onChange={(e) => handleHealthDataChange('body_weight_trend', e.target.value)}
                      >
                        <option value="">Select Trend</option>
                        <option value="increasing">Increasing</option>
                        <option value="stable">Stable</option>
                        <option value="decreasing">Decreasing</option>
                        <option value="fluctuating">Fluctuating</option>
                      </select>
                    </label>

                    {/* BMI */}
                    <label className="form-field">
                      <span>Body Mass Index</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.body_mass_index} 
                        onChange={(e) => handleHealthDataChange('body_mass_index', e.target.value)}
                        placeholder="22.5"
                        min="10" max="60"
                      />
                    </label>

                    {/* Fasting Glucose */}
                    <label className="form-field">
                      <span>Fasting Glucose (mg/dL)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.fasting_glucose} 
                        onChange={(e) => handleHealthDataChange('fasting_glucose', e.target.value)}
                        placeholder="85"
                        min="50" max="500"
                      />
                    </label>

                  

                    {/* Visibility Scope */}
                    <label className="form-field">
                      <span>Visibility Scope</span>
                      <select 
                        value={healthData.visibility_scope} 
                        onChange={(e) => handleHealthDataChange('visibility_scope', e.target.value)}
                      >
                        <option value="private">Private</option>
                        <option value="shared">Shared</option>
                        <option value="public">Public</option>
                      </select>
                    </label>

                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button 
                      type="submit" 
                      className="btn primary" 
                      disabled={saving}
                    >
                      {saving ? (editingRecord ? 'Updating...' : 'Saving...') : (editingRecord ? 'Update Health Data' : 'Save Health Data')}
                    </button>
                    {/* Removed Load Test Data button per request */}
                        </div>
                </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Health Data Records */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>
                    Recent Health Data Records
                    {healthDataRecords.length > 0 && (
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 'normal', 
                        color: 'var(--muted)', 
                        marginLeft: '8px' 
                      }}>
                        ({healthDataRecords.length} records)
                      </span>
                    )}
                  </h3>
                
                </div>
                {loadingHealthData ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: 'var(--muted)', margin: 0 }}>Loading health data...</p>
                  </div>
                ) : healthDataRecords.length > 0 ? (
                  <div style={{ 
                    overflowX: 'auto', 
                    overflowY: 'auto', 
                    height: 'calc(100vh - 520px)',
                    minHeight: '300px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      minWidth: '800px'
                    }}>
                      <thead style={{ 
                        position: 'sticky', 
                        top: 0, 
                        backgroundColor: 'var(--card)', 
                        zIndex: 10
                      }}>
                        <tr style={{ borderBottom: '1px solid var(--border)' , backgroundColor: 'var(--border)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Heart Rate</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Blood Pressure</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Activity</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>BMI</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Temperature</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Glucose</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {healthDataRecords.map((record) => (
                          <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px', fontSize: '14px' }}>{record.date}</td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {record.heart_rate ? `${record.heart_rate} bpm` : '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {record.blood_pressure_systolic && record.blood_pressure_diastolic 
                                ? `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}` 
                                : '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {record.weekly_activity_minutes ? `${record.weekly_activity_minutes} min` : '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {record.body_mass_index || '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {record.body_temperature ? `${record.body_temperature}°C` : '-'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {record.fasting_glucose ? `${record.fasting_glucose} mg/dL` : '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  className="btn outline"
                                  onClick={() => handleEditHealthData(record)}
                                  style={{ 
                                    padding: '4px 8px', 
                                    fontSize: '12px',
                                    minWidth: 'auto'
                                  }}
                                  title="Edit record"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn outline"
                                  onClick={() => {
                                    console.log('🗑️ Delete button clicked, record:', record);
                                    handleDeleteHealthData(record.id);
                                  }}
                                  disabled={deletingRecordId === record.id}
                                  style={{ 
                                    padding: '4px 8px', 
                                    fontSize: '12px',
                                    minWidth: 'auto',
                                    color: deletingRecordId === record.id ? 'var(--muted)' : '#ff4444'
                                  }}
                                  title="Delete record"
                                >
                                  {deletingRecordId === record.id ? '⏳' : '🗑️'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: 'var(--muted)', margin: '0 0 8px 0' }}>
                      No health data records yet. Add your first entry above.
                    </p>
                    <p style={{ color: 'var(--warning)', fontSize: '14px', margin: 0 }}>
                      Note: If you've added data but don't see it here, the API endpoint may not be available yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {false && activeTab === 'medical_records' && (
        <div style={{ maxWidth: 920 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding:16, borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ margin: 0 }}>Medical Records</h2>
              <p style={{ color:'var(--muted)', margin: '8px 0 0 0', fontSize: '14px' }}>
                Upload, view, and manage your medical documents and test results.
              </p>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: 16,
                marginBottom: 24 
              }}>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Lab Reports</h3>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>
                    Blood tests, urine tests, and other laboratory results.
                  </p>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Imaging</h3>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>
                    X-rays, MRIs, CT scans, ultrasounds, and other imaging studies.
                  </p>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Prescriptions</h3>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>
                    Current and past medication prescriptions and refills.
                  </p>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Visit Notes</h3>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>
                    Doctor visit summaries, treatment plans, and progress notes.
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: 'var(--muted)', margin: 0 }}>
                  Medical records management features coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'test_card' && (
        <div style={{ maxWidth: 920 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding:16, borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ margin: 0 }}>Test Health History Cards</h2>
              <p style={{ color:'var(--muted)', margin: '8px 0 0 0', fontSize: '14px' }}>
                Testing the HealthHistoryCard component with sample data and add functionality.
              </p>
            </div>
            <div style={{ padding:16 }}>
              <HealthHistoryCard
                title="Medical Conditions"
                lastUpdated="2024-01-15"
                hasAddButton={true}
                buttonLabel="Add Condition"
                data={testData.medical_conditions}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.condition_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.diagnosis_date && `Diagnosed: ${item.diagnosis_date}`}
                      {item.severity && ` • Severity: ${item.severity}`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />
              
              <HealthHistoryCard
                title="Medications"
                lastUpdated="2024-01-10"
                hasAddButton={true}
                buttonLabel="Add Medication"
                data={testData.medications}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.dosage && `Dosage: ${item.dosage}`}
                      {item.frequency && ` • ${item.frequency}`}
                      {item.start_date && ` • Started: ${item.start_date}`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />

              <HealthHistoryCard
                title="Allergies"
                lastUpdated="2024-01-05"
                hasAddButton={true}
                buttonLabel="Add Allergy"
                data={testData.allergies}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.allergy_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.severity && `Severity: ${item.severity}`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />

              <HealthHistoryCard
                title="Surgical History"
                lastUpdated="2023-12-20"
                hasAddButton={true}
                buttonLabel="Add Surgery"
                data={testData.surgical_history}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.procedure_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.surgery_date && `Date: ${item.surgery_date}`}
                      {item.hospital && ` • Hospital: ${item.hospital}`}
                      {item.surgeon && ` • Surgeon: ${item.surgeon}`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />

              <HealthHistoryCard
                title="Vaccinations"
                lastUpdated="2024-01-01"
                hasAddButton={true}
                buttonLabel="Add Vaccination"
                data={testData.vaccinations}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.vaccine_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.vaccination_date && `Date: ${item.vaccination_date}`}
                      {item.administrator && ` • Administered by: ${item.administrator}`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />

              <HealthHistoryCard
                title="Sensitivities"
                lastUpdated="2023-11-15"
                hasAddButton={true}
                buttonLabel="Add Sensitivity"
                data={testData.sensitivities}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.sensitivity_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.type && `Type: ${item.type}`}
                      {item.severity && ` • Severity: ${item.severity}`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />

              <HealthHistoryCard
                title="Family History"
                lastUpdated="2023-10-30"
                hasAddButton={true}
                buttonLabel="Add Family History"
                data={testData.family_history}
                onAdd={handleAddTestItem}
                renderItem={(item) => (
                  <div key={item.id} style={{ 
                    padding: '12px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {item.condition_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {item.family_member && `Family member: ${item.family_member}`}
                      {item.age_at_diagnosis && ` • Age at diagnosis: ${item.age_at_diagnosis}`}
                      {item.is_genetic && ` • Genetic condition`}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function HealthSection({ title, description, options, values, lastUpdated, onToggle, onSave, onAddNew, saving, sectionKey, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div style={{ 
      borderTop: '1px solid var(--border)', 
      backgroundColor: open ? 'var(--bg-subtle)' : 'transparent',
      transition: 'background-color 0.2s ease'
    }}>
      <button 
        onClick={() => setOpen(v => !v)} 
        className="btn ghost"
        style={{ 
          width: '100%', 
          height: '100%', 
          textAlign: 'left', 
          padding: '16px', 
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)' }}>{title}</span>
    
          </div>
          {description && (
            <p style={{ 
              color: 'var(--muted)', 
              fontSize: '13px', 
              margin: '0 0 0 0',
              lineHeight: '1.4'
            }}>
              {description}
            </p>
          )}
          {!lastUpdated && (
            <p style={{ 
              color: 'var(--muted)', 
              fontSize: '11px', 
              margin: '4px 0 0 0',
              fontStyle: 'italic'
            }}>
              Not yet saved
            </p>
          )}
        </div>
        <span style={{ 
          color: 'var(--muted)', 
          fontSize: '18px',
          marginLeft: '16px',
          flexShrink: 0,
          transition: 'transform 0.2s ease'
        }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      
      {open && (
        <div style={{ 
          padding: '16px 0 16px 0',
        
          marginLeft: '20px',
          
          transition: 'background-color 0.2s ease'
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 8, 
            marginBottom: 16,
            minHeight: '40px',
            alignItems: 'center'
          }}>
            {values.length === 0 ? (
              <p style={{ 
                color: 'var(--muted)', 
                fontSize: '14px', 
                fontStyle: 'italic',
                margin: 0
              }}>
                No {title.toLowerCase()} added yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                {values.map((item, idx) => {
                  // Handle both object and string formats
                  const isObject = typeof item === 'object' && item !== null;
                  // Generate unique key combining section, index, and item identifier to avoid duplicates
                  const itemIdentifier = isObject 
                    ? (item.id || item.medical_conditions_id || item.condition_name || item.name || item.allergy_name || item.procedure_name || item.vaccine_name || item.sensitivity_name || `obj-${idx}`)
                    : item;
                  const uniqueKey = `${sectionKey}-${idx}-${itemIdentifier}`;
                  
                  // Unified card design for all sections
                  const displayName = isObject ? (item.condition_name || item.name || item.allergy_name || item.procedure_name || item.vaccine_name || item.sensitivity_name || 'Unknown') : item;
                  const infoParts = [];
                  const diagnosis = item?.diagnosis_date || item?.entry_date || item?.date || item?.start_date;
                  const endDate = item?.end_date;
                  const severity = item?.severity;
                  const dosage = item?.dosage;
                  const frequency = item?.frequency;
                  const notes = item?.notes || item?.treatment_plan;
                  if (diagnosis) infoParts.push(`Date: ${diagnosis}`);
                  if (endDate) infoParts.push(`End: ${endDate}`);
                  if (dosage) infoParts.push(`Dosage: ${dosage}`);
                  if (frequency) infoParts.push(`Freq: ${frequency}`);
                  if (severity) infoParts.push(`Severity: ${severity}`);
                  if (notes) infoParts.push(notes);

                  return (
                    <div key={uniqueKey} style={{
                      backgroundColor: 'rgba(17, 17, 17, 0.6)',
                      border: '1px solid var(--border)',
                      borderLeft: '2px solid var(--primary)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      cursor: 'pointer'
                    }}
                      onClick={(e) => {
                        // Only edit if not clicking on delete button
                        if (e.target.tagName !== 'BUTTON') {
                          onEdit?.(item);
                        }
                      }}
                      role="button"
                      title="Edit record"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{displayName}</span>
                          {severity && (
                            <span style={{ fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{severity}</span>
                          )}
                        </div>
                        {infoParts.length > 0 && (
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                            {infoParts.join(' • ')}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          onDelete?.(item); 
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '16px',
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '1'}
                        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Options list with inline-checkbox removed as per request */}
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="btn outline" 
              onClick={onAddNew}
              style={{ minWidth: '140px' }}
              title={`Add new item to ${title.toLowerCase()}`}
            >
              + Add New
            </button>
          </div>
        </div>
      )}
      


    </div>
  );
}
