import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { authRequest } from "../../api/apiClient.js";
import { useAuth } from "../../api/AuthContext.jsx";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { useTheme } from "../../contexts/ThemeContext.jsx";
import DatePicker from "../../components/DatePicker.jsx";
import DateTimePicker from "../../components/DateTimePicker.jsx";
import { ProfilesApi } from "../../api/profilesApi.js";
import { UploadFileApi } from "../../api/uploadFileApi.js";
import { HealthApi } from "../../api/healthApi.js";
import { ENDPOINTS, CUSTOM_ENDPOINTS } from "../../api/apiConfig.js";
import { HealthHistoryApi, HealthHistoryConsolidated } from "../../api/healthHistoryApi.js";
import { OnboardingApi } from "../../api/onboardingApi.js";
import HealthHistoryCard from "../../components/HealthHistoryCard-TEST.jsx";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal.jsx";

export default function DashboardProfile() {
  const navigate = useNavigate();
  const { isLight } = useTheme();
  
  const { user, setUser } = useAuth();
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
    body_fat_percentage: "",
    body_fat_method: "",
    waist_circumference: "",
    hip_circumference: "",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = String(searchParams.get('tab') || '').toLowerCase();
    const allowed = ['personal', 'health_history', 'health_data'];
    return allowed.includes(t) ? t : 'personal';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [heightUnit, setHeightUnit] = useState('in');
  const [weightUnit, setWeightUnit] = useState('lb');
  const [temperatureUnit, setTemperatureUnit] = useState('F'); // 'F' for Fahrenheit (default), 'C' for Celsius
  const [healthDataWeightUnit, setHealthDataWeightUnit] = useState('lb'); // For health data weight field (default: lb, toggle to kg)
  const [waistUnit, setWaistUnit] = useState('in'); // For waist circumference in health data (default: inches, toggle to cm)
  const [personalWaistUnit, setPersonalWaistUnit] = useState('in'); // For waist circumference in personal info (default: inches, toggle to cm)
  const [hipUnit, setHipUnit] = useState('in'); // For hip circumference in personal info (default: inches, toggle to cm)
  const [waterUnit, setWaterUnit] = useState('oz'); // For water intake: 'oz' (ounces) or 'L' (liters), default: oz
  const [glucoseType, setGlucoseType] = useState('fasting'); // 'fasting', 'random', 'post-meal'
  const [bmiHoveredCategory, setBmiHoveredCategory] = useState(null);
  const [bmiTooltipPosition, setBmiTooltipPosition] = useState({ x: 0, y: 0 });

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
    // Scroll to top when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Also try to scroll dash-content if available
    const dashContent = document.querySelector('.dash-content');
    if (dashContent) {
      dashContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Format date to US format (MM/DD/YYYY)
  const formatDateUS = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return dateStr;
    }
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
    dental_history: null,
  });

  // Dental History state (as array like other sections)
  const [dentalHistory, setDentalHistory] = useState([]);

  // Health Data state
  const [healthData, setHealthData] = useState({
    date: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    })(),
    heart_rate: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    weekly_activity_minutes: '',
    activity_level: '',
    visibility_scope: 'private',
    hydration_liters: '',
    pulse_oximetry: '',
    respiratory_rate: '',
    body_weight: '',
    body_mass_index: '',
    blood_glucose: '',
    body_temperature: '',
    sleep_duration: '',
    sleep_quality: '',
    waist_circumference: '',
    hrv: '',
    mood: '',
    stress_level: '',
    daily_step_count: ''
  });

  const [healthDataRecords, setHealthDataRecords] = useState([]);
  const [loadingHealthData, setLoadingHealthData] = useState(false);
  const [isHealthDataModalOpen, setIsHealthDataModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Health Data Records filtering and sorting
  const [sortColumn, setSortColumn] = useState(null); // 'date' | 'heart_rate' | 'blood_pressure' | 'activity' | 'bmi' | 'temperature' | 'glucose'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    heartRateMin: '',
    heartRateMax: '',
    bloodPressureSystolicMin: '',
    bloodPressureSystolicMax: '',
    bloodPressureDiastolicMin: '',
    bloodPressureDiastolicMax: '',
    activityMin: '',
    activityMax: '',
    bmiMin: '',
    bmiMax: '',
    temperatureMin: '',
    temperatureMax: '',
    glucoseMin: '',
    glucoseMax: ''
  });
  const [showFilters, setShowFilters] = useState(false);

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
    dental_history: false,
  });
  // Dedicated saving state for Add modal
  const [savingAddHistory, setSavingAddHistory] = useState(false);
  // Delete confirmation modal state for Health History
  const [isDeleteHistoryModalOpen, setIsDeleteHistoryModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [sectionKeyToDelete, setSectionKeyToDelete] = useState(null);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  // Autocomplete state for modal name fields
  const [showModalAutocomplete, setShowModalAutocomplete] = useState(false);
  const modalNameInputRef = useRef(null);

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
        background: ${isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.8)'};
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
        background: ${isLight ? '#ffffff' : 'rgba(17, 17, 17, 0.95)'};
        border: 1px solid ${isLight ? '#e5e7eb' : '#222222'};
        border-radius: 16px;
        max-width: 420px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: ${isLight 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)' 
          : '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 186, 206, 0.1)'};
        animation: slideIn 0.3s ease-out;
        position: relative;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      `;
      
      const headerBg = isLight 
        ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.8) 0%, rgba(255, 255, 255, 1) 100%)' 
        : 'linear-gradient(135deg, rgba(255, 76, 76, 0.1) 0%, rgba(17, 17, 17, 0.8) 100%)';
      const borderColor = isLight ? '#e5e7eb' : '#222222';
      const textColor = isLight ? '#111827' : '#ffffff';
      const textMuted = isLight ? '#6b7280' : '#cccccc';
      const warningBg = isLight ? 'rgba(254, 243, 199, 0.5)' : 'rgba(255, 76, 76, 0.2)';
      const warningBorder = isLight ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 76, 76, 0.3)';
      const closeBtnBg = isLight ? 'rgba(243, 244, 246, 0.8)' : 'rgba(34, 34, 34, 0.8)';
      const closeBtnBorder = isLight ? '#d1d5db' : '#333333';
      const closeBtnHoverBg = isLight ? 'rgba(229, 231, 235, 0.9)' : 'rgba(0, 186, 206, 0.2)';
      const closeBtnHoverBorder = isLight ? '#9ca3af' : '#00bace';
      
      modalContent.innerHTML = `
        <!-- Header -->
        <div style="padding: 24px 24px 20px; border-bottom: 1px solid ${borderColor}; background: ${headerBg}; position: relative;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: ${warningBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid ${warningBorder};">
              <span style="font-size: 20px;">⚠️</span>
            </div>
            <h3 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">
              Delete Health Data Record
            </h3>
          </div>
          <p style="margin: 0; color: ${textMuted}; font-size: 14px; line-height: 1.6; padding-right: 40px;">
            This action cannot be undone. Please confirm that you want to permanently delete this health data record.
          </p>
          <button id="close-modal-btn" style="
            position: absolute;
            top: 20px;
            right: 20px;
            width: 32px;
            height: 32px;
            background: ${closeBtnBg};
            border: 1px solid ${closeBtnBorder};
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: ${textMuted};
            transition: all 0.2s ease;
            font-weight: 300;
          " onmouseover="this.style.background='${closeBtnHoverBg}'; this.style.borderColor='${closeBtnHoverBorder}'; this.style.color='${textColor}';" onmouseout="this.style.background='${closeBtnBg}'; this.style.borderColor='${closeBtnBorder}'; this.style.color='${textMuted}';">
            ×
          </button>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <!-- Record Details -->
          <div style="background: ${isLight ? 'rgba(249, 250, 251, 0.8)' : 'rgba(17, 17, 17, 0.6)'}; border: 1px solid ${isLight ? '#e5e7eb' : '#333333'}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h4 style="margin: 0; color: ${isLight ? '#00bace' : '#00bace'}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
              Record Details
            </h4>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid ${isLight ? '#e5e7eb' : '#333333'};">
                <span style="color: ${isLight ? '#6b7280' : '#777777'}; font-size: 13px; font-weight: 500;">Date:</span>
                <span style="color: ${textColor}; font-size: 13px; font-weight: 600;">${recordToDelete.date || 'Unknown'}</span>
              </div>
              ${recordToDelete.heart_rate ? `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid ${isLight ? '#e5e7eb' : '#333333'};">
                  <span style="color: ${isLight ? '#6b7280' : '#777777'}; font-size: 13px; font-weight: 500;">Heart Rate:</span>
                  <span style="color: ${textColor}; font-size: 13px; font-weight: 600;">${recordToDelete.heart_rate} bpm</span>
                </div>
              ` : ''}
              ${recordToDelete.blood_pressure_systolic && recordToDelete.blood_pressure_diastolic ? `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                  <span style="color: ${isLight ? '#6b7280' : '#777777'}; font-size: 13px; font-weight: 500;">Blood Pressure:</span>
                  <span style="color: ${textColor}; font-size: 13px; font-weight: 600;">${recordToDelete.blood_pressure_systolic}/${recordToDelete.blood_pressure_diastolic}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 24px 24px; border-top: 1px solid ${borderColor}; background: ${isLight ? 'rgba(249, 250, 251, 0.5)' : 'rgba(17, 17, 17, 0.8)'}; display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-delete-btn" style="
            padding: 12px 24px;
            background: ${isLight ? '#f3f4f6' : 'transparent'};
            color: ${isLight ? '#374151' : '#cccccc'};
            border: 1px solid ${isLight ? '#d1d5db' : '#333333'};
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 100px;
          " onmouseover="this.style.background='${isLight ? '#e5e7eb' : 'rgba(0, 186, 206, 0.1)'}'; this.style.borderColor='${isLight ? '#9ca3af' : '#00bace'}'; this.style.color='${isLight ? '#111827' : '#ffffff'}';" onmouseout="this.style.background='${isLight ? '#f3f4f6' : 'transparent'}'; this.style.borderColor='${isLight ? '#d1d5db' : '#333333'}'; this.style.color='${isLight ? '#374151' : '#cccccc'}';">
            Cancel
          </button>
          <button id="confirm-delete-btn" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            border: 1px solid #dc2626;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            min-width: 120px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          " onmouseover="this.style.filter='brightness(1.1)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(220, 38, 38, 0.4)';" onmouseout="this.style.filter='brightness(1)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(220, 38, 38, 0.3)';">
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
    setHealthData(prev => {
      const updated = {
      ...prev,
      [field]: value
      };
      
      // Auto-calculate BMI when body_weight changes
      if (field === 'body_weight' && value && profile) {
        const calculatedBMI = calculateBMIFromProfile(parseFloat(value), healthDataWeightUnit);
        if (calculatedBMI !== null) {
          updated.body_mass_index = calculatedBMI.toFixed(1);
        }
      }
      
      return updated;
    });
  };

  // Calculate BMI from profile height and current weight
  const calculateBMIFromProfile = (weight, weightUnit) => {
    if (!profile) return null;
    
    // Get height from profile
    const profileHeight = profile.height_cm;
    const profileHeightUnit = profile.height_type || 'cm';
    
    if (!profileHeight || profileHeight <= 0) return null;
    if (!weight || weight <= 0) return null;
    
    // Convert height to meters
    let heightMeters;
    if (profileHeightUnit === 'cm' || profileHeightUnit === '') {
      heightMeters = profileHeight / 100; // cm to meters
    } else {
      // inches to meters: inches * 0.0254
      heightMeters = profileHeight * 0.0254;
    }
    
    // Convert weight to kg
    let weightKg;
    if (weightUnit === 'kg') {
      weightKg = weight;
    } else {
      // lb to kg: pounds * 0.453592
      weightKg = weight * 0.453592;
    }
    
    // Calculate BMI: weight (kg) / height (m)^2
    const bmi = weightKg / (heightMeters * heightMeters);
    
    // Validate BMI is within reasonable range
    if (bmi && !isNaN(bmi) && isFinite(bmi) && bmi > 0 && bmi >= 10 && bmi <= 60) {
      return bmi;
    }
    
    return null;
  };

  // Temperature conversion functions
  const celsiusToFahrenheit = (celsius) => {
    return (celsius * 9/5) + 32;
  };

  const fahrenheitToCelsius = (fahrenheit) => {
    return (fahrenheit - 32) * 5/9;
  };

  // Handle temperature unit change
  const handleTemperatureUnitChange = (newUnit) => {
    if (newUnit === temperatureUnit) return;
    
    const currentValue = parseFloat(healthData.body_temperature);
    if (!isNaN(currentValue) && currentValue !== '') {
      let convertedValue;
      if (temperatureUnit === 'C' && newUnit === 'F') {
        // Converting from Celsius to Fahrenheit
        convertedValue = celsiusToFahrenheit(currentValue);
      } else if (temperatureUnit === 'F' && newUnit === 'C') {
        // Converting from Fahrenheit to Celsius
        convertedValue = fahrenheitToCelsius(currentValue);
      } else {
        convertedValue = currentValue;
      }
      
      setHealthData(prev => ({
        ...prev,
        body_temperature: convertedValue.toFixed(1)
      }));
    }
    
    setTemperatureUnit(newUnit);
  };

  // Weight conversion functions
  const kgToLb = (kg) => {
    return kg * 2.20462;
  };

  const lbToKg = (lb) => {
    return lb / 2.20462;
  };

  // Water conversion functions
  const ozToLiters = (oz) => {
    return oz * 0.0295735; // 1 fluid ounce = 0.0295735 liters
  };

  const litersToOz = (liters) => {
    return liters / 0.0295735; // 1 liter = 33.814 fluid ounces
  };

  // Handle weight unit change
  const handleWeightUnitChange = (newUnit) => {
    if (newUnit === healthDataWeightUnit) return;
    
    const currentValue = parseFloat(healthData.body_weight);
    if (!isNaN(currentValue) && currentValue !== '') {
      let convertedValue;
      if (healthDataWeightUnit === 'kg' && newUnit === 'lb') {
        convertedValue = kgToLb(currentValue);
      } else if (healthDataWeightUnit === 'lb' && newUnit === 'kg') {
        convertedValue = lbToKg(currentValue);
      } else {
        convertedValue = currentValue;
      }
      
      setHealthData(prev => {
        const updated = {
          ...prev,
          body_weight: convertedValue.toFixed(1)
        };
        
        // Recalculate BMI with new weight unit
        if (profile) {
          const calculatedBMI = calculateBMIFromProfile(convertedValue, newUnit);
          if (calculatedBMI !== null) {
            updated.body_mass_index = calculatedBMI.toFixed(1);
          }
        }
        
        return updated;
      });
    }
    
    setHealthDataWeightUnit(newUnit);
  };

  // Waist circumference conversion functions
  const cmToIn = (cm) => {
    return cm / 2.54;
  };

  const inToCm = (inches) => {
    return inches * 2.54;
  };

  // Handle waist unit change (for health data)
  const handleWaistUnitChange = (newUnit) => {
    if (newUnit === waistUnit) return;
    
    const currentValue = parseFloat(healthData.waist_circumference);
    if (!isNaN(currentValue) && currentValue !== '') {
      let convertedValue;
      if (waistUnit === 'cm' && newUnit === 'in') {
        convertedValue = cmToIn(currentValue);
      } else if (waistUnit === 'in' && newUnit === 'cm') {
        convertedValue = inToCm(currentValue);
      } else {
        convertedValue = currentValue;
      }
      
      setHealthData(prev => ({
        ...prev,
        waist_circumference: convertedValue.toFixed(1)
      }));
    }
    
    setWaistUnit(newUnit);
  };

  // Handle personal waist unit change (for personal info)
  const handlePersonalWaistUnitChange = (newUnit) => {
    if (newUnit === personalWaistUnit) return;
    
    const currentValue = parseFloat(formValues.waist_circumference);
    if (!isNaN(currentValue) && currentValue !== '') {
      let convertedValue;
      if (personalWaistUnit === 'cm' && newUnit === 'in') {
        convertedValue = cmToIn(currentValue);
      } else if (personalWaistUnit === 'in' && newUnit === 'cm') {
        convertedValue = inToCm(currentValue);
      } else {
        convertedValue = currentValue;
      }
      
      setFormValues(prev => ({
        ...prev,
        waist_circumference: convertedValue.toFixed(1)
      }));
    }
    
    setPersonalWaistUnit(newUnit);
  };

  // Handle hip unit change (for personal info)
  const handleHipUnitChange = (newUnit) => {
    if (newUnit === hipUnit) return;
    
    const currentValue = parseFloat(formValues.hip_circumference);
    if (!isNaN(currentValue) && currentValue !== '') {
      let convertedValue;
      if (hipUnit === 'cm' && newUnit === 'in') {
        convertedValue = cmToIn(currentValue);
      } else if (hipUnit === 'in' && newUnit === 'cm') {
        convertedValue = inToCm(currentValue);
      } else {
        convertedValue = currentValue;
      }
      
      setFormValues(prev => ({
        ...prev,
        hip_circumference: convertedValue.toFixed(1)
      }));
    }
    
    setHipUnit(newUnit);
  };

  // Handle water unit change
  // Note: hydration_liters always stores in liters
  // When displaying, if waterUnit is 'oz', we show litersToOz(hydration_liters)
  // When user inputs, if waterUnit is 'oz', we convert ozToLiters(input) before storing
  const handleWaterUnitChange = (newUnit) => {
    if (newUnit === waterUnit) return;
    // No need to convert hydration_liters - it always stores in liters
    // We just change the display unit
    setWaterUnit(newUnit);
  };

  const handleSaveHealthData = async () => {
    // If editing, use update function
    if (editingRecord) {
      await handleUpdateHealthData();
      return;
    }

    try {
      setSaving(true);
      
      // Validate data before sending (use original healthData values, not converted)
      const validateHealthData = () => {
        const errors = [];
        
        if (healthData.heart_rate && (parseInt(healthData.heart_rate) < 30 || parseInt(healthData.heart_rate) > 200)) {
          errors.push('Heart rate should be between 30-200 bpm');
        }
        if (healthData.blood_pressure_systolic && (parseInt(healthData.blood_pressure_systolic) < 70 || parseInt(healthData.blood_pressure_systolic) > 250)) {
          errors.push('Systolic blood pressure should be between 70-250 mmHg');
        }
        if (healthData.blood_pressure_diastolic && (parseInt(healthData.blood_pressure_diastolic) < 40 || parseInt(healthData.blood_pressure_diastolic) > 150)) {
          errors.push('Diastolic blood pressure should be between 40-150 mmHg');
        }
        if (healthData.pulse_oximetry && (parseInt(healthData.pulse_oximetry) < 70 || parseInt(healthData.pulse_oximetry) > 100)) {
          errors.push('Pulse oximetry should be between 70-100%');
        }
        if (healthData.respiratory_rate && (parseInt(healthData.respiratory_rate) < 8 || parseInt(healthData.respiratory_rate) > 40)) {
          errors.push('Respiratory rate should be between 8-40 breaths/min');
        }
        if (healthData.body_mass_index && (parseFloat(healthData.body_mass_index) < 10 || parseFloat(healthData.body_mass_index) > 60)) {
          errors.push('BMI should be between 10-60');
        }
        if (healthData.blood_glucose && (parseFloat(healthData.blood_glucose) < 50 || parseFloat(healthData.blood_glucose) > 500)) {
          errors.push('Blood glucose should be between 50-500 mg/dL');
        }
        // Validate temperature based on current unit (before conversion)
        if (healthData.body_temperature && healthData.body_temperature.trim() !== '') {
          const tempValue = parseFloat(healthData.body_temperature);
          if (!isNaN(tempValue)) {
            const tempC = temperatureUnit === 'F' 
              ? fahrenheitToCelsius(tempValue)
              : tempValue;
            if (tempC < 30 || tempC > 45) {
              errors.push(`Body temperature should be between ${temperatureUnit === 'F' ? '86-113°F' : '30-45°C'}`);
            }
          }
        }
        if (healthData.activity_level && (parseInt(healthData.activity_level) < 1 || parseInt(healthData.activity_level) > 5)) {
          errors.push('Activity level should be between 1-5');
        }
        if (healthData.body_weight && healthData.body_weight.trim() !== '') {
          const weightValue = parseFloat(healthData.body_weight);
          if (!isNaN(weightValue)) {
            const weightKg = healthDataWeightUnit === 'lb' 
              ? lbToKg(weightValue)
              : weightValue;
            if (weightKg < 20 || weightKg > 300) {
              errors.push('Body weight should be between 20-300 kg (44-660 lb)');
            }
          }
        }
        if (healthData.sleep_duration && (parseFloat(healthData.sleep_duration) < 0 || parseFloat(healthData.sleep_duration) > 24)) {
          errors.push('Sleep duration should be between 0-24 hours');
        }
        if (healthData.waist_circumference && healthData.waist_circumference.trim() !== '') {
          const waistValue = parseFloat(healthData.waist_circumference);
          if (!isNaN(waistValue)) {
            const waistCm = waistUnit === 'in' 
              ? inToCm(waistValue)
              : waistValue;
            if (waistCm < 40 || waistCm > 200) {
              errors.push('Waist circumference should be between 40-200 cm (15.7-78.7 in)');
            }
          }
        }
        if (healthData.hrv && (parseFloat(healthData.hrv) < 0 || parseFloat(healthData.hrv) > 200)) {
          errors.push('HRV should be between 0-200 ms');
        }
        if (healthData.mood && (parseInt(healthData.mood) < 1 || parseInt(healthData.mood) > 5)) {
          errors.push('Mood should be between 1-5');
        }
        if (healthData.stress_level && (parseInt(healthData.stress_level) < 1 || parseInt(healthData.stress_level) > 5)) {
          errors.push('Stress level should be between 1-5');
        }
        if (healthData.sleep_quality && (parseInt(healthData.sleep_quality) < 1 || parseInt(healthData.sleep_quality) > 5)) {
          errors.push('Sleep quality should be between 1-5');
        }
        if (healthData.daily_step_count && (parseInt(healthData.daily_step_count) < 0 || parseInt(healthData.daily_step_count) > 100000)) {
          errors.push('Daily step count should be between 0-100000');
        }
        
        return errors;
      };
      
      // Prepare data for API
      // API expects date format (YYYY-MM-DD), so extract date part from datetime
      const dateForApi = healthData.date 
        ? (healthData.date.includes('T') ? healthData.date.split('T')[0] : healthData.date)
        : null;
      
      // Extract time from datetime (format: HH:MM)
      const timeForApi = healthData.date && healthData.date.includes('T')
        ? healthData.date.split('T')[1]?.substring(0, 5) || null // Extract HH:MM part
        : null;
      
      // Only include fields with non-empty values
      const healthDataPayload = {
        user_id: user.id,
        ...(dateForApi && { date: dateForApi }),
        ...(timeForApi && { time: timeForApi }),
        ...(healthData.heart_rate && healthData.heart_rate.trim() !== '' && { heart_rate: parseInt(healthData.heart_rate) }),
        ...(healthData.blood_pressure_systolic && healthData.blood_pressure_systolic.trim() !== '' && { blood_pressure_systolic: parseInt(healthData.blood_pressure_systolic) }),
        ...(healthData.blood_pressure_diastolic && healthData.blood_pressure_diastolic.trim() !== '' && { blood_pressure_diastolic: parseInt(healthData.blood_pressure_diastolic) }),
        ...(healthData.weekly_activity_minutes && healthData.weekly_activity_minutes.trim() !== '' && { weekly_activity_minutes: parseFloat(healthData.weekly_activity_minutes) }),
        ...(healthData.activity_level && healthData.activity_level.trim() !== '' && { activity_level: parseInt(healthData.activity_level) }),
        ...(healthData.hydration_liters && healthData.hydration_liters.trim() !== '' && { 
          // hydration_liters is stored in liters, convert to selected unit for API
          hydration_liters: waterUnit === 'oz' 
            ? litersToOz(parseFloat(healthData.hydration_liters))
            : parseFloat(healthData.hydration_liters),
          hydration_liter_unit: waterUnit === 'oz' ? 'ounces' : 'liter'
        }),
        ...(healthData.pulse_oximetry && healthData.pulse_oximetry.trim() !== '' && { pulse_oximetry: parseInt(healthData.pulse_oximetry) }),
        ...(healthData.respiratory_rate && healthData.respiratory_rate.trim() !== '' && { respiratory_rate: parseInt(healthData.respiratory_rate) }),
        ...(healthData.body_mass_index && healthData.body_mass_index.trim() !== '' && { body_mass_index: parseFloat(healthData.body_mass_index) }),
        ...(healthData.blood_glucose && healthData.blood_glucose.trim() !== '' && { 
          blood_glucose: parseFloat(healthData.blood_glucose),
          blood_glucose_unit: glucoseType || 'fasting'
        }),
        ...(healthData.body_temperature && healthData.body_temperature.trim() !== '' && {
          body_temperature: parseFloat(healthData.body_temperature),
          body_temperature_unit: temperatureUnit || 'F'
        }),
        ...(healthData.body_weight && healthData.body_weight.trim() !== '' && {
          body_weight: healthDataWeightUnit === 'lb' ? lbToKg(parseFloat(healthData.body_weight)) : parseFloat(healthData.body_weight),
          body_weight_unit: healthDataWeightUnit || 'lb'
        }),
        ...(healthData.sleep_duration && healthData.sleep_duration.trim() !== '' && { sleep_duration: parseFloat(healthData.sleep_duration) }),
        ...(healthData.sleep_quality && healthData.sleep_quality.toString().trim() !== '' && { sleep_quality: healthData.sleep_quality.toString() }),
        ...(healthData.waist_circumference && healthData.waist_circumference.trim() !== '' && {
          waist_circumference: waistUnit === 'in' ? inToCm(parseFloat(healthData.waist_circumference)) : parseFloat(healthData.waist_circumference),
          waist_circumference_unit: waistUnit || 'in'
        }),
        ...(healthData.hrv && healthData.hrv.trim() !== '' && { HRV: parseFloat(healthData.hrv) }),
        ...(healthData.mood && healthData.mood.toString().trim() !== '' && { mood: healthData.mood.toString() }),
        ...(healthData.stress_level && healthData.stress_level.toString().trim() !== '' && { stress_level: healthData.stress_level.toString() }),
        ...(healthData.daily_step_count && healthData.daily_step_count.trim() !== '' && { daily_step_count: parseInt(healthData.daily_step_count) }),
        ...(healthData.visibility_scope && { visibility_scope: healthData.visibility_scope }),
      };
      
      // Validate data (before conversion)
      const validationErrors = validateHealthData();
      if (validationErrors.length > 0) {
        showError(`Please check your data: ${validationErrors.join(', ')}`);
        return;
      }

      console.log('Create Health Data - Request payload:', healthDataPayload);

      // Call API endpoint using HealthApi
      const response = await HealthApi.create(healthDataPayload);

      console.log('✅ Health data create response:', response);

      // Reset form
      const resetNow = new Date();
      const resetYear = resetNow.getFullYear();
      const resetMonth = String(resetNow.getMonth() + 1).padStart(2, '0');
      const resetDay = String(resetNow.getDate()).padStart(2, '0');
      const resetHours = String(resetNow.getHours()).padStart(2, '0');
      const resetMinutes = String(resetNow.getMinutes()).padStart(2, '0');
      setHealthData({
        date: `${resetYear}-${resetMonth}-${resetDay}T${resetHours}:${resetMinutes}`,
        heart_rate: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        weekly_activity_minutes: '',
        activity_level: '',
        visibility_scope: 'private',
        hydration_liters: '',
        pulse_oximetry: '',
        respiratory_rate: '',
        body_weight: '',
        body_mass_index: '',
        blood_glucose: '',
        body_temperature: '',
        sleep_duration: '',
        sleep_quality: '',
        waist_circumference: '',
        hrv: '',
        mood: '',
        stress_level: '',
        daily_step_count: ''
      });
      // Reset units to defaults
      setTemperatureUnit('F');
      setHealthDataWeightUnit('lb');
      setWaistUnit('in');
      setWaterUnit('oz');
      setGlucoseType('fasting');

      showSuccess('Health data saved successfully!');
      setIsHealthDataModalOpen(false); // Close modal after successful save
      
      // Reload data to update the list with latest records from server
      await loadHealthData();
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
        || itemToDelete?.family_history_id || itemToDelete?.family_id
        || itemToDelete?.dental_history_id;
      
      if (!id) {
        throw new Error('Cannot delete: record ID not found');
      }

      // For dental_history, ID can be UUID (string), for others it's numeric
      let recordId;
      if (sectionKeyToDelete === 'dental_history') {
        // Dental history uses UUID, keep as string
        recordId = id;
      } else {
        // Other sections use numeric IDs
        const numericId = Number(id);
        if (!Number.isFinite(numericId)) {
          throw new Error('Invalid record ID: must be a number');
        }
        recordId = numericId;
      }

      // Delete based on section type
      switch (sectionKeyToDelete) {
        case 'medical_conditions':
          await HealthHistoryApi.deleteMedicalCondition(recordId);
          break;
        case 'allergies':
          await HealthHistoryApi.deleteAllergy(recordId);
          break;
        case 'medications':
          await HealthHistoryApi.deleteMedication(recordId);
          break;
        case 'sensitivities':
          await HealthHistoryApi.deleteSensitivity(recordId);
          break;
        case 'family_history':
          await HealthHistoryApi.deleteFamilyHistory(recordId);
          break;
        case 'vaccinations':
          await HealthHistoryApi.deleteVaccination(recordId);
          break;
        case 'surgical_history':
          await HealthHistoryApi.deleteSurgicalHistory(recordId);
          break;
        case 'dental_history':
          // Delete from API - ID is in the URL path (can be UUID)
          await authRequest(ENDPOINTS.dentalHistory.remove(recordId), {
            method: 'DELETE',
          });
          // Reload dental history from API
          await loadDentalHistory();
          break;
        // TODO: Add delete methods for other sections when endpoints are available
        default:
          console.warn(`Delete not implemented for section: ${sectionKeyToDelete}`);
          throw new Error(`Delete operation not available for ${sectionKeyToDelete}`);
      }

      // Reload health history summary (skip for dental_history as it's handled above)
      if (sectionKeyToDelete !== 'dental_history') {
      await loadHealthHistorySummary();
      }
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
    // Get units from record (or defaults)
    const recordWeightUnit = record.body_weight_unit || 'lb';
    const recordWaistUnit = record.waist_circumference_unit || 'in';
    
    // Set units first
    setHealthDataWeightUnit(recordWeightUnit);
    setWaistUnit(recordWaistUnit);
    const recordHydrationUnit = (record.hydration_liter_unit || record.hydration_unit || '').toString().trim().toLowerCase();
    // Handle both 'liter' and 'liters' from API, default to 'oz' if not recognized
    const resolvedWaterUnit = ['l', 'liter', 'liters'].includes(recordHydrationUnit) ? 'L' : 'oz';
    setWaterUnit(resolvedWaterUnit);
    
    // Handle body_weight: check both new field (body_weight) and old field (body_weight_trend)
    // API may return body_weight_trend for old records, but we use body_weight
    const bodyWeightValue = record.body_weight !== undefined && record.body_weight !== null 
      ? record.body_weight 
      : (record.body_weight_trend && record.body_weight_trend !== '' ? parseFloat(record.body_weight_trend) : null);
    
    // Values are stored in kg/cm in API, but we need to convert to display unit
    // If stored unit is lb/in, convert from kg/cm to lb/in
    let displayWeight = bodyWeightValue?.toString() || '';
    if (displayWeight && recordWeightUnit === 'lb') {
      // API stores in kg, convert to lb for display
      displayWeight = kgToLb(parseFloat(displayWeight)).toFixed(1);
    }
    
    let displayWaist = record.waist_circumference?.toString() || '';
    if (displayWaist && recordWaistUnit === 'in') {
      // API stores in cm, convert to in for display
      displayWaist = cmToIn(parseFloat(displayWaist)).toFixed(1);
    }
    
    // Handle HRV: API returns HRV (uppercase), but we use hrv in state
    const hrvValue = record.HRV !== undefined && record.HRV !== null 
      ? record.HRV 
      : (record.hrv !== undefined && record.hrv !== null ? record.hrv : null);
    
    // Helper function to convert value to string, handling 0 and null/undefined
    const toFormValue = (value) => {
      if (value === null || value === undefined) return '';
      if (value === 0) return '0';
      return value.toString();
    };
    
    // Calculate BMI if we have weight and profile height
    let calculatedBMI = null;
    if (displayWeight && profile && profile.height_cm) {
      const weightValue = parseFloat(displayWeight);
      if (!isNaN(weightValue) && weightValue > 0) {
        calculatedBMI = calculateBMIFromProfile(weightValue, recordWeightUnit);
      }
    }
    
    // Populate form with record data
    // Handle date: if API returns datetime, use it; if only date, add current time
    let dateValue = '';
    if (record.date) {
      if (record.date.includes('T')) {
        // Already has time, use as-is
        dateValue = record.date;
      } else {
        // Only date, add current time
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        dateValue = `${record.date}T${hours}:${minutes}`;
      }
    } else {
      // No date, use current datetime
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      dateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    setHealthData({
      date: dateValue,
      heart_rate: toFormValue(record.heart_rate),
      blood_pressure_systolic: toFormValue(record.blood_pressure_systolic),
      blood_pressure_diastolic: toFormValue(record.blood_pressure_diastolic),
      weekly_activity_minutes: toFormValue(record.weekly_activity_minutes),
      activity_level: toFormValue(record.activity_level),
      visibility_scope: record.visibility_scope || 'private',
      hydration_liters: toFormValue(record.hydration_liters),
      pulse_oximetry: toFormValue(record.pulse_oximetry),
      respiratory_rate: toFormValue(record.respiratory_rate),
      body_weight: displayWeight,
      body_mass_index: calculatedBMI !== null ? calculatedBMI.toFixed(1) : toFormValue(record.body_mass_index),
      blood_glucose: toFormValue(record.blood_glucose) || toFormValue(record.fasting_glucose),
      body_temperature: record.body_temperature !== null && record.body_temperature !== undefined 
        ? record.body_temperature.toString() 
        : '',
      sleep_duration: toFormValue(record.sleep_duration),
      sleep_quality: record.sleep_quality !== null && record.sleep_quality !== undefined && record.sleep_quality !== ''
        ? record.sleep_quality.toString() 
        : '',
      waist_circumference: displayWaist,
      hrv: toFormValue(hrvValue),
      mood: record.mood !== null && record.mood !== undefined && record.mood !== ''
        ? record.mood.toString() 
        : '',
      stress_level: record.stress_level !== null && record.stress_level !== undefined && record.stress_level !== ''
        ? record.stress_level.toString() 
        : '',
      daily_step_count: toFormValue(record.daily_step_count)
    });
    // Set units from record (or defaults)
    setTemperatureUnit(record.body_temperature_unit || 'F');
    setHealthDataWeightUnit(recordWeightUnit);
    setWaistUnit(recordWaistUnit);
    // Handle glucose_type: API may return blood_glucose_unit instead of glucose_type
    setGlucoseType(record.blood_glucose_unit || record.glucose_type || 'fasting');
    setIsHealthDataModalOpen(true);
  };

  // Update health data record
  const handleUpdateHealthData = async () => {
    if (!editingRecord) return;

    try {
      setSaving(true);
      
      // Validate data before sending (use original healthData values, not converted)
      const validateHealthData = () => {
        const errors = [];
        
        if (healthData.heart_rate && (parseInt(healthData.heart_rate) < 30 || parseInt(healthData.heart_rate) > 200)) {
          errors.push('Heart rate should be between 30-200 bpm');
        }
        if (healthData.blood_pressure_systolic && (parseInt(healthData.blood_pressure_systolic) < 70 || parseInt(healthData.blood_pressure_systolic) > 250)) {
          errors.push('Systolic blood pressure should be between 70-250 mmHg');
        }
        if (healthData.blood_pressure_diastolic && (parseInt(healthData.blood_pressure_diastolic) < 40 || parseInt(healthData.blood_pressure_diastolic) > 150)) {
          errors.push('Diastolic blood pressure should be between 40-150 mmHg');
        }
        if (healthData.pulse_oximetry && (parseInt(healthData.pulse_oximetry) < 70 || parseInt(healthData.pulse_oximetry) > 100)) {
          errors.push('Pulse oximetry should be between 70-100%');
        }
        if (healthData.respiratory_rate && (parseInt(healthData.respiratory_rate) < 8 || parseInt(healthData.respiratory_rate) > 40)) {
          errors.push('Respiratory rate should be between 8-40 breaths/min');
        }
        if (healthData.body_mass_index && (parseFloat(healthData.body_mass_index) < 10 || parseFloat(healthData.body_mass_index) > 60)) {
          errors.push('BMI should be between 10-60');
        }
        if (healthData.blood_glucose && (parseFloat(healthData.blood_glucose) < 50 || parseFloat(healthData.blood_glucose) > 500)) {
          errors.push('Blood glucose should be between 50-500 mg/dL');
        }
        // Validate temperature based on current unit (before conversion)
        if (healthData.body_temperature && healthData.body_temperature.trim() !== '') {
          const tempValue = parseFloat(healthData.body_temperature);
          if (!isNaN(tempValue)) {
            const tempC = temperatureUnit === 'F' 
              ? fahrenheitToCelsius(tempValue)
              : tempValue;
            if (tempC < 30 || tempC > 45) {
              errors.push(`Body temperature should be between ${temperatureUnit === 'F' ? '86-113°F' : '30-45°C'}`);
            }
          }
        }
        if (healthData.activity_level && (parseInt(healthData.activity_level) < 1 || parseInt(healthData.activity_level) > 5)) {
          errors.push('Activity level should be between 1-5');
        }
        if (healthData.body_weight && healthData.body_weight.trim() !== '') {
          const weightValue = parseFloat(healthData.body_weight);
          if (!isNaN(weightValue)) {
            const weightKg = healthDataWeightUnit === 'lb' 
              ? lbToKg(weightValue)
              : weightValue;
            if (weightKg < 20 || weightKg > 300) {
              errors.push('Body weight should be between 20-300 kg (44-660 lb)');
            }
          }
        }
        if (healthData.sleep_duration && (parseFloat(healthData.sleep_duration) < 0 || parseFloat(healthData.sleep_duration) > 24)) {
          errors.push('Sleep duration should be between 0-24 hours');
        }
        if (healthData.waist_circumference && healthData.waist_circumference.trim() !== '') {
          const waistValue = parseFloat(healthData.waist_circumference);
          if (!isNaN(waistValue)) {
            const waistCm = waistUnit === 'in' 
              ? inToCm(waistValue)
              : waistValue;
            if (waistCm < 40 || waistCm > 200) {
              errors.push('Waist circumference should be between 40-200 cm (15.7-78.7 in)');
            }
          }
        }
        if (healthData.hrv && (parseFloat(healthData.hrv) < 0 || parseFloat(healthData.hrv) > 200)) {
          errors.push('HRV should be between 0-200 ms');
        }
        if (healthData.mood && (parseInt(healthData.mood) < 1 || parseInt(healthData.mood) > 5)) {
          errors.push('Mood should be between 1-5');
        }
        if (healthData.stress_level && (parseInt(healthData.stress_level) < 1 || parseInt(healthData.stress_level) > 5)) {
          errors.push('Stress level should be between 1-5');
        }
        if (healthData.sleep_quality && (parseInt(healthData.sleep_quality) < 1 || parseInt(healthData.sleep_quality) > 5)) {
          errors.push('Sleep quality should be between 1-5');
        }
        if (healthData.daily_step_count && (parseInt(healthData.daily_step_count) < 0 || parseInt(healthData.daily_step_count) > 100000)) {
          errors.push('Daily step count should be between 0-100000');
        }
        
        return errors;
      };
      
      // Validate data (before conversion)
      const validationErrors = validateHealthData();
      if (validationErrors.length > 0) {
        showError(`Please check your data: ${validationErrors.join(', ')}`);
        setSaving(false);
        return;
      }
      
      // Prepare data for API
      // API expects date format (YYYY-MM-DD), so extract date part from datetime
      const dateForApi = healthData.date 
        ? (healthData.date.includes('T') ? healthData.date.split('T')[0] : healthData.date)
        : null;
      
      // Extract time from datetime (format: HH:MM)
      const timeForApi = healthData.date && healthData.date.includes('T')
        ? healthData.date.split('T')[1]?.substring(0, 5) || null // Extract HH:MM part
        : null;
      
      // Only include fields with non-empty values
      const healthDataPayload = {
        user_id: user.id,
        ...(dateForApi && { date: dateForApi }),
        ...(timeForApi && { time: timeForApi }),
        ...(healthData.heart_rate && healthData.heart_rate.trim() !== '' && { heart_rate: parseInt(healthData.heart_rate) }),
        ...(healthData.blood_pressure_systolic && healthData.blood_pressure_systolic.trim() !== '' && { blood_pressure_systolic: parseInt(healthData.blood_pressure_systolic) }),
        ...(healthData.blood_pressure_diastolic && healthData.blood_pressure_diastolic.trim() !== '' && { blood_pressure_diastolic: parseInt(healthData.blood_pressure_diastolic) }),
        ...(healthData.weekly_activity_minutes && healthData.weekly_activity_minutes.trim() !== '' && { weekly_activity_minutes: parseFloat(healthData.weekly_activity_minutes) }),
        ...(healthData.activity_level && healthData.activity_level.trim() !== '' && { activity_level: parseInt(healthData.activity_level) }),
        ...(healthData.hydration_liters && healthData.hydration_liters.trim() !== '' && { 
          // hydration_liters is stored in liters, convert to selected unit for API
          hydration_liters: waterUnit === 'oz' 
            ? litersToOz(parseFloat(healthData.hydration_liters))
            : parseFloat(healthData.hydration_liters),
          hydration_liter_unit: waterUnit === 'oz' ? 'ounces' : 'liter'
        }),
        ...(healthData.pulse_oximetry && healthData.pulse_oximetry.trim() !== '' && { pulse_oximetry: parseInt(healthData.pulse_oximetry) }),
        ...(healthData.respiratory_rate && healthData.respiratory_rate.trim() !== '' && { respiratory_rate: parseInt(healthData.respiratory_rate) }),
        ...(healthData.body_mass_index && healthData.body_mass_index.trim() !== '' && { body_mass_index: parseFloat(healthData.body_mass_index) }),
        ...(healthData.blood_glucose && healthData.blood_glucose.trim() !== '' && { 
          blood_glucose: parseFloat(healthData.blood_glucose),
          blood_glucose_unit: glucoseType || 'fasting'
        }),
        ...(healthData.body_temperature && healthData.body_temperature.trim() !== '' && {
          body_temperature: parseFloat(healthData.body_temperature),
          body_temperature_unit: temperatureUnit || 'F'
        }),
        ...(healthData.body_weight && healthData.body_weight.trim() !== '' && {
          body_weight: healthDataWeightUnit === 'lb' ? lbToKg(parseFloat(healthData.body_weight)) : parseFloat(healthData.body_weight),
          body_weight_unit: healthDataWeightUnit || 'lb'
        }),
        ...(healthData.sleep_duration && healthData.sleep_duration.trim() !== '' && { sleep_duration: parseFloat(healthData.sleep_duration) }),
        ...(healthData.sleep_quality && healthData.sleep_quality.toString().trim() !== '' && { sleep_quality: healthData.sleep_quality.toString() }),
        ...(healthData.waist_circumference && healthData.waist_circumference.trim() !== '' && {
          waist_circumference: waistUnit === 'in' ? inToCm(parseFloat(healthData.waist_circumference)) : parseFloat(healthData.waist_circumference),
          waist_circumference_unit: waistUnit || 'in'
        }),
        ...(healthData.hrv && healthData.hrv.trim() !== '' && { HRV: parseFloat(healthData.hrv) }),
        ...(healthData.mood && healthData.mood.toString().trim() !== '' && { mood: healthData.mood.toString() }),
        ...(healthData.stress_level && healthData.stress_level.toString().trim() !== '' && { stress_level: healthData.stress_level.toString() }),
        ...(healthData.daily_step_count && healthData.daily_step_count.trim() !== '' && { daily_step_count: parseInt(healthData.daily_step_count) }),
        ...(healthData.visibility_scope && { visibility_scope: healthData.visibility_scope }),
      };

      console.log('Update Health Data - Request payload:', healthDataPayload);

      await HealthApi.updateRecord(user.id, editingRecord.id, healthDataPayload);
      showSuccess('Health data updated successfully!');
      setIsHealthDataModalOpen(false);
      setEditingRecord(null);
      // Reset form
      const resetNow = new Date();
      const resetYear = resetNow.getFullYear();
      const resetMonth = String(resetNow.getMonth() + 1).padStart(2, '0');
      const resetDay = String(resetNow.getDate()).padStart(2, '0');
      const resetHours = String(resetNow.getHours()).padStart(2, '0');
      const resetMinutes = String(resetNow.getMinutes()).padStart(2, '0');
      setHealthData({
        date: `${resetYear}-${resetMonth}-${resetDay}T${resetHours}:${resetMinutes}`,
        heart_rate: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        weekly_activity_minutes: '',
        activity_level: '',
        visibility_scope: 'private',
        hydration_liters: '',
        pulse_oximetry: '',
        respiratory_rate: '',
        body_weight: '',
        body_mass_index: '',
        blood_glucose: '',
        body_temperature: '',
        sleep_duration: '',
        sleep_quality: '',
        waist_circumference: '',
        hrv: '',
        mood: '',
        stress_level: '',
        daily_step_count: ''
      });
      // Reset units to defaults
      setTemperatureUnit('F');
      setHealthDataWeightUnit('lb');
      setWaistUnit('in');
      setWaterUnit('oz');
      setGlucoseType('fasting');
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
      
      // Map sort column names to API format
      const sortColumnMap = {
        'date': 'date',
        'heart_rate': 'heart_rate',
        'blood_pressure': 'bp_systolic', // API might sort by systolic for blood pressure
        'activity': 'activity_minutes',
        'bmi': 'bmi',
        'temperature': 'temperature',
        'glucose': 'glucose'
      };
      
      // Prepare filter parameters for API
      const parseNumber = (value) => {
        if (value === undefined || value === null) return undefined;
        const trimmed = value.toString().trim();
        if (trimmed === '') return undefined;
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? undefined : parsed;
      };

      const filterParams = {
        start_date: filters.dateFrom || undefined,
        end_date: filters.dateTo || undefined,
        heart_rate_min: parseNumber(filters.heartRateMin),
        heart_rate_max: parseNumber(filters.heartRateMax),
        bp_systolic_min: parseNumber(filters.bloodPressureSystolicMin),
        bp_systolic_max: parseNumber(filters.bloodPressureSystolicMax),
        bp_diastolic_min: parseNumber(filters.bloodPressureDiastolicMin),
        bp_diastolic_max: parseNumber(filters.bloodPressureDiastolicMax),
        activity_minutes_min: parseNumber(filters.activityMin),
        activity_minutes_max: parseNumber(filters.activityMax),
        activity_level_min: undefined, // Activity level filters not in UI yet
        activity_level_max: undefined,
        bmi_min: parseNumber(filters.bmiMin),
        bmi_max: parseNumber(filters.bmiMax),
        temperature_min: parseNumber(filters.temperatureMin),
        temperature_max: parseNumber(filters.temperatureMax),
        glucose_min: parseNumber(filters.glucoseMin),
        glucose_max: parseNumber(filters.glucoseMax),
        // Don't send sort_by and sort_order, only use specific sort_* parameters
        sort_date: sortColumn === 'date' ? sortDirection : undefined,
        sort_heart_rate: sortColumn === 'heart_rate' ? sortDirection : undefined,
        sort_blood_pressure: sortColumn === 'blood_pressure' ? sortDirection : undefined,
        sort_activity: sortColumn === 'activity' ? sortDirection : undefined,
        sort_bmi: sortColumn === 'bmi' ? sortDirection : undefined,
        sort_temperature: sortColumn === 'temperature' ? sortDirection : undefined,
        sort_glucose: sortColumn === 'glucose' ? sortDirection : undefined,
      };

      // Remove undefined keys
      Object.keys(filterParams).forEach(key => filterParams[key] === undefined && delete filterParams[key]);
      
      console.log('Filter parameters:', filterParams);
      
      // First, let's test if the API is working with a known endpoint
      try {
        console.log('Testing API with users endpoint...');
        const testResponse = await authRequest(ENDPOINTS.users.getAll);
        console.log('Users API test successful:', testResponse);
      } catch (testError) {
        console.error('Users API test failed:', testError);
      }
      
      // Try to get health data by user ID first with filter parameters
      let response;
      try {
        response = await HealthApi.getByUserId(user.id, filterParams);
        console.log('📥 Health data API response (filtered):', response);
      } catch (userError) {
        console.log('getByUserId failed, trying getAll...', userError);
        response = await HealthApi.getAll();
        console.log('📥 Health data API response (fallback getAll):', response);
      }
      
      // Handle API response format: { result: [...] } or { health_data: [...] } or direct array
      let healthDataArray = null;
      if (response?.result && Array.isArray(response.result)) {
        healthDataArray = response.result;
      } else if (response?.health_data && Array.isArray(response.health_data)) {
        healthDataArray = response.health_data;
      } else if (Array.isArray(response)) {
        healthDataArray = response;
      } else {
        console.warn('Unexpected health data response format:', response);
      }
      
      if (healthDataArray && Array.isArray(healthDataArray)) {
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

        const recordsToDisplay = filteredRecords.length > 0 ? filteredRecords : healthDataArray;
        setHealthDataRecords(recordsToDisplay);
        console.log('Health data loaded successfully:', recordsToDisplay.length, 'records (filtered:', filteredRecords.length, 'raw total:', healthDataArray.length, ')');
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
        let altHealthDataArray = null;
        if (altResponse?.result && Array.isArray(altResponse.result)) {
          altHealthDataArray = altResponse.result;
        } else if (altResponse?.health_data && Array.isArray(altResponse.health_data)) {
          altHealthDataArray = altResponse.health_data;
        } else if (Array.isArray(altResponse)) {
          altHealthDataArray = altResponse;
        }
        if (altHealthDataArray && Array.isArray(altHealthDataArray)) {
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

          setHealthDataRecords(filteredAltRecords.length > 0 ? filteredAltRecords : altHealthDataArray);
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

  // Handle sorting for health data records
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Records are already filtered and sorted by API, just return them as-is
  const getFilteredAndSortedRecords = () => {
    // API handles all filtering and sorting, so we just return the records
    return healthDataRecords;
  };

  const healthOptions = {
    medical_conditions: [
      "Anxiety", "Arthritis", "Asthma", "Autoimmune Diseases", "COPD",
      "Cardiovascular Disease", "Depression", "Diabetes Type 1", "Diabetes Type 2", "Epilepsy",
      "High Cholesterol", "Hypertension", "Migraine", "Thyroid Disorders"
    ],
    medications: [
      "Albuterol", "Amlodipine", "Aspirin", "Atorvastatin", "Furosemide",
      "Ibuprofen", "Levothyroxine", "Lisinopril", "Losartan", "Metformin",
      "Metoprolol", "Omeprazole", "Sertraline", "Simvastatin", "Warfarin"
    ],
    allergies: [
      "Contrast dye", "Dust mites", "Eggs", "Insect stings", "Latex",
      "Milk", "Mold", "Peanuts", "Penicillin", "Pet dander",
      "Pollen", "Shellfish", "Soy", "Sulfa drugs", "Tree nuts", "Wheat"
    ],
    surgical_history: [
      "Appendectomy", "C-section", "Cataract surgery", "Cholecystectomy", "Gallbladder removal",
      "Heart surgery", "Hernia repair", "Hip replacement", "Hysterectomy", "Knee surgery",
      "Prostate surgery", "Shoulder surgery", "Spine surgery", "Tonsillectomy"
    ],
    vaccinations: [
      "COVID-19", "Diphtheria", "Hepatitis A", "Hepatitis B", "HPV",
      "Influenza (Flu)", "Meningococcal", "MMR", "Pertussis", "Pneumococcal",
      "Polio", "Shingles", "Tdap", "Tetanus", "Varicella"
    ],
    sensitivities: [
      "Artificial sweeteners", "Chemicals", "Cleaning products", "Dyes", "Food additives",
      "Formaldehyde", "Fragrances", "Latex", "MSG", "Nickel",
      "Pesticides", "Preservatives", "Smoke", "Sulfites"
    ],
    family_history: [
      "Alzheimer's", "Autoimmune diseases", "Blood disorders", "Cancer", "Diabetes",
      "Genetic conditions", "Heart disease", "High blood pressure", "Kidney disease", "Liver disease",
      "Mental health disorders", "Obesity", "Stroke", "Substance abuse"
    ],
  };


const extractHealthItemName = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return (
    item.condition_name ||
    item.name ||
    item.allergy_name ||
    item.procedure_name ||
    item.vaccine_name ||
    item.sensitivity_name ||
    item.family_member ||
    (item.last_dental_exam_date || item.last_dental_exam ? `Dental History - ${item.last_dental_exam_date || item.last_dental_exam}` : 'Dental History') ||
    ''
  );
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
        
        // Try to get unit types from profile data first
        let apiHeightType = dataToUse?.height_type 
          ? dataToUse.height_type.toString().toLowerCase().trim() 
          : null;
        let apiWeightType = dataToUse?.weight_type 
          ? dataToUse.weight_type.toString().toLowerCase().trim() 
          : null;
        
        // If units not found in profile, try to get from onboarding data
        if ((!apiHeightType || !apiWeightType) && user?.id) {
          // First check if onboarding data is already in user context
          let personalData = user?.save_onboarding?.steps?.personal?.data;
          
          // If not in context, try to load from onboarding API
          if (!personalData) {
            try {
              console.log('📊 Units not found in profile, checking onboarding API...');
              const onboardingProgress = await OnboardingApi.getProgress(user.id);
              personalData = onboardingProgress?.save_onboarding?.steps?.personal?.data;
            } catch (onboardingError) {
              console.warn('⚠️ Failed to load units from onboarding API:', onboardingError.message);
            }
          } else {
            console.log('📊 Using onboarding data from user context');
          }
          
          if (personalData) {
            if (!apiHeightType && personalData.height_type) {
              apiHeightType = personalData.height_type.toString().toLowerCase().trim();
              console.log('📏 Height unit from onboarding data:', apiHeightType);
            }
            if (!apiWeightType && personalData.weight_type) {
              apiWeightType = personalData.weight_type.toString().toLowerCase().trim();
              console.log('⚖️ Weight unit from onboarding data:', apiWeightType);
            }
          }
        }
        
        // Set defaults if still not found
        apiHeightType = apiHeightType || 'in';
        apiWeightType = apiWeightType || 'lb';
        
        // Set unit types in UI first (before conversion)
        const validHeightUnit = (apiHeightType === 'in' || apiHeightType === 'cm') ? apiHeightType : 'in';
        const validWeightUnit = (apiWeightType === 'lb' || apiWeightType === 'kg') ? apiWeightType : 'lb';
        
        setHeightUnit(validHeightUnit);
        setWeightUnit(validWeightUnit);
        
        console.log('📏 Height unit from API:', apiHeightType, '→ using:', validHeightUnit);
        console.log('⚖️ Weight unit from API:', apiWeightType, '→ using:', validWeightUnit);
        
        // Get stored values
        // NOTE: height_cm and weight_kg are just field names - the actual unit is determined by height_type/weight_type
        // If height_type is "in", then height_cm contains inches (not cm)
        // If weight_type is "lb", then weight_kg contains pounds (not kg)
        let heightStored = (dataToUse?.height_cm ?? "") === 0 ? "" : (dataToUse?.height_cm ?? "");
        let weightStored = (dataToUse?.weight_kg ?? "") === 0 ? "" : (dataToUse?.weight_kg ?? "");
        
        // Values are already in the correct units as specified by height_type/weight_type
        // No conversion needed - just use the values as-is
        let heightForDisplay = heightStored;
        let weightForDisplay = weightStored;
        
        console.log(`📏 Height: ${heightStored} (unit: ${validHeightUnit})`);
        console.log(`⚖️ Weight: ${weightStored} (unit: ${validWeightUnit})`);
        
        // Get waist and hip circumference units from API
        let apiWaistUnit = dataToUse?.waist_circumference_unit 
          ? dataToUse.waist_circumference_unit.toString().toLowerCase().trim() 
          : 'in';
        let apiHipUnit = dataToUse?.hip_circumference_unit 
          ? dataToUse.hip_circumference_unit.toString().toLowerCase().trim() 
          : 'in';
        
        const validWaistUnit = (apiWaistUnit === 'in' || apiWaistUnit === 'cm') ? apiWaistUnit : 'in';
        const validHipUnit = (apiHipUnit === 'in' || apiHipUnit === 'cm') ? apiHipUnit : 'in';
        
        setPersonalWaistUnit(validWaistUnit);
        setHipUnit(validHipUnit);
        
        // Get waist and hip values (stored in cm in API, convert back if needed)
        let waistStored = (dataToUse?.waist_circumference ?? "") === 0 ? "" : (dataToUse?.waist_circumference ?? "");
        let hipStored = (dataToUse?.hip_circumference ?? "") === 0 ? "" : (dataToUse?.hip_circumference ?? "");
        
        // Convert from cm to display unit if needed
        let waistForDisplay = waistStored;
        let hipForDisplay = hipStored;
        
        if (waistStored && validWaistUnit === 'in') {
          waistForDisplay = cmToIn(parseFloat(waistStored));
        }
        if (hipStored && validHipUnit === 'in') {
          hipForDisplay = cmToIn(parseFloat(hipStored));
        }
        
        const formData = {
          first_name: dataToUse?.first_name || dataToUse?.firstName || "",
          last_name: dataToUse?.last_name || dataToUse?.lastName || "",
          phone_number: dataToUse?.phone_number || dataToUse?.phone || "",
          dob: dataToUse?.dob || dataToUse?.date_of_birth || "",
          gender: dataToUse?.gender || "",
          sex_of_birth: dataToUse?.sex_of_birth || "",
          height_cm: heightForDisplay === "" ? "" : heightForDisplay.toString(),
          weight_kg: weightForDisplay === "" ? "" : weightForDisplay.toString(),
          zip_code: dataToUse?.zip_code ?? "",
          user_id: dataToUse?.user_id || user?.id || "",
          body_fat_percentage: dataToUse?.body_fat_percentage ?? "",
          body_fat_method: dataToUse?.body_fat_method || "",
          waist_circumference: waistForDisplay === "" ? "" : waistForDisplay.toString(),
          hip_circumference: hipForDisplay === "" ? "" : hipForDisplay.toString(),
        };
        
        console.log('📊 Form data to set:', formData);
        console.log('📊 Conversion details:', {
          heightStored,
          heightForDisplay,
          heightUnit: validHeightUnit,
          weightStored,
          weightForDisplay,
          weightUnit: validWeightUnit
        });
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
        
        // Get unit types from fallback data
        let fallbackHeightType = profileData?.height_type 
          ? profileData.height_type.toString().toLowerCase().trim() 
          : null;
        let fallbackWeightType = profileData?.weight_type 
          ? profileData.weight_type.toString().toLowerCase().trim() 
          : null;
        
        // If units not found, try to get from onboarding data
        if ((!fallbackHeightType || !fallbackWeightType) && user?.id) {
          // First check if onboarding data is already in user context
          let personalData = user?.save_onboarding?.steps?.personal?.data;
          
          // If not in context, try to load from onboarding API
          if (!personalData) {
            try {
              console.log('📊 Units not found in fallback, checking onboarding API...');
              const onboardingProgress = await OnboardingApi.getProgress(user.id);
              personalData = onboardingProgress?.save_onboarding?.steps?.personal?.data;
            } catch (onboardingError) {
              console.warn('⚠️ Failed to load units from onboarding API in fallback:', onboardingError.message);
            }
          }
          
          if (personalData) {
            if (!fallbackHeightType && personalData.height_type) {
              fallbackHeightType = personalData.height_type.toString().toLowerCase().trim();
            }
            if (!fallbackWeightType && personalData.weight_type) {
              fallbackWeightType = personalData.weight_type.toString().toLowerCase().trim();
            }
          }
        }
        
        // Set defaults if still not found
        fallbackHeightType = fallbackHeightType || 'in';
        fallbackWeightType = fallbackWeightType || 'lb';
        
        const fallbackHeightUnit = (fallbackHeightType === 'in' || fallbackHeightType === 'cm') ? fallbackHeightType : 'in';
        const fallbackWeightUnit = (fallbackWeightType === 'lb' || fallbackWeightType === 'kg') ? fallbackWeightType : 'lb';
        
        setHeightUnit(fallbackHeightUnit);
        setWeightUnit(fallbackWeightUnit);
        
        // Get stored values
        // NOTE: height_cm and weight_kg are just field names - the actual unit is determined by height_type/weight_type
        let fallbackHeight = (profileData?.height_cm ?? "") === 0 ? "" : (profileData?.height_cm ?? "");
        let fallbackWeight = (profileData?.weight_kg ?? "") === 0 ? "" : (profileData?.weight_kg ?? "");
        
        // Values are already in the correct units as specified by height_type/weight_type
        // No conversion needed - just use the values as-is
        console.log(`📏 Fallback Height: ${fallbackHeight} (unit: ${fallbackHeightUnit})`);
        console.log(`⚖️ Fallback Weight: ${fallbackWeight} (unit: ${fallbackWeightUnit})`);
        
        // Get waist and hip circumference units from fallback data
        let fallbackWaistUnit = profileData?.waist_circumference_unit 
          ? profileData.waist_circumference_unit.toString().toLowerCase().trim() 
          : 'in';
        let fallbackHipUnit = profileData?.hip_circumference_unit 
          ? profileData.hip_circumference_unit.toString().toLowerCase().trim() 
          : 'in';
        
        const fallbackValidWaistUnit = (fallbackWaistUnit === 'in' || fallbackWaistUnit === 'cm') ? fallbackWaistUnit : 'in';
        const fallbackValidHipUnit = (fallbackHipUnit === 'in' || fallbackHipUnit === 'cm') ? fallbackHipUnit : 'in';
        
        setPersonalWaistUnit(fallbackValidWaistUnit);
        setHipUnit(fallbackValidHipUnit);
        
        // Get waist and hip values (stored in cm in API, convert back if needed)
        let fallbackWaist = (profileData?.waist_circumference ?? "") === 0 ? "" : (profileData?.waist_circumference ?? "");
        let fallbackHip = (profileData?.hip_circumference ?? "") === 0 ? "" : (profileData?.hip_circumference ?? "");
        
        // Convert from cm to display unit if needed
        if (fallbackWaist && fallbackValidWaistUnit === 'in') {
          fallbackWaist = cmToIn(parseFloat(fallbackWaist));
        }
        if (fallbackHip && fallbackValidHipUnit === 'in') {
          fallbackHip = cmToIn(parseFloat(fallbackHip));
        }
        
        setFormValues({
          first_name: profileData?.first_name || profileData?.firstName || "",
          last_name: profileData?.last_name || profileData?.lastName || "",
          phone_number: profileData?.phone_number || profileData?.phone || "",
          dob: profileData?.dob || profileData?.date_of_birth || "",
          gender: profileData?.gender || "",
          sex_of_birth: profileData?.sex_of_birth || "",
          height_cm: fallbackHeight === "" ? "" : fallbackHeight.toString(),
          weight_kg: fallbackWeight === "" ? "" : fallbackWeight.toString(),
          zip_code: profileData?.zip_code ?? "",
          user_id: profileData?.user_id || user?.id || "",
          body_fat_percentage: profileData?.body_fat_percentage ?? "",
          body_fat_method: profileData?.body_fat_method || "",
          waist_circumference: fallbackWaist === "" ? "" : fallbackWaist.toString(),
          hip_circumference: fallbackHip === "" ? "" : fallbackHip.toString(),
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
      loadDentalHistory();
    }
  }, [activeTab, user?.id]);

  // Reload health data when filters or sorting change (with debounce to avoid too many requests)
  useEffect(() => {
    if (activeTab === 'health_data' && user?.id) {
      const timeoutId = setTimeout(() => {
        loadHealthData();
      }, 500); // Debounce 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters, sortColumn, sortDirection]);

  // Helper: load dental history from API
  const loadDentalHistory = async () => {
    if (!user?.id) return;
    try {
      // Try with user_id query param first, fallback to base endpoint
      let response;
      try {
        response = await authRequest(`${ENDPOINTS.dentalHistory.getAll}?user_id=${user.id}`);
      } catch (e) {
        // If query param fails, try without it (API may filter by auth token)
        response = await authRequest(ENDPOINTS.dentalHistory.getAll);
      }
      const dentalData = response?.result || response || [];
      const dentalArray = Array.isArray(dentalData) ? dentalData : [];
      setDentalHistory(dentalArray);
      setLastUpdated(prev => ({ ...prev, dental_history: new Date().toISOString() }));
    } catch (e) {
      console.warn('Failed to load dental history:', e?.message);
      setDentalHistory([]);
    }
  };

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
          
          const res = await UploadFileApi.uploadAvatar(pendingPhotoFile, user.id);
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

      // Do NOT convert values - send them as-is in the units specified by height_type/weight_type
      // If height_type is "in", then height_cm contains inches (not cm)
      // If weight_type is "lb", then weight_kg contains pounds (not kg)
      const heightToSave = formValues.height_cm === "" ? 0 : Number(formValues.height_cm);
      const weightToSave = formValues.weight_kg === "" ? 0 : Number(formValues.weight_kg);
      
      // Convert waist and hip circumference to cm for API (similar to height/weight pattern)
      // Store the unit type so we can convert back when loading
      let waistToSave = formValues.waist_circumference === "" ? 0 : Number(formValues.waist_circumference);
      if (waistToSave > 0 && personalWaistUnit === 'in') {
        waistToSave = inToCm(waistToSave);
      }
      
      let hipToSave = formValues.hip_circumference === "" ? 0 : Number(formValues.hip_circumference);
      if (hipToSave > 0 && hipUnit === 'in') {
        hipToSave = inToCm(hipToSave);
      }
      
      // Prepare profile data payload (excluding photo - photo is handled separately)
      const basePayload = {
        first_name: formValues.first_name?.trim(),
        last_name: formValues.last_name?.trim(),
        phone_number: formValues.phone_number?.trim(),
        dob: formValues.dob || null,
        gender: formValues.gender || "",
        sex_of_birth: formValues.sex_of_birth || "",
        height_cm: heightToSave,
        height_type: heightUnit || "",
        weight_kg: weightToSave,
        weight_type: weightUnit || "",
        zip_code: formValues.zip_code?.trim() || "",
        body_fat_percentage: formValues.body_fat_percentage === "" ? null : Number(formValues.body_fat_percentage),
        body_fat_method: formValues.body_fat_method || "",
        waist_circumference: waistToSave === 0 ? null : waistToSave,
        waist_circumference_unit: personalWaistUnit || "",
        hip_circumference: hipToSave === 0 ? null : hipToSave,
        hip_circumference_unit: hipUnit || "",
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

      // Update global auth user so sidebar reflects latest data immediately
      try {
        setUser(prev => ({
          ...prev,
          first_name: updated?.first_name ?? basePayload.first_name ?? prev?.first_name,
          last_name: updated?.last_name ?? basePayload.last_name ?? prev?.last_name,
          phone_number: updated?.phone_number ?? basePayload.phone_number ?? prev?.phone_number,
          // Try to set an avatar-like field that UserSummary can use directly
          avatar: updated?.avatar || updated?.avatar_url || updated?.photo_url || (typeof updated?.profile_photo === 'string' ? updated?.profile_photo : (updated?.profile_photo?.url || updated?.profile_photo?.path)) || prev?.avatar,
          profile_photo: updated?.profile_photo ?? prev?.profile_photo,
        }));
      } catch {}
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
      <style>{`
        .profile-tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .profile-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .profile-tabs-wrapper {
          display: flex;
          gap: 8px;
          min-width: max-content;
          flex: 1;
        }
        .profile-tab-button {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .profile-tabs-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .profile-tabs-container {
            gap: 6px;
          }
          .profile-tab-button {
            padding: 6px 12px !important;
            font-size: 13px !important;
            height: 36px !important;
          }
          .profile-tabs-actions {
            margin-left: 8px;
          }
          .profile-tabs-actions .btn {
            padding: 6px 12px !important;
            font-size: 12px !important;
            height: 36px !important;
            white-space: nowrap;
          }
        }
        @media (max-width: 480px) {
          .profile-tab-button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .profile-tabs-actions .btn {
            padding: 6px 10px !important;
            font-size: 11px !important;
          }
        }
        
        /* Profile card responsive styles */
        @media (max-width: 768px) {
          .dashboard-profile .card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          .dashboard-profile .card > div:first-child {
           
          }
          .dashboard-profile .card .form {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 10px !important;
          }
          .dashboard-profile .card .form .form-field {
            width: 100% !important;
            flex: 1 1 auto !important;
          }
          .dashboard-profile .card > div[style*="flex:1"],
          .dashboard-profile .card > div[style*="flex: 1"] {
            flex: none !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .dashboard-profile .card {
            padding: 10px !important;
            gap: 10px !important;
          }
        
        }
        
        /* Health History and Health Data card styles */
        .health-history-container,
        .health-data-container {
          max-width: 920px;
          width: 100%;
        }
        .health-data-container {
          max-width: 1200px;
        }
        .health-history-card,
        .health-data-card {
          padding: 0;
        }
        .health-card-header {
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        .health-card-content {
          padding: 16px;
        }
        .health-data-management-card {
          margin-bottom: 24px;
        }
        .health-data-management-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        /* Health History and Health Data card responsive styles */
        @media (max-width: 768px) {
          .health-history-container,
          .health-data-container {
            max-width: 100% !important;
            width: 100% !important;
          }
          .health-history-card,
          .health-data-card {
            border-radius: 8px !important;
          }
          .health-card-header,
          .health-card-content {
            padding: 10px !important;
          }
          .health-card-header h2 {
            font-size: 18px !important;
          }
          .health-card-header p {
            font-size: 13px !important;
          }
          .health-data-management-card {
            margin-bottom: 16px !important;
            padding: 10px !important;
          }
          .health-data-management-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .health-data-management-card button.btn {
            width: 100% !important;
          }
          .health-data-management-card h3 {
            font-size: 15px !important;
          }
          .health-data-management-card p {
            font-size: 13px !important;
          }
          .health-section-title {
            font-size: 15px !important;
          }
          .health-section-description {
            font-size: 12px !important;
          }
          .health-item-text {
            font-size: 13px !important;
          }
          .health-item-date {
            font-size: 11px !important;
          }
          .health-section-button {
            padding: 12px !important;
          }
          .health-section-content {
            padding: 12px 0 !important;
            margin-left: 12px !important;
          }
          .health-item-card {
            padding: 10px 12px !important;
          }
          .health-history-card > div[style*="padding:16"] {
            padding: 10px !important;
          }
          .add-history-modal-header {
            padding: 12px 16px !important;
          }
          .add-history-modal-body {
            padding: 16px !important;
          }
          .add-history-modal-overlay {
            padding: 10px !important;
          }
        }
        @media (max-width: 480px) {
          .health-card-header,
          .health-card-content {
            padding: 8px !important;
          }
          .health-history-card > div[style*="padding:16"] {
            padding: 8px !important;
          }
          .add-history-modal-header {
            padding: 10px 12px !important;
          }
          .add-history-modal-body {
            padding: 12px !important;
          }
          .add-history-modal-overlay {
            padding: 5px !important;
          }
          .health-data-management-card {
            padding: 8px !important;
            margin-bottom: 12px !important;
          }
          .health-history-card h2,
          .health-data-card h2 {
            font-size: 16px !important;
          }
          .health-card-header p {
            font-size: 12px !important;
          }
          .health-history-card h3,
          .health-data-card h3,
          .health-data-management-card h3 {
            font-size: 14px !important;
          }
          .health-data-management-card p {
            font-size: 12px !important;
          }
          .health-section-title {
            font-size: 14px !important;
          }
          .health-section-description {
            font-size: 11px !important;
          }
          .health-item-text {
            font-size: 12px !important;
          }
          .health-item-date {
            font-size: 10px !important;
          }
          .health-section-button {
            padding: 10px !important;
          }
          .health-section-content {
            padding: 10px 0 !important;
            margin-left: 8px !important;
          }
          .health-item-card {
            padding: 8px 10px !important;
          }
        }
      `}</style>
      <div className="profile-tabs-container">
        <div className="profile-tabs-wrapper">
          <button 
            onClick={() => changeTab('personal')} 
            className={`btn ${activeTab === 'personal' ? 'primary' : 'outline'} profile-tab-button`}
            style={{ width:'auto', padding:'8px 16px', height:38 }}
          >
            Personal Info
          </button>
          <button 
            onClick={() => changeTab('health_history')} 
            className={`btn ${activeTab === 'health_history' ? 'primary' : 'outline'} profile-tab-button`}
            style={{ width:'auto', padding:'8px 16px', height:38 }}
          >
            Health History
          </button>
          <button 
            onClick={() => changeTab('health_data')} 
            className={`btn ${activeTab === 'health_data' ? 'primary' : 'outline'} profile-tab-button`}
            style={{ width:'auto', padding:'8px 16px', height:38 }}
          >
            Health Data
          </button>
        </div>
        <div className="profile-tabs-actions">
          <button className="btn outline" style={{ width:'auto', padding:'8px 16px', height:38 }} onClick={() => navigate('/onboarding?force=true')}>Go to Onboarding</button>
        </div>
      </div>

      {activeTab === 'personal' && (
      <>
      <div className="card" style={{ display: "flex", gap: 16, marginBottom: 24,  alignItems:'flex-start', maxWidth: 900}}>
        <div 
          style={{ width: 120, height: 120, backgroundColor: isLight ? "rgba(241, 243, 245, 0.8)" : "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border:'1px solid var(--border)', overflow:'hidden', cursor:'pointer', position:'relative' }}
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
            <div style={{ position:'absolute', inset:0, background: isLight ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.45)', color: isLight ? 'var(--text)' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>Uploading…</div>
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
                  <input name="phone_number" value={formValues.phone_number} onChange={handleChange} placeholder="+1 555-555-1234" />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Date of birth</span>
                  <div style={{ position: 'relative' }}>
                    <DatePicker value={formValues.dob || ""} onChange={(val)=>handleChange({ target: { name: 'dob', value: val }})} />
                    {formValues.dob && calculateAgeFromDOB(formValues.dob) !== null && (
                      <span style={{ 
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9em',
                        fontWeight: 'normal',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}>
                        {calculateAgeFromDOB(formValues.dob)} years old
                      </span>
                    )}
                  </div>
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Sex</span>
                  <select name="sex_of_birth" value={formValues.sex_of_birth || ""} onChange={handleChange}>
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>ZIP Code</span>
                  <input name="zip_code" value={formValues.zip_code} onChange={handleChange} placeholder="e.g. 94105" />
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6  }}>
                  <span>Height</span>
                  <div style={{ display:'flex', gap:8, alignItems: 'center' }}>
                    <input type="number" inputMode="numeric" name="height_cm" value={formValues.height_cm} onChange={handleChange} placeholder={heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 69'} style={{ flex: 1 }} />
                    <div style={{ 
                      display: 'flex', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newUnit = 'cm';
                          const h = parseFloat(formValues.height_cm);
                          if (!isNaN(h) && h > 0) {
                            let newValue = h;
                            if (heightUnit === 'in' && newUnit === 'cm') {
                              newValue = parseFloat((h * 2.54).toFixed(1));
                            }
                            setFormValues(prev => ({ ...prev, height_cm: newValue.toString() }));
                          }
                          setHeightUnit(newUnit);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          backgroundColor: heightUnit === 'cm' ? 'var(--primary)' : 'transparent',
                          color: heightUnit === 'cm' ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          borderRight: '1px solid var(--border)',
                          minWidth: '44px',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (heightUnit !== 'cm') {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (heightUnit !== 'cm') {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newUnit = 'in';
                      const h = parseFloat(formValues.height_cm);
                      if (!isNaN(h) && h > 0) {
                        let newValue = h;
                        if (heightUnit === 'cm' && newUnit === 'in') {
                          newValue = parseFloat((h / 2.54).toFixed(1));
                        }
                        setFormValues(prev => ({ ...prev, height_cm: newValue.toString() }));
                      }
                      setHeightUnit(newUnit);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          backgroundColor: heightUnit === 'in' ? 'var(--primary)' : 'transparent',
                          color: heightUnit === 'in' ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          minWidth: '44px',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (heightUnit !== 'in') {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (heightUnit !== 'in') {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        in
                      </button>
                    </div>
                  </div>
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Weight</span>
                  <div style={{ display:'flex', gap:8, alignItems: 'center' }}>
                    <input type="number" inputMode="numeric" name="weight_kg" value={formValues.weight_kg} onChange={handleChange} placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'} style={{ flex: 1 }} />
                    <div style={{ 
                      display: 'flex', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newUnit = 'kg';
                          const w = parseFloat(formValues.weight_kg);
                          if (!isNaN(w) && w > 0) {
                            let newValue = w;
                            if (weightUnit === 'lb' && newUnit === 'kg') {
                              newValue = parseFloat((w / 2.20462).toFixed(1));
                            }
                            setFormValues(prev => ({ ...prev, weight_kg: newValue.toString() }));
                          }
                          setWeightUnit(newUnit);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          backgroundColor: weightUnit === 'kg' ? 'var(--primary)' : 'transparent',
                          color: weightUnit === 'kg' ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          borderRight: '1px solid var(--border)',
                          minWidth: '44px',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (weightUnit !== 'kg') {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (weightUnit !== 'kg') {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        kg
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newUnit = 'lb';
                      const w = parseFloat(formValues.weight_kg);
                      if (!isNaN(w) && w > 0) {
                        let newValue = w;
                        if (weightUnit === 'kg' && newUnit === 'lb') {
                          newValue = parseFloat((w * 2.20462).toFixed(1));
                        }
                        setFormValues(prev => ({ ...prev, weight_kg: newValue.toString() }));
                      }
                      setWeightUnit(newUnit);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          backgroundColor: weightUnit === 'lb' ? 'var(--primary)' : 'transparent',
                          color: weightUnit === 'lb' ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          minWidth: '44px',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          if (weightUnit !== 'lb') {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (weightUnit !== 'lb') {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        lb
                      </button>
                    </div>
                  </div>
                </label>
                <label className="form-field" style={{ display: "flex", flexDirection: "column" , gap:6 }}>
                  <span>Body Mass Index (BMI)</span>
                  {(() => {
                    const h = parseFloat(formValues.height_cm);
                    const w = parseFloat(formValues.weight_kg);
                    if (isNaN(h) || isNaN(w) || h <=0 || w <=0) {
                      return (
                        <div style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                          —
                        </div>
                      );
                    }
                    
                    // Convert height to meters based on current unit
                    let heightMeters;
                    if (heightUnit === 'cm') {
                      heightMeters = h / 100; // cm to meters
                    } else {
                      // inches to meters: inches * 0.0254
                      heightMeters = h * 0.0254;
                    }
                    
                    // Convert weight to kg based on current unit
                    let weightKg;
                    if (weightUnit === 'kg') {
                      weightKg = w;
                    } else {
                      // lb to kg: pounds * 0.453592
                      weightKg = w * 0.453592;
                    }
                    
                    // Calculate BMI: weight (kg) / height (m)^2
                    const bmi = weightKg / (heightMeters * heightMeters);
                    const bmiValue = parseFloat(bmi.toFixed(1));
                    
                    // BMI categories (as per image)
                    const getBMICategory = (bmi) => {
                      if (bmi < 18.5) return { label: 'Weight Deficit', color: '#3b82f6', range: [16, 18.5] };
                      if (bmi < 24) return { label: 'Norm', color: '#22c55e', range: [18.5, 24] };
                      if (bmi < 30) return { label: 'Weight Over', color: '#84cc16', range: [24, 30] };
                      if (bmi < 35) return { label: 'Obesity First Degree', color: '#fb923c', range: [30, 35] };
                      if (bmi < 40) return { label: 'Obesity Second Degree', color: '#f97316', range: [35, 40] };
                      return { label: 'Obesity Third Degree', color: '#dc2626', range: [40, 50] };
                    };
                    
                    const category = getBMICategory(bmiValue);
                    const minBMI = 16;
                    const maxBMI = 45;
                    const bmiPosition = ((bmiValue - minBMI) / (maxBMI - minBMI)) * 100;
                    const clampedPosition = Math.max(0, Math.min(100, bmiPosition));
                    
                    const categories = [
                      { label: 'WEIGHT DEFICIT', range: '16-18.5', color: '#3b82f6', start: 0, end: 8.62 },
                      { label: 'NORM', range: '18.5-24', color: '#22c55e', start: 8.62, end: 27.59 },
                      { label: 'WEIGHT OVER', range: '24-30', color: '#84cc16', start: 27.59, end: 48.28 },
                      { label: 'OBESITY FIRST DEGREE', range: '30-35', color: '#fb923c', start: 48.28, end: 65.52 },
                      { label: 'OBESITY SECOND DEGREE', range: '35-40', color: '#f97316', start: 65.52, end: 82.76 },
                      { label: 'OBESITY THIRD DEGREE', range: '≥40', color: '#dc2626', start: 82.76, end: 100 }
                    ];
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* BMI Scale */}
                        <div style={{ position: 'relative', marginTop: 8 }}>
                          <div style={{ 
                            height: 16, 
                            background: 'linear-gradient(to right, #3b82f6 0%, #3b82f6 8.62%, #22c55e 8.62%, #22c55e 27.59%, #84cc16 27.59%, #84cc16 48.28%, #fb923c 48.28%, #fb923c 65.52%, #f97316 65.52%, #f97316 82.76%, #dc2626 82.76%, #dc2626 100%)',
                            borderRadius: 16,
                            border: '1px solid var(--border)',
                            position: 'relative',
                            overflow: 'visible'
                          }}>
                            {/* Interactive segments */}
                            {categories.map((cat, idx) => (
                              <div
                                key={idx}
                                style={{
                                  position: 'absolute',
                                  left: `${cat.start}%`,
                                  width: `${cat.end - cat.start}%`,
                                  height: '100%',
                                  cursor: 'pointer',
                                  zIndex: 5,
                                  opacity: bmiHoveredCategory === idx ? 0.8 : 1,
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setBmiHoveredCategory(idx);
                                  setBmiTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.bottom + 10
                                  });
                                }}
                                onMouseLeave={() => setBmiHoveredCategory(null)}
                              />
                            ))}
                            
                            {/* Vertical line indicator on the scale */}
                            {bmiValue && (
                              <div style={{
                                position: 'absolute',
                                left: `${clampedPosition}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '2px',
                                height: '20px',
                                background: '#ffffff',
                                border: '1px solid #1e3a8a',
                                borderRadius: '1px',
                                zIndex: 15,
                                boxShadow: '0 0 4px rgba(30, 58, 138, 0.5)'
                              }} />
                            )}
                            {/* Current BMI indicator - rectangle with number */}
                            {bmiValue && (
                              <div 
                                style={{
                                  position: 'absolute',
                                  left: `${clampedPosition}%`,
                                  bottom: '100%',
                                  transform: 'translateX(-50%)',
                                  marginBottom: 4,
                                  padding: '4px 8px',
                                  background: '#1e3a8a',
                                  color: '#ffffff',
                                  borderRadius: 6,
                                  fontSize: 8,
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  zIndex: 10,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setBmiHoveredCategory('current');
                                  setBmiTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.bottom + 15
                                  });
                                }}
                                onMouseLeave={() => setBmiHoveredCategory(null)}
                              >
                                {bmiValue.toFixed(1)}
                              </div>
                            )}
                          </div>
                          
                          {/* Tooltip */}
                          {bmiHoveredCategory !== null && (
                            <div style={{
                              position: 'fixed',
                              left: `${bmiTooltipPosition.x}px`,
                              top: `${bmiTooltipPosition.y}px`,
                              transform: 'translate(-50%, 0)',
                              padding: '10px 14px',
                              background: isLight ? 'rgba(249, 250, 251, 0.98)' : 'rgba(17, 17, 17, 0.98)',
                              color: 'var(--text)',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 500,
                              minWidth: '140px',
                              zIndex: 1000,
                              boxShadow: isLight ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.4)',
                              border: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
                              pointerEvents: 'none',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)'
                            }}>
                              {bmiHoveredCategory === 'current' ? (
                                <>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    marginBottom: 6 
                                  }}>
                                    <div style={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      background: category.color,
                                      border: '2px solid rgba(255, 255, 255, 0.3)',
                                      boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)'
                                    }} />
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                      {category.label}
                                    </div>
                                  </div>
                                  <div style={{ 
                                    fontSize: 11, 
                                    color: 'var(--muted)',
                                    paddingLeft: 20,
                                    lineHeight: 1.4
                                  }}>
                                    BMI Range: <strong style={{ color: 'var(--text)' }}>{category.range[0]}-{category.range[1]}</strong>
                                  </div>
                                  <div style={{ 
                                    fontSize: 11, 
                                    color: 'var(--muted)',
                                    paddingLeft: 20,
                                    marginTop: 4,
                                    lineHeight: 1.4
                                  }}>
                                    Your BMI: <strong style={{ color: category.color }}>{bmiValue.toFixed(1)}</strong>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    marginBottom: 6 
                                  }}>
                                    <div style={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      background: categories[bmiHoveredCategory].color,
                                      border: '2px solid rgba(255, 255, 255, 0.3)',
                                      boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)'
                                    }} />
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                      {categories[bmiHoveredCategory].label}
                                    </div>
                                  </div>
                                  <div style={{ 
                                    fontSize: 11, 
                                    color: 'var(--muted)',
                                    paddingLeft: 20,
                                    lineHeight: 1.4
                                  }}>
                                    BMI Range: <strong style={{ color: 'var(--text)' }}>{categories[bmiHoveredCategory].range}</strong>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Core Body Metrics - Separate Card */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 900, width: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ 
            margin: 0, 
            marginBottom: 8, 
            fontSize: '18px', 
            fontWeight: 600, 
            color: 'var(--text)'
          }}>
            Core Body Metrics
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: 'var(--muted)',
            lineHeight: 1.5
          }}>
            Track your body composition measurements to monitor your health and fitness progress over time.
          </p>
        </div>
        <style>{`
          .core-body-metrics-form {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            width: 100%;
          }
          .core-body-metrics-input-row {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            flex-wrap: wrap;
          }
          .core-body-metrics-circumference-row {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .core-body-metrics-input-row input {
            flex: 1 1 220px;
            min-width: 0;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            height: 38px;
            box-sizing: border-box;
            background: var(--background);
          }
          .core-body-metrics-input-row select {
            flex: 1 1 180px;
            min-width: 140px;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            height: 38px;
            background: var(--background);
            appearance: none;
            -webkit-appearance: none;
          }
          .core-body-metrics-measure-group {
            display: flex;
            align-items: stretch;
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            background: var(--background);
          }
          .core-body-metrics-measure-group input {
            flex: 1 1 auto;
            border: none;
            padding: 10px 14px;
            font-size: 14px;
            background: transparent;
          }
          .core-body-metrics-unit-toggle {
            display: flex;
          }
          .core-body-metrics-unit-toggle button {
            padding: 10px 16px;
            border: none;
            font-size: 14px;
            font-weight: 600;
            min-width: 56px;
            background: transparent;
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .core-body-metrics-unit-toggle button.active {
            background: var(--primary);
            color: #fff;
          }
        `}</style>
        <form onSubmit={handleSave} className="form core-body-metrics-form">
          {/* Body Fat % */}
          <label className="form-field core-body-metrics-field" style={{ display: "flex", flexDirection: "column", gap: 8, width: '100%' }}>
            <div>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Body Fat Percentage</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Enter your body fat percentage (0-100%)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div className="core-body-metrics-input-row">
                <input 
                  type="number" 
                  inputMode="numeric"
                  name="body_fat_percentage" 
                  value={formValues.body_fat_percentage} 
                  onChange={handleChange} 
                  placeholder={formValues.body_fat_percentage ? "" : "e.g. 15.5"}
                  step="0.1"
                  min="0"
                  max="100"
                />
                <select 
                  name="body_fat_method" 
                  value={formValues.body_fat_method || ""} 
                  onChange={handleChange}
                  title="Select the method used to measure body fat"
                  style={{ height: '38px', padding: '0 12px' }}
                >
                  <option value="">Select method</option>
                  <option value="Smart Scale">Smart Scale</option>
                  <option value="DXA">DXA</option>
                  <option value="Calipers">Calipers</option>
                  <option value="Estimate">Estimate</option>
                </select>
              </div>
              {formValues.body_fat_method && (
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✓</span>
                  <span>Method: {formValues.body_fat_method}</span>
                </span>
              )}
            </div>
          </label>

          {/* Waist Circumference */}
          <label className="form-field core-body-metrics-field" style={{ display: "flex", flexDirection: "column", gap: 8, width: '100%' }}>
            <div>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Waist Circumference</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Measure around your waist at the narrowest point
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="number" 
                  inputMode="numeric"
                  name="waist_circumference" 
                  value={formValues.waist_circumference} 
                  onChange={handleChange} 
                  placeholder={formValues.waist_circumference ? "" : (personalWaistUnit === 'cm' ? "e.g. 80" : "e.g. 31.5")}
                  step="0.1"
                  min={personalWaistUnit === 'cm' ? "40" : "15.7"}
                  max={personalWaistUnit === 'cm' ? "200" : "78.7"}
                  style={{ flex: 1 }}
                />
                <div style={{ 
                  display: 'flex', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                }}>
                  <button
                    type="button"
                    onClick={() => handlePersonalWaistUnitChange('cm')}
                    title="Centimeters"
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: personalWaistUnit === 'cm' ? 'var(--primary)' : 'transparent',
                      color: personalWaistUnit === 'cm' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      borderRight: '1px solid var(--border)',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (personalWaistUnit !== 'cm') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (personalWaistUnit !== 'cm') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePersonalWaistUnitChange('in')}
                    title="Inches"
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: personalWaistUnit === 'in' ? 'var(--primary)' : 'transparent',
                      color: personalWaistUnit === 'in' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (personalWaistUnit !== 'in') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (personalWaistUnit !== 'in') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    in
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Range: {personalWaistUnit === 'cm' ? '40-200 cm' : '15.7-78.7 in'}
              </span>
            </div>
          </label>

          {/* Hip Circumference */}
          <label className="form-field core-body-metrics-field" style={{ display: "flex", flexDirection: "column", gap: 8, width: '100%', gridColumn: "1 / -1" }}>
            <div>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Hip Circumference</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Measure around your hips at the widest point
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="number" 
                  inputMode="numeric"
                  name="hip_circumference" 
                  value={formValues.hip_circumference} 
                  onChange={handleChange} 
                  placeholder={formValues.hip_circumference ? "" : (hipUnit === 'cm' ? "e.g. 95" : "e.g. 37.4")}
                  step="0.1"
                  min={hipUnit === 'cm' ? "40" : "15.7"}
                  max={hipUnit === 'cm' ? "200" : "78.7"}
                  style={{ flex: 1 }}
                />
                <div style={{ 
                  display: 'flex', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                }}>
                  <button
                    type="button"
                    onClick={() => handleHipUnitChange('cm')}
                    title="Centimeters"
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: hipUnit === 'cm' ? 'var(--primary)' : 'transparent',
                      color: hipUnit === 'cm' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      borderRight: '1px solid var(--border)',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (hipUnit !== 'cm') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hipUnit !== 'cm') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHipUnitChange('in')}
                    title="Inches"
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: hipUnit === 'in' ? 'var(--primary)' : 'transparent',
                      color: hipUnit === 'in' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (hipUnit !== 'in') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hipUnit !== 'in') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    in
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Range: {hipUnit === 'cm' ? '40-200 cm' : '15.7-78.7 in'}
              </span>
            </div>
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="submit" className="btn primary full" disabled={saving} style={{ minHeight: '44px' }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      </>
      )}

      {activeTab === 'health_history' && (
        <div className="health-history-container">
          <div className="card health-history-card">
            <div className="health-card-header">
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
                    setShowModalAutocomplete(false);
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
                    setShowModalAutocomplete(false);
                    setIsAddHistoryModalOpen(true);
                  }}
                  saving={savingHistory[key]}
                />
              ))}
              
              {/* Dental History Section */}
              <HealthSection
                key="dental_history"
                title="Dental History"
                description="Track your dental health history and current concerns"
                options={[]}
                values={dentalHistory}
                lastUpdated={lastUpdated.dental_history}
                onToggle={(item) => {
                  const itemId = typeof item === 'object' ? (item.id || item.dental_history_id) : item;
                  setDentalHistory(prev => prev.filter(i => {
                    const currId = typeof i === 'object' ? (i.id || i.dental_history_id) : i;
                    return currId !== itemId;
                  }));
                }}
                sectionKey="dental_history"
                onEdit={(item) => {
                  setEditingHistoryItem(item);
                  setEditingHistorySectionKey('dental_history');
                  setAddHistorySectionKey('dental_history');
                  // Map API fields to form fields
                  const base = {
                    user_id: user?.id,
                    last_dental_exam: item?.last_dental_exam_date || '',
                    gum_disease: item?.has_gum_disease ?? null,
                    frequent_cavities: item?.has_frequent_cavities ?? null,
                    major_dental_work: item?.major_dental_work_notes || '',
                    tmj_issues: item?.has_tmj_issues ?? null,
                    current_concerns: item?.current_dental_concerns || '',
                  };
                  setAddHistoryForm(base);
                  setShowModalAutocomplete(false);
                  setIsAddHistoryModalOpen(true);
                }}
                onDelete={(item) => {
                  setItemToDelete(item);
                  setSectionKeyToDelete('dental_history');
                  setIsDeleteHistoryModalOpen(true);
                }}
                onSave={async () => {
                  // Dental history is saved through the modal, not through bulk save
                  // This function is kept for consistency but does nothing
                  showSuccess('Dental History is saved automatically when you add or edit records.');
                }}
                onAddNew={() => {
                  setAddHistorySectionKey('dental_history');
                  const initial = {
                    user_id: user?.id,
                    last_dental_exam: '',
                    gum_disease: null,
                    frequent_cavities: null,
                    major_dental_work: '',
                    tmj_issues: null,
                    current_concerns: '',
                  };
                  setAddHistoryForm(initial);
                  setShowModalAutocomplete(false);
                  setIsAddHistoryModalOpen(true);
                }}
                saving={savingHistory.dental_history}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Health History Modal */}
      {isAddHistoryModalOpen && (
        <div 
          className="add-history-modal-overlay"
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
          onClick={(e) => { 
            if (e.target === e.currentTarget) {
              setIsAddHistoryModalOpen(false);
              setShowModalAutocomplete(false);
            }
          }}
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
            <div className="add-history-modal-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {editingHistoryItem ? (
                  addHistorySectionKey === 'medical_conditions' ? 'Edit Medical Condition' : `Edit ${addHistorySectionKey?.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}`
                ) : (
                  addHistorySectionKey === 'medical_conditions' ? 'Add New Medical Conditions' : `Add New ${addHistorySectionKey?.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}`
                )}
              </h3>
              <button className="btn outline" onClick={() => {
                setIsAddHistoryModalOpen(false);
                setShowModalAutocomplete(false);
              }} style={{ padding: '6px 10px', fontSize: '16px' }}>✕</button>
            </div>
            <div className="add-history-modal-body" style={{ padding: 20, overflowY: 'auto' }}>
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
                          vaccine_name: payload.vaccine_name || '',
                          vaccination_date: payload.vaccination_date || null,
                          lot_number: payload.lot_number || '',
                          administrator: payload.administrator || '',
                          next_due_date: payload.next_due_date || null,
                          notes: payload.notes || '',
                          last_updated: Date.now(),
                        };
                        response = await HealthHistoryApi.updateVaccination(numericId, updatePayload);
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
                    } else if (addHistorySectionKey === 'dental_history') {
                      // Map form fields to API structure
                      const apiPayload = {
                        last_dental_exam_date: payload.last_dental_exam || null,
                        has_gum_disease: payload.gum_disease ?? false,
                        has_frequent_cavities: payload.frequent_cavities ?? false,
                        major_dental_work_notes: payload.major_dental_work || '',
                        has_tmj_issues: payload.tmj_issues ?? false,
                        current_dental_concerns: payload.current_concerns || '',
                        user_id: user?.id,
                      };
                      
                      let response;
                      try {
                        if (editingHistoryItem && (editingHistoryItem.dental_history_id || editingHistoryItem.id)) {
                          // Update existing record
                          const dentalHistoryId = editingHistoryItem.dental_history_id || editingHistoryItem.id;
                          response = await authRequest(ENDPOINTS.dentalHistory.update(dentalHistoryId), {
                            method: 'PATCH',
                            body: apiPayload, // authRequest will stringify automatically
                          });
                        } else {
                          // Create new record
                          response = await authRequest(ENDPOINTS.dentalHistory.create, {
                            method: 'POST',
                            body: apiPayload, // authRequest will stringify automatically
                          });
                        }
                        // Ensure newItem is set even if response is empty
                        newItem = response?.result || response || { ...apiPayload, dental_history_id: response?.dental_history_id || editingHistoryItem?.dental_history_id || editingHistoryItem?.id };
                        // Reload dental history from API
                        try {
                          await loadDentalHistory();
                        } catch (loadError) {
                          console.warn('Failed to reload dental history after save:', loadError);
                          // Don't throw - save was successful, just reload failed
                        }
                      } catch (dentalError) {
                        console.error('Error saving dental history:', dentalError);
                        throw dentalError; // Re-throw to be caught by outer catch
                      }
                    }
                    if (newItem) {
                      if (addHistorySectionKey !== 'dental_history') {
                        await loadHealthHistorySummary();
                      }
                    }
                    setLastUpdated(prev => ({ ...prev, [addHistorySectionKey]: new Date().toISOString() }));
                    showSuccess('Saved successfully');
                    setIsAddHistoryModalOpen(false);
                    setShowModalAutocomplete(false);
                    setEditingHistoryItem(null);
                    setEditingHistorySectionKey(null);
                    setAddHistoryForm({});
                  } catch (err) {
                    console.error('Error in form submission:', err);
                    showError(err?.message || 'Failed to save');
                    // Don't close modal on error, let user fix and retry
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
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6, width: '100%', position: 'relative' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Condition name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.condition_name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, condition_name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type a condition"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.medical_conditions
                            .filter(option => 
                              !addHistoryForm.condition_name || option.toLowerCase().includes(addHistoryForm.condition_name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, condition_name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
                    </label>

                    {/* Diagnosis date with Today checkbox */}
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Diagnosis date</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <DatePicker
                          value={addHistoryForm.diagnosis_date || ''}
                          onChange={(val)=>{
                            setAddHistoryForm(v=>({...v, diagnosis_date: val, useToday: false}));
                          }}
                          style={{ flex: 1 }}
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
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', width: '100%', position: 'relative' }}>
                      <span>Name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type a medication"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.medications
                            .filter(option => 
                              !addHistoryForm.name || option.toLowerCase().includes(addHistoryForm.name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
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
                      <DatePicker 
                        value={addHistoryForm.start_date || ''} 
                        onChange={(val)=>{
                          setAddHistoryForm(v=>{
                            const updated = {...v, start_date: val};
                            // If end_date exists and is before new start_date, clear it
                            if (updated.end_date && val && updated.end_date < val) {
                              updated.end_date = null;
                            }
                            return updated;
                          });
                        }}
                        maxDate={addHistoryForm.end_date || undefined}
                      />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>End date</span>
                      <DatePicker 
                        value={addHistoryForm.end_date || ''} 
                        onChange={(val)=>{
                          setAddHistoryForm(v=>({...v, end_date: val || null}));
                        }}
                        minDate={addHistoryForm.start_date || undefined}
                      />
                    </label>
                    <label className="form-field" style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column' }}>
                      <span>Notes</span>
                      <input value={addHistoryForm.notes || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, notes: e.target.value}))} />
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'allergies' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', width: '100%', position: 'relative' }}>
                      <span>Allergy name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.allergy_name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, allergy_name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type an allergy"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.allergies
                            .filter(option => 
                              !addHistoryForm.allergy_name || option.toLowerCase().includes(addHistoryForm.allergy_name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, allergy_name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
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
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', width: '100%', position: 'relative' }}>
                      <span>Procedure name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.procedure_name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, procedure_name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type a procedure"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.surgical_history
                            .filter(option => 
                              !addHistoryForm.procedure_name || option.toLowerCase().includes(addHistoryForm.procedure_name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, procedure_name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Surgery date</span>
                      <DatePicker value={addHistoryForm.surgery_date || ''} onChange={(val)=>setAddHistoryForm(v=>({...v, surgery_date: val}))} />
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
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', width: '100%', position: 'relative' }}>
                      <span>Vaccine name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.vaccine_name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, vaccine_name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type a vaccine"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.vaccinations
                            .filter(option => 
                              !addHistoryForm.vaccine_name || option.toLowerCase().includes(addHistoryForm.vaccine_name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, vaccine_name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Vaccination date</span>
                      <DatePicker value={addHistoryForm.vaccination_date || ''} onChange={(val)=>setAddHistoryForm(v=>({...v, vaccination_date: val}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Lot number</span>
                      <input value={addHistoryForm.lot_number || ''} onChange={(e)=>setAddHistoryForm(v=>({...v, lot_number: e.target.value}))} />
                    </label>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column' }}>
                      <span>Next due date</span>
                      <DatePicker value={addHistoryForm.next_due_date || ''} onChange={(val)=>setAddHistoryForm(v=>({...v, next_due_date: val}))} />
                    </label>
                  </>
                )}

                {addHistorySectionKey === 'sensitivities' && (
                  <>
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', width: '100%', position: 'relative' }}>
                      <span>Sensitivity name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.sensitivity_name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, sensitivity_name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type a sensitivity"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.sensitivities
                            .filter(option => 
                              !addHistoryForm.sensitivity_name || option.toLowerCase().includes(addHistoryForm.sensitivity_name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, sensitivity_name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
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
                    <label className="form-field" style={{ display:'flex', flexDirection:'column', width: '100%', position: 'relative' }}>
                      <span>Condition name</span>
                      <input 
                        ref={modalNameInputRef}
                        type="text"
                        value={addHistoryForm.condition_name || ''} 
                        onChange={(e) => {
                          setAddHistoryForm(v => ({ ...v, condition_name: e.target.value }));
                          setShowModalAutocomplete(true);
                        }}
                        onFocus={() => setShowModalAutocomplete(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            setShowModalAutocomplete(false);
                          }, 200);
                        }}
                        placeholder="Select or type a condition"
                        required 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                          backgroundSize: '16px',
                          paddingRight: '32px'
                        }}
                      />
                      {showModalAutocomplete && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginTop: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {healthOptions.family_history
                            .filter(option => 
                              !addHistoryForm.condition_name || option.toLowerCase().includes(addHistoryForm.condition_name.toLowerCase())
                            )
                            .map(option => (
                              <div
                                key={option}
                                onClick={() => {
                                  setAddHistoryForm(v => ({ ...v, condition_name: option }));
                                  setShowModalAutocomplete(false);
                                  modalNameInputRef.current?.blur();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--background-secondary, rgba(0, 0, 0, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {option}
                              </div>
                            ))}
                        </div>
                      )}
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

                {addHistorySectionKey === 'dental_history' && (
                  <>
                    {/* Last dental exam */}
                    <label className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Last dental exam</span>
                      <DatePicker
                        value={addHistoryForm.last_dental_exam || ''}
                        onChange={(val) => setAddHistoryForm(v => ({ ...v, last_dental_exam: val }))}
                        maxDate={new Date().toISOString().split('T')[0]}
                      />
                    </label>

                    {/* History of gum disease */}
                    <label className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>History of gum disease / periodontal disease</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="gum_disease"
                            checked={addHistoryForm.gum_disease === true}
                            onChange={() => setAddHistoryForm(v => ({ ...v, gum_disease: true }))}
                          />
                          <span>Yes</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="gum_disease"
                            checked={addHistoryForm.gum_disease === false}
                            onChange={() => setAddHistoryForm(v => ({ ...v, gum_disease: false }))}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </label>

                    {/* Frequent cavities */}
                    <label className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Frequent cavities</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="frequent_cavities"
                            checked={addHistoryForm.frequent_cavities === true}
                            onChange={() => setAddHistoryForm(v => ({ ...v, frequent_cavities: true }))}
                          />
                          <span>Yes</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="frequent_cavities"
                            checked={addHistoryForm.frequent_cavities === false}
                            onChange={() => setAddHistoryForm(v => ({ ...v, frequent_cavities: false }))}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </label>

                    {/* Major dental work / missing teeth */}
                    <label className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Major dental work / missing teeth</span>
                      <textarea
                        value={addHistoryForm.major_dental_work || ''}
                        onChange={(e) => setAddHistoryForm(v => ({ ...v, major_dental_work: e.target.value }))}
                        placeholder="Describe any major dental work or missing teeth (optional)"
                        rows={3}
                        style={{ padding: '10px 12px', fontSize: '14px', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </label>

                    {/* TMJ / jaw issues */}
                    <label className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>TMJ / jaw issues or night guard use</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="tmj_issues"
                            checked={addHistoryForm.tmj_issues === true}
                            onChange={() => setAddHistoryForm(v => ({ ...v, tmj_issues: true }))}
                          />
                          <span>Yes</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="tmj_issues"
                            checked={addHistoryForm.tmj_issues === false}
                            onChange={() => setAddHistoryForm(v => ({ ...v, tmj_issues: false }))}
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </label>

                    {/* Current dental concerns */}
                    <label className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Current dental concerns</span>
                      <textarea
                        value={addHistoryForm.current_concerns || ''}
                        onChange={(e) => setAddHistoryForm(v => ({ ...v, current_concerns: e.target.value }))}
                        placeholder="Describe any current dental concerns"
                        rows={4}
                        style={{ padding: '10px 12px', fontSize: '14px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    </label>
                  </>
                )}

                <div style={{ gridColumn:'1 / -1', display:'flex', gap:8, justifyContent:'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn outline" onClick={() => {
                    setIsAddHistoryModalOpen(false);
                    setShowModalAutocomplete(false);
                  }}>Cancel</button>
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
          ? `Are you sure you want to delete "${itemToDelete.condition_name || itemToDelete.name || itemToDelete.allergy_name || itemToDelete.procedure_name || itemToDelete.vaccine_name || itemToDelete.sensitivity_name || ((itemToDelete.last_dental_exam_date || itemToDelete.last_dental_exam) ? `Dental History - ${itemToDelete.last_dental_exam_date || itemToDelete.last_dental_exam}` : 'this record')}"? This action cannot be undone.`
          : "Are you sure you want to delete this record? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingHistory}
      />

      {activeTab === 'health_data' && (
        <div className="health-data-container">
          <div className="card health-data-card">
            <div className="health-card-header">
              <h2 style={{ margin: 0 }}>Health Data</h2>
              <p style={{ color:'var(--muted)', margin: '8px 0 0 0', fontSize: '14px' }}>
                Track your health metrics, vitals, and wellness data over time.
              </p>
            </div>
            <div className="health-card-content">
              {/* Add New Health Data Button */}
              <div className="card health-data-management-card">
                <div className="health-data-management-header">
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Health Data Management</h3>
                  <button 
                    className="btn primary" 
                    onClick={() => {
                      // Reset form to current datetime when opening for new record
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      setHealthData(prev => ({
                        ...prev,
                        date: `${year}-${month}-${day}T${hours}:${minutes}`
                      }));
                      setEditingRecord(null);
                      setIsHealthDataModalOpen(true);
                    }}
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
                <>
                  <style>{`
                    /* Unit toggle styles for Health Data Modal */
                    .core-body-metrics-unit-toggle {
                      display: flex;
                      border: 1px solid var(--border);
                      border-radius: 12px;
                      overflow: hidden;
                      background: var(--background);
                    }
                    .core-body-metrics-unit-toggle button {
                      padding: 10px 16px;
                      border: none;
                      font-size: 14px;
                      font-weight: 600;
                      min-width: 56px;
                      background: transparent;
                      color: var(--text);
                      cursor: pointer;
                      transition: all 0.2s ease;
                    }
                    .core-body-metrics-unit-toggle button.active {
                      background: var(--primary);
                      color: #fff;
                    }
                    /* Mobile responsive styles for Health Data Modal */
                    @media (max-width: 768px) {
                      .health-data-form-grid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                      }
                      .health-data-modal-content {
                        max-width: 100% !important;
                        margin: 10px !important;
                        max-height: 95vh !important;
                      }
                      .health-data-modal-header {
                        padding: 12px !important;
                      }
                      .health-data-modal-body {
                        padding: 12px !important;
                      }
                    }
                    @media (max-width: 480px) {
                      .health-data-form-grid {
                        gap: 10px !important;
                      }
                      .health-data-modal-content {
                        margin: 5px !important;
                        border-radius: 8px !important;
                      }
                      .health-data-modal-header {
                        padding: 10px !important;
                      }
                      .health-data-modal-body {
                        padding: 10px !important;
                      }
                    }
                  `}</style>
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
                      // Reset form to current datetime when closing
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      setHealthData(prev => ({
                        ...prev,
                        date: `${year}-${month}-${day}T${hours}:${minutes}`
                      }));
                    }
                  }}
                >
                  <div className="health-data-modal-content" style={{
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
                    <div className="health-data-modal-header" style={{ 
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
                          // Reset form to current datetime when closing
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const minutes = String(now.getMinutes()).padStart(2, '0');
                          setHealthData(prev => ({
                            ...prev,
                            date: `${year}-${month}-${day}T${hours}:${minutes}`
                          }));
                        }}
                        style={{ padding: '8px 12px' }}
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Scrollable Content */}
                    <div className="health-data-modal-body" style={{ 
                      padding: '24px',
                      overflowY: 'auto',
                      flex: 1
                    }}>
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveHealthData(); }} className="form" style={{ maxWidth: '100%' }}>
  
                        {/* Two Column Layout */}
                        <div className="health-data-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                          
                          {/* Left Column - Grouped by Related Fields */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Date & Time */}
                    <label className="form-field">
                      <span>Date & Time</span>
                      <DateTimePicker 
                        value={healthData.date || ''} 
                        onChange={(val) => handleHealthDataChange('date', val)}
                        maxDate={(() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const minutes = String(now.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })()}
                      />
                    </label>

                    {/* Heart Rate */}
                    <label className="form-field">
                      <span>Heart Rate (bpm)</span>
                      <input 
                        type="number" 
                        value={healthData.heart_rate || ''} 
                        onChange={(e) => handleHealthDataChange('heart_rate', e.target.value)}
                        placeholder="72"
                        min="30" max="200"
                      />
                    </label>

                    {/* Blood Pressure Systolic */}
                    <label className="form-field">
                      <span>Blood Pressure Systolic</span>
                      <input 
                        type="number" 
                        value={healthData.blood_pressure_systolic || ''} 
                        onChange={(e) => handleHealthDataChange('blood_pressure_systolic', e.target.value)}
                        placeholder="120"
                        min="70" max="250"
                      />
                    </label>

                    {/* Blood Pressure Diastolic */}
                    <label className="form-field">
                      <span>Blood Pressure Diastolic</span>
                      <input 
                        type="number" 
                        value={healthData.blood_pressure_diastolic || ''} 
                        onChange={(e) => handleHealthDataChange('blood_pressure_diastolic', e.target.value)}
                        placeholder="80"
                        min="40" max="150"
                      />
                    </label>

  {/* Body Temperature */}
  <label className="form-field">
                      <span>Body Temperature</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          step="0.1"
                          value={healthData.body_temperature || ''} 
                          onChange={(e) => {
                            let value = e.target.value;
                            // Allow only one decimal place
                            if (value.includes('.')) {
                              const parts = value.split('.');
                              if (parts[1] && parts[1].length > 1) {
                                value = parts[0] + '.' + parts[1].substring(0, 1);
                              }
                            }
                            handleHealthDataChange('body_temperature', value);
                          }}
                          placeholder={temperatureUnit === 'C' ? "36.6" : "97.9"}
                          min={temperatureUnit === 'C' ? "30" : "86"}
                          max={temperatureUnit === 'C' ? "45" : "113"}
                          style={{ flex: 1 }}
                        />
                        <div style={{ 
                          display: 'flex', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleTemperatureUnitChange('C')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: temperatureUnit === 'C' ? 'var(--primary)' : 'transparent',
                              color: temperatureUnit === 'C' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              borderRight: '1px solid var(--border)',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (temperatureUnit !== 'C') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (temperatureUnit !== 'C') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            °C
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTemperatureUnitChange('F')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: temperatureUnit === 'F' ? 'var(--primary)' : 'transparent',
                              color: temperatureUnit === 'F' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (temperatureUnit !== 'F') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (temperatureUnit !== 'F') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            °F
                          </button>
                        </div>
                      </div>
                    </label>
                          
                    {/* Respiratory Rate */}
                    <label className="form-field">
                      <span>Respiratory Rate (breaths/min)</span>
                      <input 
                        type="number" 
                        value={healthData.respiratory_rate || ''} 
                        onChange={(e) => handleHealthDataChange('respiratory_rate', e.target.value)}
                        placeholder="16"
                        min="8" max="40"
                      />
                    </label>

                    {/* Pulse Oximetry */}
                    <label className="form-field">
                      <span>Pulse Oximetry (%)</span>
                      <input 
                        type="number" 
                        value={healthData.pulse_oximetry || ''} 
                        onChange={(e) => handleHealthDataChange('pulse_oximetry', e.target.value)}
                        placeholder="98"
                        min="70" max="100"
                      />
                    </label>

                    {/* HRV */}
                    <label className="form-field">
                      <span>HRV (Heart Rate Variability) (ms)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.hrv || ''} 
                        onChange={(e) => handleHealthDataChange('hrv', e.target.value)}
                        placeholder="50"
                        min="0" max="200"
                      />
                    </label>

                    {/* Body Weight */}
                    <label className="form-field">
                      <span>Body Weight</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          step="0.1"
                          value={healthData.body_weight || ''} 
                          onChange={(e) => handleHealthDataChange('body_weight', e.target.value)}
                          placeholder={healthDataWeightUnit === 'kg' ? "70" : "154"}
                          min={healthDataWeightUnit === 'kg' ? "20" : "44"}
                          max={healthDataWeightUnit === 'kg' ? "300" : "660"}
                          style={{ flex: 1 }}
                        />
                        <div style={{ 
                          display: 'flex', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleWeightUnitChange('kg')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: healthDataWeightUnit === 'kg' ? 'var(--primary)' : 'transparent',
                              color: healthDataWeightUnit === 'kg' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              borderRight: '1px solid var(--border)',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (healthDataWeightUnit !== 'kg') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (healthDataWeightUnit !== 'kg') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            kg
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWeightUnitChange('lb')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: healthDataWeightUnit === 'lb' ? 'var(--primary)' : 'transparent',
                              color: healthDataWeightUnit === 'lb' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (healthDataWeightUnit !== 'lb') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (healthDataWeightUnit !== 'lb') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            lb
                          </button>
                        </div>
                      </div>
                    </label>

                    {/* Body Mass Index */}
                    <label className="form-field">
                      <span>Body Mass Index</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.body_mass_index || ''} 
                        onChange={(e) => handleHealthDataChange('body_mass_index', e.target.value)}
                        placeholder={profile && profile.height_cm ? "Auto-calculated" : "22.5"}
                        min="10" max="60"
                        readOnly={profile && profile.height_cm ? true : false}
                        style={profile && profile.height_cm ? { 
                          backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))',
                          cursor: 'not-allowed',
                          opacity: 0.8
                        } : {}}
                        title={profile && profile.height_cm ? "BMI is automatically calculated from your profile height and current weight" : "Enter BMI manually or add height to your profile for auto-calculation"}
                      />
                    </label>

                    {/* Waist Circumference */}
                    <label className="form-field">
                      <span>Waist Circumference</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        step="0.1"
                          value={healthData.waist_circumference || ''} 
                          onChange={(e) => handleHealthDataChange('waist_circumference', e.target.value)}
                          placeholder={waistUnit === 'cm' ? "80" : "31.5"}
                          min={waistUnit === 'cm' ? "40" : "15.7"}
                          max={waistUnit === 'cm' ? "200" : "78.7"}
                          style={{ flex: 1 }}
                        />
                        <div style={{ 
                          display: 'flex', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleWaistUnitChange('cm')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: waistUnit === 'cm' ? 'var(--primary)' : 'transparent',
                              color: waistUnit === 'cm' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              borderRight: '1px solid var(--border)',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (waistUnit !== 'cm') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (waistUnit !== 'cm') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            cm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWaistUnitChange('in')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: waistUnit === 'in' ? 'var(--primary)' : 'transparent',
                              color: waistUnit === 'in' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (waistUnit !== 'in') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (waistUnit !== 'in') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            in
                          </button>
                        </div>
                      </div>
                    </label>
                          </div>
                          
                          {/* Right Column - Grouped by Related Fields */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                

                    {/* Daily Activity */}
                    <label className="form-field">
                      <span>Daily Activity (minutes)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.weekly_activity_minutes || ''} 
                        onChange={(e) => handleHealthDataChange('weekly_activity_minutes', e.target.value)}
                        placeholder="60"
                        min="0" max="10080"
                      />
                    </label>

                    {/* Activity Level */}
                    <label className="form-field">
                      <span>Activity Level (1-5)</span>
                      <select 
                        value={healthData.activity_level || ''} 
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

                    {/* Daily Step Count */}
                    <label className="form-field">
                      <span>Daily Step Count</span>
                      <input 
                        type="number" 
                        value={healthData.daily_step_count || ''} 
                        onChange={(e) => handleHealthDataChange('daily_step_count', e.target.value)}
                        placeholder="10000"
                        min="0" max="100000"
                      />
                    </label>

                    {/* Sleep Duration */}
                    <label className="form-field">
                      <span>Sleep Duration (hours)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={healthData.sleep_duration || ''} 
                        onChange={(e) => handleHealthDataChange('sleep_duration', e.target.value)}
                        placeholder="7.5"
                        min="0" max="24"
                      />
                    </label>

                    {/* Sleep Quality */}
                    <label className="form-field">
                      <span>Sleep Quality (Optional)</span>
                      <select 
                        value={healthData.sleep_quality || ''} 
                        onChange={(e) => handleHealthDataChange('sleep_quality', e.target.value)}
                      >
                        <option value="">Select Quality</option>
                        <option value="1">1 - Very Poor</option>
                        <option value="2">2 - Poor</option>
                        <option value="3">3 - Fair</option>
                        <option value="4">4 - Good</option>
                        <option value="5">5 - Excellent</option>
                      </select>
                    </label>

                    {/* Hydration */}
                    <label className="form-field">
                      <span>Daily Water Intake</span>
                      <div style={{ display: 'flex', gap: '8px',      alignItems: 'center',
                          justifyContent: 'center', }}>
                      <input 
                        type="number" 
                        step="0.1"
                          value={
                            healthData.hydration_liters 
                              ? (waterUnit === 'oz' 
                                  ? litersToOz(parseFloat(healthData.hydration_liters)).toFixed(1)
                                  : parseFloat(healthData.hydration_liters).toFixed(1))
                              : ''
                          } 
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              handleHealthDataChange('hydration_liters', '');
                            } else {
                              const numValue = parseFloat(inputValue);
                              if (!isNaN(numValue)) {
                                // Convert to liters if input is in ounces
                                const litersValue = waterUnit === 'oz' ? ozToLiters(numValue) : numValue;
                                handleHealthDataChange('hydration_liters', litersValue.toString());
                              }
                            }
                          }}
                          placeholder={waterUnit === 'oz' ? "64" : "2.0"}
                          min="0"
                          max={waterUnit === 'oz' ? "1000" : "30"}
                          style={{ flex: 1 }}
                        />
                        <div style={{ 
                          display: 'flex', 
                     
                          minHeight: '34px',
                          maxHeight: '34px',
                          border: '1px solid var(--border)', 
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleWaterUnitChange('oz')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: waterUnit === 'oz' ? 'var(--primary)' : 'transparent',
                              color: waterUnit === 'oz' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              borderRight: '1px solid var(--border)',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (waterUnit !== 'oz') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (waterUnit !== 'oz') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            title="Ounces"
                          >
                            oz
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWaterUnitChange('L')}
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: waterUnit === 'L' ? 'var(--primary)' : 'transparent',
                              color: waterUnit === 'L' ? '#fff' : 'var(--text)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease',
                              minWidth: '44px',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (waterUnit !== 'L') {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (waterUnit !== 'L') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            title="Liters"
                          >
                            L
                          </button>
                        </div>
                      </div>
                    </label>

                    {/* Mood */}
                    <label className="form-field">
                      <span>Mood</span>
                      <select 
                        value={healthData.mood || ''} 
                        onChange={(e) => handleHealthDataChange('mood', e.target.value)}
                      >
                        <option value="">Select Mood</option>
                        <option value="1">1 - Very Low</option>
                        <option value="2">2 - Low</option>
                        <option value="3">3 - Neutral</option>
                        <option value="4">4 - Good</option>
                        <option value="5">5 - Very Good</option>
                      </select>
                    </label>

                    {/* Stress Level */}
                    <label className="form-field">
                      <span>Stress Level</span>
                      <select 
                        value={healthData.stress_level || ''} 
                        onChange={(e) => handleHealthDataChange('stress_level', e.target.value)}
                      >
                        <option value="">Select Stress Level</option>
                        <option value="1">1 - Very Low</option>
                        <option value="2">2 - Low</option>
                        <option value="3">3 - Moderate</option>
                        <option value="4">4 - High</option>
                        <option value="5">5 - Very High</option>
                      </select>
                    </label>
    {/* Blood Glucose */}
                    <label className="form-field">
                      <span>Blood Glucose (mg/dL)</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input 
                          type="number" 
                          step="0.1"
                          value={healthData.blood_glucose || ''} 
                          onChange={(e) => handleHealthDataChange('blood_glucose', e.target.value)}
                          placeholder="85"
                          min="50" max="500"
                        />
                        <select 
                          value={glucoseType || 'fasting'} 
                          onChange={(e) => setGlucoseType(e.target.value)}
                          style={{ fontSize: '14px' }}
                        >
                          <option value="fasting">Fasting</option>
                          <option value="random">Random</option>
                          <option value="post-meal">Post-Meal</option>
                        </select>
                      </div>
                    </label>
                    {/* Visibility Scope */}
                    <label className="form-field">
                      <span>Visibility Scope</span>
                      <select 
                        value={healthData.visibility_scope} 
                        onChange={(e) => handleHealthDataChange('visibility_scope', e.target.value)}
                      >
                        <option value="private">Private</option>
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
                </>
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
                        ({getFilteredAndSortedRecords().length} of {healthDataRecords.length} records)
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => setShowFilters(!showFilters)}
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {showFilters ? '▼' : '▶'} Filters
                    </button>
                    {(Object.values(filters).some(v => v !== '') || sortColumn) && (
                      <button
                        type="button"
                        className="btn outline"
                        onClick={() => {
                          setFilters({
                            dateFrom: '',
                            dateTo: '',
                            heartRateMin: '',
                            heartRateMax: '',
                            bloodPressureSystolicMin: '',
                            bloodPressureSystolicMax: '',
                            bloodPressureDiastolicMin: '',
                            bloodPressureDiastolicMax: '',
                            activityMin: '',
                            activityMax: '',
                            bmiMin: '',
                            bmiMax: '',
                            temperatureMin: '',
                            temperatureMax: '',
                            glucoseMin: '',
                            glucoseMax: ''
                          });
                          setSortColumn(null);
                          setSortDirection('desc');
                        }}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '14px'
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Filters Panel */}
                {showFilters && (
                  <div style={{ 
                    marginBottom: 16, 
                    padding: 16, 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                  }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: 12,
                      marginBottom: 12
                    }}>
                      {/* Date Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Date From
                        </label>
                        <DatePicker
                          value={filters.dateFrom || ''}
                          onChange={(val) => {
                            setFilters(prev => {
                              const updated = { ...prev, dateFrom: val };
                              // If dateTo exists and is before new dateFrom, clear it
                              if (updated.dateTo && val && updated.dateTo < val) {
                                updated.dateTo = '';
                              }
                              return updated;
                            });
                          }}
                          maxDate={filters.dateTo || undefined}
                          placeholder="MM/DD/YYYY"
                          allowClear={true}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Date To
                        </label>
                        <DatePicker
                          value={filters.dateTo || ''}
                          onChange={(val) => setFilters(prev => ({ ...prev, dateTo: val || '' }))}
                          minDate={filters.dateFrom || undefined}
                          placeholder="MM/DD/YYYY"
                          allowClear={true}
                          style={{ width: '100%' }}
                        />
                      </div>
                      {/* Heart Rate Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Heart Rate (bpm) Min
                        </label>
                        <input
                          type="number"
                          value={filters.heartRateMin}
                          onChange={(e) => setFilters({ ...filters, heartRateMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Heart Rate (bpm) Max
                        </label>
                        <input
                          type="number"
                          value={filters.heartRateMax}
                          onChange={(e) => setFilters({ ...filters, heartRateMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      {/* Blood Pressure Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          BP Systolic Min
                        </label>
                        <input
                          type="number"
                          value={filters.bloodPressureSystolicMin}
                          onChange={(e) => setFilters({ ...filters, bloodPressureSystolicMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          BP Systolic Max
                        </label>
                        <input
                          type="number"
                          value={filters.bloodPressureSystolicMax}
                          onChange={(e) => setFilters({ ...filters, bloodPressureSystolicMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          BP Diastolic Min
                        </label>
                        <input
                          type="number"
                          value={filters.bloodPressureDiastolicMin}
                          onChange={(e) => setFilters({ ...filters, bloodPressureDiastolicMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          BP Diastolic Max
                        </label>
                        <input
                          type="number"
                          value={filters.bloodPressureDiastolicMax}
                          onChange={(e) => setFilters({ ...filters, bloodPressureDiastolicMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      {/* Activity Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Activity (min) Min
                        </label>
                        <input
                          type="number"
                          value={filters.activityMin}
                          onChange={(e) => setFilters({ ...filters, activityMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Activity (min) Max
                        </label>
                        <input
                          type="number"
                          value={filters.activityMax}
                          onChange={(e) => setFilters({ ...filters, activityMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      {/* BMI Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          BMI Min
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={filters.bmiMin}
                          onChange={(e) => setFilters({ ...filters, bmiMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          BMI Max
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={filters.bmiMax}
                          onChange={(e) => setFilters({ ...filters, bmiMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      {/* Temperature Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Temperature Min
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={filters.temperatureMin}
                          onChange={(e) => setFilters({ ...filters, temperatureMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Temperature Max
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={filters.temperatureMax}
                          onChange={(e) => setFilters({ ...filters, temperatureMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      {/* Glucose Range */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Glucose (mg/dL) Min
                        </label>
                        <input
                          type="number"
                          value={filters.glucoseMin}
                          onChange={(e) => setFilters({ ...filters, glucoseMin: e.target.value })}
                          placeholder="Min"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                          Glucose (mg/dL) Max
                        </label>
                        <input
                          type="number"
                          value={filters.glucoseMax}
                          onChange={(e) => setFilters({ ...filters, glucoseMax: e.target.value })}
                          placeholder="Max"
                          style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {loadingHealthData ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: 'var(--muted)', margin: 0 }}>Loading health data...</p>
                  </div>
                ) : healthDataRecords.length > 0 ? (
                  <div style={{ 
                    overflowY: 'auto', 
                    height: 'calc(100vh - 520px)',
                    minHeight: '300px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    width: '100%'
                  }}>
                    <style>{`
                      .health-data-table {
                        width: 100%;
                        border-collapse: collapse;
                      }
                      .health-data-table th,
                      .health-data-table td {
                        padding: 12px;
                        text-align: left;
                        font-size: 14px;
                        border-bottom: 1px solid var(--border);
                      }
                      .health-data-table th {
                        font-weight: 600;
                        position: sticky;
                        top: 0;
                        background-color: var(--card);
                        background: var(--card);
                        z-index: 10;
                        border-bottom: 2px solid var(--border);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                      }
                      .health-data-table thead {
                        background-color: var(--card);
                      }
                      .health-data-table th button {
                        transition: all 0.2s ease;
                        position: relative;
                      }
                      .health-data-table th button:hover {
                        color: var(--primary);
                      }
                      .health-data-table th button .sort-icon {
                        font-size: 12px;
                        color: var(--muted);
                        opacity: 0.5;
                        margin-left: 4px;
                        transition: all 0.2s ease;
                      }
                      .health-data-table th button:hover .sort-icon {
                        opacity: 1;
                        color: var(--primary);
                      }
                      .health-data-table th button .sort-active {
                        font-size: 14px;
                        color: var(--primary);
                        font-weight: 700;
                        margin-left: 4px;
                      }
                      .health-data-table .col-date,
                      .health-data-table .col-actions {
                        display: table-cell !important;
                      }
                      .health-data-table .col-heart-rate,
                      .health-data-table .col-blood-pressure,
                      .health-data-table .col-activity,
                      .health-data-table .col-bmi,
                      .health-data-table .col-temperature,
                      .health-data-table .col-glucose {
                        display: table-cell;
                      }
                      @media (max-width: 1200px) {
                        .health-data-table .col-glucose {
                          display: none;
                        }
                      }
                      @media (max-width: 1000px) {
                        .health-data-table .col-temperature {
                          display: none;
                        }
                      }
                      @media (max-width: 900px) {
                        .health-data-table .col-bmi {
                          display: none;
                        }
                      }
                      @media (max-width: 800px) {
                        .health-data-table .col-activity {
                          display: none;
                        }
                      }
                      @media (max-width: 700px) {
                        .health-data-table .col-blood-pressure {
                          display: none;
                        }
                      }
                      @media (max-width: 600px) {
                        .health-data-table .col-heart-rate {
                          display: none;
                        }
                      }
                    `}</style>
                    <table className="health-data-table">
                      <thead>
                        <tr>
                          <th className="col-date">
                            <button
                              type="button"
                              onClick={() => handleSort('date')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              Date
                              {sortColumn === 'date' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-heart-rate">
                            <button
                              type="button"
                              onClick={() => handleSort('heart_rate')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              Heart Rate
                              {sortColumn === 'heart_rate' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-blood-pressure">
                            <button
                              type="button"
                              onClick={() => handleSort('blood_pressure')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              Blood Pressure
                              {sortColumn === 'blood_pressure' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-activity">
                            <button
                              type="button"
                              onClick={() => handleSort('activity')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              Activity
                              {sortColumn === 'activity' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-bmi">
                            <button
                              type="button"
                              onClick={() => handleSort('bmi')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              BMI
                              {sortColumn === 'bmi' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-temperature">
                            <button
                              type="button"
                              onClick={() => handleSort('temperature')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              Temperature
                              {sortColumn === 'temperature' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-glucose">
                            <button
                              type="button"
                              onClick={() => handleSort('glucose')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                                color: 'var(--text)',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              Glucose
                              {sortColumn === 'glucose' ? (
                                <span className="sort-active">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              ) : (
                                <span className="sort-icon">↕</span>
                              )}
                            </button>
                          </th>
                          <th className="col-actions" style={{ textAlign: 'center', width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredAndSortedRecords().map((record) => (
                          <tr key={record.id}>
                            <td className="col-date" style={{ fontWeight: '500' }}>{formatDateUS(record.date)}</td>
                            <td className="col-heart-rate">
                              {record.heart_rate ? `${record.heart_rate} bpm` : '-'}
                            </td>
                            <td className="col-blood-pressure">
                              {record.blood_pressure_systolic && record.blood_pressure_diastolic 
                                ? `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}` 
                                : '-'}
                            </td>
                            <td className="col-activity">
                              {record.weekly_activity_minutes ? `${record.weekly_activity_minutes} min` : '-'}
                            </td>
                            <td className="col-bmi">
                              {record.body_mass_index ? parseFloat(record.body_mass_index).toFixed(1) : '-'}
                            </td>
                            <td className="col-temperature">
                              {record.body_temperature 
                                ? `${parseFloat(record.body_temperature).toFixed(1)}°${record.body_temperature_unit || 'C'}` 
                                : '-'}
                            </td>
                            <td className="col-glucose">
                              {record.fasting_glucose ? `${record.fasting_glucose} mg/dL` : '-'}
                            </td>
                            <td className="col-actions" style={{ textAlign: 'center' }}>
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

function HealthSection({ title, description, options = [], values, lastUpdated, onToggle, onSave, onAddNew, saving, sectionKey, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${month}/${day}/${year}`;
    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return dateStr + ' ' + timeStr;
  };

  return (
    <div style={{ 
      borderTop: '1px solid var(--border)', 
      backgroundColor: open ? 'var(--bg-subtle)' : 'transparent',
      transition: 'background-color 0.2s ease'
    }}>
      <button 
        onClick={() => setOpen(v => !v)} 
        className="btn ghost health-section-button"
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
            <span className="health-section-title" style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)' }}>{title}</span>
    
          </div>
          {description && (
            <p className="health-section-description" style={{ 
              color: 'var(--muted)', 
              fontSize: '13px', 
              margin: '0 0 0 0',
              lineHeight: '1.4'
            }}>
              {description}
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
        <div className="health-section-content" style={{ 
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
              <p className="health-section-description" style={{ 
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
                    ? (item.id || item.medical_conditions_id || item.condition_name || item.name || item.allergy_name || item.procedure_name || item.vaccine_name || item.sensitivity_name || item.dental_history_id || item.last_dental_exam_date || item.last_dental_exam || `obj-${idx}`)
                    : item;
                  const uniqueKey = `${sectionKey}-${idx}-${itemIdentifier}`;
                  
                  // Unified card design for all sections
                  const displayName = isObject ? (
                    item.condition_name || 
                    item.name || 
                    item.allergy_name || 
                    item.procedure_name || 
                    item.vaccine_name || 
                    item.sensitivity_name ||
                    (item.last_dental_exam_date || item.last_dental_exam ? `Dental History - ${item.last_dental_exam_date || item.last_dental_exam}` : 'Dental History') ||
                    'Unknown'
                  ) : item;
                  const infoParts = [];
                  // Define severity outside the if-else block so it's available for rendering
                  const severity = item?.severity;
                  
                  // Handle dental history separately
                  if (sectionKey === 'dental_history' && isObject) {
                    const examDate = item.last_dental_exam_date || item.last_dental_exam;
                    if (examDate) infoParts.push(`Last exam: ${examDate}`);
                    const gumDisease = item.has_gum_disease !== undefined ? item.has_gum_disease : item.gum_disease;
                    if (gumDisease !== null && gumDisease !== undefined) infoParts.push(`Gum disease: ${gumDisease ? 'Yes' : 'No'}`);
                    const frequentCavities = item.has_frequent_cavities !== undefined ? item.has_frequent_cavities : item.frequent_cavities;
                    if (frequentCavities !== null && frequentCavities !== undefined) infoParts.push(`Frequent cavities: ${frequentCavities ? 'Yes' : 'No'}`);
                    const majorWork = item.major_dental_work_notes || item.major_dental_work;
                    if (majorWork) infoParts.push(`Major work: ${majorWork}`);
                    const tmjIssues = item.has_tmj_issues !== undefined ? item.has_tmj_issues : item.tmj_issues;
                    if (tmjIssues !== null && tmjIssues !== undefined) infoParts.push(`TMJ issues: ${tmjIssues ? 'Yes' : 'No'}`);
                    const concerns = item.current_dental_concerns || item.current_concerns;
                    if (concerns) infoParts.push(`Concerns: ${concerns}`);
                  } else {
                    // Other sections
                    const diagnosis = item?.diagnosis_date || item?.entry_date || item?.date || item?.start_date;
                    const endDate = item?.end_date;
                    const dosage = item?.dosage;
                    const frequency = item?.frequency;
                    const notes = item?.notes || item?.treatment_plan;
                    if (diagnosis) infoParts.push(`Date: ${diagnosis}`);
                    if (endDate) infoParts.push(`End: ${endDate}`);
                    if (dosage) infoParts.push(`Dosage: ${dosage}`);
                    if (frequency) infoParts.push(`Freq: ${frequency}`);
                    if (severity) infoParts.push(`Severity: ${severity}`);
                    if (notes) infoParts.push(notes);
                  }

                  // Check if light theme is active
                  const isLightTheme = document.documentElement.classList.contains('light-theme');

                  return (
                    <div key={uniqueKey} className="health-item-card" style={{
                      backgroundColor: isLightTheme ? 'rgba(249, 250, 251, 0.8)' : 'rgba(17, 17, 17, 0.6)',
                      border: '1px solid var(--border)',
                      borderLeft: '2px solid var(--primary)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      cursor: 'pointer',
                      boxShadow: isLightTheme ? '0 1px 2px rgba(0,0,0,.05)' : 'none'
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
                          <span className="health-item-text" style={{ fontWeight: 600, color: 'var(--text)' }}>{displayName}</span>
                          {severity && (
                            <span className="health-item-date" style={{ fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{severity}</span>
                          )}
                        </div>
                        {infoParts.length > 0 && (
                          <div className="health-item-date" style={{ 
                            fontSize: 13, 
                            color: isLightTheme ? '#4b5563' : 'var(--muted)',
                            lineHeight: 1.5
                          }}>
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

