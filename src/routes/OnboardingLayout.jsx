import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import { useNotifications } from '../api/NotificationContext.jsx';
import { OnboardingApi } from '../api/onboardingApi.js';
import { ProfilesApi } from '../api/profilesApi.js';
import { Logo } from '../components/Logo.jsx';
import DatePicker from '../components/DatePicker.jsx';
import './OnboardingLayout.css';

const OnboardingLayout = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding, setIsNewUser } = useAuth();
  const { showSuccess, showError } = useNotifications();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const initializedRef = useRef(false);
  const [bmiHoveredCategory, setBmiHoveredCategory] = useState(null);
  const [bmiTooltipPosition, setBmiTooltipPosition] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    // User ID for API calls
    user_id: user?.id || '',
    
    // Personal Info - will be populated from user profile
    firstName: user?.first_name || user?.firstName || '',
    lastName: user?.last_name || user?.lastName || '',
    email: user?.email || '',
    phoneNumber: '',
    dateOfBirth: '',
    sexAtBirth: '',
    height: '',
    weight: '',
    zipCode: '',
    heightUnit: 'cm',
    weightUnit: 'kg',

    // Health Snapshot
    healthConditions: '',
    medications: '',
    allergies: '',

    // Lifestyle & Habits
    lifestyleHabits: [],

    // Health Goals
    healthGoals: [],
    otherGoal: '',
    targetDate: '',
    goalNotes: '',
    goalVisibility: 'private',

    // Privacy Settings
    dataVisibility: 'private',
    emailNudges: true,
    wearableSync: false
  });

  const steps = [
    { id: 'welcome', title: 'Welcome', description: 'Get started with Anatomous' },
    { id: 'personal', title: 'Personal Info', description: 'Basic information' },
    { id: 'health_snapshot', title: 'Health Snapshot', description: 'Current health status' },
    { id: 'lifestyle', title: 'Lifestyle & Habits', description: 'Daily habits' },
    { id: 'health_goals', title: 'Health Goals', description: 'What you want to achieve' },
    { id: 'privacy', title: 'Privacy Settings', description: 'Data preferences' },
    { id: 'review', title: 'Review & Finish', description: 'Complete setup' }
  ];

  const lifestyleOptions = [
    'Sedentary lifestyle',
    'Regular exercise',
    'High stress',
    'Irregular sleep',
    'Smokes or vapes',
    'Drinks alcohol',
    'Special diet (e.g., keto, plant-based)',
    'Works night shifts',
    'Manages a chronic condition',
    'Prefers natural or alternative medicine'
  ];

  const healthGoalOptions = [
    'Lose weight',
    'Gain muscle',
    'Improve sleep',
    'Reduce stress',
    'Manage a condition',
    'Improve energy',
    'Optimize performance',
    'Prevent disease',
    'General wellness'
  ];

  // Load user profile from database
  const loadUserProfile = async () => {
    if (!user?.id) {
      console.log('❌ No user ID available for profile loading');
      return;
    }
    
    try {
      setProfileLoading(true);
      console.log('🔍 Loading user profile for onboarding, user ID:', user.id);
      console.log('👤 User object:', user);
      
      // Try to get profile by user_id
      let profileData = null;
      try {
        console.log('📡 Calling ProfilesApi.getById with user_id:', user.id);
        profileData = await ProfilesApi.getById(user.id);
        console.log('✅ Profile found by ID:', profileData);
        
        if (profileData) {
          console.log('📝 Profile contains:', {
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            user_id: profileData.user_id,
            id: profileData.id
          });
        }
      } catch (idError) {
        console.log('⚠️ Profile not found by ID, trying to get all profiles:', idError.message);
        // If not found by ID, try to get all profiles and filter by user_id
        const allProfilesResponse = await ProfilesApi.getAll();
        const allProfiles = allProfilesResponse?.result || allProfilesResponse;
        
        console.log('📋 All profiles response:', allProfiles);
        
        if (Array.isArray(allProfiles)) {
          profileData = allProfiles.find(p => p.user_id === user.id || p.id === user.id);
          console.log('🔍 Found profile in list:', profileData);
        } else if (allProfiles && (allProfiles.user_id === user.id || allProfiles.id === user.id)) {
          profileData = allProfiles;
          console.log('🔍 Single profile found:', profileData);
        }
      }
      
      setProfile(profileData);
      console.log('📊 Final profile data loaded:', profileData);
      
      if (!profileData) {
        console.log('⚠️ No profile found for user_id:', user.id);
      } else {
        // Force update form data when profile is loaded
        console.log('🔄 Profile loaded, updating form data...');
        updateFormWithProfileData(profileData);
      }
      
    } catch (error) {
      console.warn('❌ Failed to load profile:', error.message);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Update form data with profile data
  const updateFormWithProfileData = (profileData) => {
    console.log('🔄 Updating form with profile data:', profileData);
    console.log('🔍 Profile data fields:', {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      dob: profileData.dob,
      gender: profileData.gender,
      height_cm: profileData.height_cm,
      weight_kg: profileData.weight_kg,
      zip_code: profileData.zip_code
    });
    
    setFormData(prev => {
      console.log('📋 Previous form data:', {
        firstName: prev.firstName,
        lastName: prev.lastName,
        heightUnit: prev.heightUnit,
        weightUnit: prev.weightUnit
      });
      
      const updated = {
        ...prev,
        user_id: user?.id || prev.user_id,
        firstName: profileData.first_name || prev.firstName,
        lastName: profileData.last_name || prev.lastName,
        email: profileData.email || prev.email,
        phoneNumber: profileData.phone_number || prev.phoneNumber,
        dateOfBirth: profileData.dob || prev.dateOfBirth,
        sexAtBirth: profileData.gender || prev.sexAtBirth,
        height: profileData.height_cm ? profileData.height_cm.toString() : prev.height,
        weight: profileData.weight_kg ? profileData.weight_kg.toString() : prev.weight,
        zipCode: profileData.zip_code || prev.zipCode,
        // Preserve heightUnit and weightUnit - they should not be overwritten
        heightUnit: prev.heightUnit || 'cm',
        weightUnit: prev.weightUnit || 'kg',
      };
      
      console.log('📝 Updated form data:', {
        user_id: updated.user_id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
        dateOfBirth: updated.dateOfBirth,
        sexAtBirth: updated.sexAtBirth,
        height: updated.height,
        weight: updated.weight,
        zipCode: updated.zipCode
      });
      
      console.log('✅ Form update complete! firstName:', updated.firstName, 'lastName:', updated.lastName);
      
      return updated;
    });
  };

  // Load onboarding progress from welcome API
  const loadOnboardingProgress = async (currentFormData) => {
    try {
      console.log('📊 Loading onboarding progress from welcome API...');
      
      // Call welcome API to get onboarding progress
      const response = await OnboardingApi.getProgress(currentFormData.user_id);
      console.log('📊 Onboarding API response:', response);
      
      // Extract progress data from the response structure
      const progress = response?.save_onboarding;
      console.log('📊 Extracted progress data:', progress);
      console.log('📊 Progress completed status:', progress?.completed);
      console.log('📊 Progress percentage:', progress?.progress?.percentage);
      console.log('📊 Current user onboarding_completed:', user?.onboarding_completed);
      
      // If onboarding is 100% complete, mark all steps as completed and move to last step (no redirect)
      if (progress?.progress?.percentage === 100) {
        console.log('🎯 Onboarding is 100% complete per API. Marking all steps as completed.');
        await completeOnboarding();
        const allCompleted = new Set();
        for (let i = 0; i < steps.length; i++) allCompleted.add(i);
        setCompletedSteps(allCompleted);
        setCurrentStep(steps.length - 1);
        // Clear saved progress cache
        localStorage.removeItem('onboarding-progress');
        localStorage.removeItem('onboarding-step');
        localStorage.removeItem('onboarding-completed');
        console.log('🚫 Skipping auto-redirect to dashboard after 100% onboarding');
        // Continue to populate form data below
      }
      
      // Check if progress has the expected structure
      if (!progress || !progress.progress || !progress.progress.completed_steps) {
        console.warn('⚠️ Unexpected progress structure:', progress);
        console.log('📊 Available progress keys:', Object.keys(progress || {}));
        if (progress?.progress) {
          console.log('📊 Available progress.progress keys:', Object.keys(progress.progress));
        }
        return; // Exit early if structure is unexpected
      }
      
      // Mark completed steps
      const completedStepsSet = new Set();
      
      // Mark all completed steps
      progress.progress.completed_steps.forEach(stepId => {
        const stepIndex = steps.findIndex(step => step.id === stepId);
        if (stepIndex !== -1) {
          completedStepsSet.add(stepIndex);
        }
      });
      
      // Automatically mark welcome step as completed (index 0)
      completedStepsSet.add(0);
      console.log('✅ Automatically marking welcome step as completed');
      
      setCompletedSteps(completedStepsSet);
      
      // Set current step based on API response
      let nextUncompletedStepIndex = -1;
      
      // Use current_step from API response to determine next step
      if (progress.current_step) {
        const currentStepIndex = steps.findIndex(step => step.id === progress.current_step);
        if (currentStepIndex !== -1) {
          nextUncompletedStepIndex = currentStepIndex;
          console.log(`📍 API indicates next step: ${progress.current_step} (index: ${currentStepIndex})`);
        } else {
          console.warn(`⚠️ Unknown step ID from API: ${progress.current_step}`);
        }
      }
      
      // Fallback: Find the first uncompleted step if API step not found
      if (nextUncompletedStepIndex === -1) {
        for (let i = 1; i < steps.length; i++) {
          const stepId = steps[i].id;
          if (!progress.progress.completed_steps.includes(stepId)) {
            nextUncompletedStepIndex = i;
            break;
          }
        }
      }
      
      console.log(`🔍 Debug step logic:`, {
        apiCurrentStep: progress.current_step,
        completedSteps: progress.progress.completed_steps,
        completedStepsSet: [...completedStepsSet],
        nextUncompletedStepIndex,
        stepsLength: steps.length
      });
      
      if (nextUncompletedStepIndex === -1) {
        // All steps completed
        if (progress.completed === true) {
          console.log('✅ Onboarding completed per API. Marking all steps as completed.');
          await completeOnboarding();
          const allCompleted = new Set();
          for (let i = 0; i < steps.length; i++) allCompleted.add(i);
          setCompletedSteps(allCompleted);
          setCurrentStep(steps.length - 1);
          localStorage.removeItem('onboarding-progress');
          localStorage.removeItem('onboarding-step');
          localStorage.removeItem('onboarding-completed');
        } else {
          // All steps completed but not marked as completed, show last step
          console.log(`📍 All steps completed but onboarding not finished, staying on last step: ${steps[steps.length - 1].id} (index: ${steps.length - 1})`);
          setCurrentStep(steps.length - 1);
        }
      } else {
        console.log(`📍 Setting current step to next uncompleted step: ${steps[nextUncompletedStepIndex].id} (index: ${nextUncompletedStepIndex})`);
        setCurrentStep(nextUncompletedStepIndex);
      }
      
      // Populate form data with completed step data
      const populatedFormData = { ...currentFormData };
      console.log('📝 Starting to populate form data from API response...');
      
      // Personal step data
      if (progress.steps.personal?.completed && progress.steps.personal.data) {
        console.log('👤 Populating personal step data:', progress.steps.personal.data);
        const personalData = progress.steps.personal.data;
        
        populatedFormData.firstName = personalData.first_name || populatedFormData.firstName;
        populatedFormData.lastName = personalData.last_name || populatedFormData.lastName;
        populatedFormData.email = personalData.email || populatedFormData.email;
        populatedFormData.phoneNumber = personalData.phone_number || populatedFormData.phoneNumber;
        populatedFormData.dateOfBirth = personalData.dob || populatedFormData.dateOfBirth;
        populatedFormData.sexAtBirth = personalData.sex_of_birth || populatedFormData.sexAtBirth;
        populatedFormData.height = personalData.height ? personalData.height.toString() : populatedFormData.height;
        populatedFormData.weight = personalData.weight ? personalData.weight.toString() : populatedFormData.weight;
        populatedFormData.zipCode = personalData.zip_code || populatedFormData.zipCode;
        // Pick up measurement unit types if API provides them
        if (personalData.height_type) {
          populatedFormData.heightUnit = personalData.height_type === 'in' ? 'in' : 'cm';
        }
        if (personalData.weight_type) {
          populatedFormData.weightUnit = personalData.weight_type === 'lb' ? 'lb' : 'kg';
        }
        
        console.log('✅ Personal data populated from API');
      }
      
      // Health snapshot data
      if (progress.steps.health_snapshot?.completed && progress.steps.health_snapshot.data) {
        const healthData = progress.steps.health_snapshot.data;
        if (healthData.health_snapshot) {
          populatedFormData.healthConditions = healthData.health_snapshot.health_conditions || populatedFormData.healthConditions;
          populatedFormData.medications = healthData.health_snapshot.medications || populatedFormData.medications;
          populatedFormData.allergies = healthData.health_snapshot.allergies || populatedFormData.allergies;
        }
      }
      
      // Lifestyle data
      if (progress.steps.lifestyle?.completed && progress.steps.lifestyle.data) {
        const lifestyleData = progress.steps.lifestyle.data;
        if (lifestyleData.lifestyle?.habits) {
          populatedFormData.lifestyleHabits = lifestyleData.lifestyle.habits || populatedFormData.lifestyleHabits;
        }
      }
      
      // Health goals data
      if (progress.steps.health_goals?.completed && progress.steps.health_goals.data) {
        const goalsData = progress.steps.health_goals.data;
        populatedFormData.targetDate = goalsData.target_date || populatedFormData.targetDate;
        populatedFormData.goalNotes = goalsData.description || populatedFormData.goalNotes;
        populatedFormData.goalVisibility = goalsData.visibility_scope || populatedFormData.goalVisibility || 'private';
      }
      
      // Privacy settings data
      if (progress.steps.privacy?.completed && progress.steps.privacy.data) {
        const privacyData = progress.steps.privacy.data;
        if (privacyData.privacy) {
          populatedFormData.dataVisibility = privacyData.privacy.data_visibility || populatedFormData.dataVisibility;
          populatedFormData.emailNudges = privacyData.privacy.email_nudges !== undefined ? privacyData.privacy.email_nudges : populatedFormData.emailNudges;
          populatedFormData.wearableSync = privacyData.privacy.wearable_sync !== undefined ? privacyData.privacy.wearable_sync : populatedFormData.wearableSync;
        }
      }
      
      console.log('📝 Populated form data from API:', populatedFormData);
      // Merge instead of replace to preserve units and other defaults
      setFormData(prev => ({
        ...prev,
        ...populatedFormData,
        // Ensure measurement units are always defined
        heightUnit: prev.heightUnit || 'cm',
        weightUnit: prev.weightUnit || 'kg',
      }));
      
    } catch (error) {
      console.error('❌ Error loading onboarding progress:', error);
      // Continue with default initialization if API fails
    }
  };


  // Load user profile from database
  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id]);

  // Initialize form data and load onboarding progress (run once after profile load)
  useEffect(() => {
    if (initializedRef.current) return;
    if (user?.id && !profileLoading) {
      console.log('👤 Loading user data for onboarding:', user);
      console.log('📊 Profile data from database:', profile);
      
      // Initialize form data with user profile data from database
      const initialFormData = {
        user_id: user?.id || '',
        firstName: profile?.first_name || user?.first_name || user?.firstName || '',
        lastName: profile?.last_name || user?.last_name || user?.lastName || '',
        email: profile?.email || user?.email || '',
        phoneNumber: profile?.phone_number || user?.phone_number || user?.phone || '',
        dateOfBirth: profile?.dob || '',
        sexAtBirth: profile?.sex_of_birth || user?.sex_of_birth || '',
        height: profile?.height_cm ? profile.height_cm.toString() : '',
        weight: profile?.weight_kg ? profile.weight_kg.toString() : '',
        zipCode: profile?.zip_code || '',
        healthConditions: '',
        medications: '',
        allergies: '',
        lifestyleHabits: [],
        healthGoals: [],
        otherGoal: '',
        dataVisibility: 'private',
        emailNudges: true,
        wearableSync: false
      };

      console.log('📝 Initial form data with profile info:', initialFormData);
      setFormData(prev => ({ ...prev, ...initialFormData }));
      
      // Load onboarding progress from welcome API
      loadOnboardingProgress(initialFormData);
      initializedRef.current = true;
    }
  }, [user, profile, profileLoading]);

  // Track current step changes (only log in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Current step changed to: ${currentStep} (${steps[currentStep]?.id})`);
    }
  }, [currentStep]);

  // Track form data changes (only log when step changes to avoid spam)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (formData.firstName || formData.lastName || formData.email)) {
      console.log(`📝 Form data updated for step ${currentStep}:`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        sexAtBirth: formData.sexAtBirth,
        height: formData.height,
        weight: formData.weight,
        zipCode: formData.zipCode
      });
    }
  }, [currentStep]); // Changed dependency from formData to currentStep

  // Save progress to localStorage
  const saveProgress = () => {
    console.log('💾 Saving progress to localStorage, currentStep:', currentStep);
    localStorage.setItem('onboarding-progress', JSON.stringify(formData));
    localStorage.setItem('onboarding-step', currentStep.toString());
    localStorage.setItem('onboarding-completed', JSON.stringify([...completedSteps]));
  };

  const updateFormData = (field, value) => {
    console.log(`🔄 Updating form field ${field} to:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const saveStepData = async (stepIndex) => {
    const stepId = steps[stepIndex].id;
    
    switch (stepId) {
      case 'personal':
        await OnboardingApi.savePersonalInfo(formData);
        break;
      case 'health_snapshot':
        await OnboardingApi.saveHealthSnapshot(formData);
        break;
      case 'lifestyle':
        await OnboardingApi.saveLifestyle(formData);
        break;
      case 'health_goals':
        await OnboardingApi.saveHealthGoals(formData);
        break;
      case 'privacy':
        await OnboardingApi.savePrivacySettings(formData);
        break;
      default:
        // For welcome and review steps, no data to save
        break;
    }
  };

  const nextStep = async () => {
    console.log('🔄 nextStep called, currentStep:', currentStep);
    if (currentStep < steps.length - 1) {
      setLoading(true);
      try {
        console.log('💾 Saving step data for step:', currentStep);
        // Save current step data to server
        await saveStepData(currentStep);
        
        console.log('✅ Step data saved, moving to next step');
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(prev => {
          const next = prev + 1;
          console.log('📈 Moving from step', prev, 'to step', next);
          return next;
        });
        saveProgress();
      } catch (error) {
        console.error('Error saving step data:', error);
        showError('Failed to save step. Please try again.');
        // Still allow user to continue even if save fails
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(prev => {
          const next = prev + 1;
          console.log('📈 Moving from step', prev, 'to step', next, '(despite save error)');
          return next;
        });
        saveProgress();
      } finally {
        setLoading(false);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex) => {
    // Allow navigation if:
    // 1. Going to a previous or current step
    // 2. Going to a completed step
    // 3. Going to the last step (Review & Finish) if all previous steps are completed
    const isLastStep = stepIndex === steps.length - 1;
    const allPreviousCompleted = isLastStep 
      ? Array.from({ length: stepIndex }).every((_, i) => completedSteps.has(i))
      : false;
    
    if (stepIndex <= currentStep || completedSteps.has(stepIndex) || allPreviousCompleted) {
      setCurrentStep(stepIndex);
    }
  };

  const finishLater = () => {
    console.log('⏸️ Finishing onboarding later...');
    console.log('💾 Saving current progress...');
    saveProgress();
    
    showSuccess('Your progress has been saved. You can continue onboarding anytime from your dashboard.');
    console.log('🚀 Navigating to dashboard (Overview)...');
    // Mark as not a new user so DashboardGuard allows access
    try { setIsNewUser(false); } catch {}
    // Navigate to dashboard (Overview/Home page)
    navigate('/dashboard', { replace: true });
  };

  const completeOnboardingProcess = async () => {
    try {
      setLoading(true);
      console.log('🎯 Starting onboarding completion process...');
      
      // Check current progress before completing
      console.log('📊 Checking current onboarding progress...');
      const response = await OnboardingApi.getProgress(formData.user_id);
      const progress = response?.save_onboarding;
      
      // Save all edited steps before completing onboarding
      console.log('💾 Saving all edited steps before completion...');
      
      // Save personal step if it has data (always save if we have basic info)
      if (formData.firstName || formData.lastName || formData.email || formData.phoneNumber || formData.dateOfBirth) {
        console.log('💾 Saving personal information...');
        await OnboardingApi.savePersonalInfo(formData);
      }
      
      // Save health snapshot if it has any data
      if (formData.healthConditions || formData.medications || formData.allergies) {
        console.log('💾 Saving health snapshot...');
        await OnboardingApi.saveHealthSnapshot(formData);
      }
      
      // Save lifestyle if it has data
      if (formData.lifestyleHabits && formData.lifestyleHabits.length > 0) {
        console.log('💾 Saving lifestyle habits...');
        await OnboardingApi.saveLifestyle(formData);
      }
      
      // Save health goals if it has data
      if (formData.healthGoals && formData.healthGoals.length > 0) {
        console.log('💾 Saving health goals...');
        await OnboardingApi.saveHealthGoals(formData);
      }
      
      // Save privacy settings (always save if we're completing onboarding)
      console.log('💾 Saving privacy settings...');
      await OnboardingApi.savePrivacySettings(formData);
      
      // Complete onboarding
      console.log('✅ Completing onboarding...');
      const result = await OnboardingApi.completeOnboarding({
        user_id: user?.id,
        stepsCompleted: [...completedSteps, currentStep]
      });
      
      console.log('📊 Onboarding completion result:', result);
      
      // Mark onboarding as completed in AuthContext
      console.log('🔐 Updating auth context...');
      await completeOnboarding();
      
      // Clear saved progress
      console.log('🧹 Clearing localStorage...');
      localStorage.removeItem('onboarding-progress');
      localStorage.removeItem('onboarding-step');
      localStorage.removeItem('onboarding-completed');
      
      showSuccess('Welcome to Anatomous! Your profile has been set up successfully.');
      // Redirect to dashboard (Overview/Home) after successful completion
      console.log('🚀 Navigating to dashboard (Overview) after completing onboarding...');
      try {
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('❌ Error navigating to dashboard:', error);
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      showError('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    console.log(`🎭 Rendering step content for currentStep: ${currentStep} (${steps[currentStep]?.id})`);
    
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="onboarding-step-content">
            <h2>Welcome to Anatomous</h2>
            <p className="step-description">
              Let's set up your personalized health profile in just a few steps. 
              This will help us provide you with tailored insights and recommendations.
            </p>
            <div className="welcome-info">
              <div className="info-item">
                <span className="info-icon">⏱️</span>
                <span>3-5 minutes to complete</span>
              </div>
              <div className="info-item">
                <span className="info-icon">🔒</span>
                <span>Your data is secure and private</span>
              </div>
              <div className="info-item">
                <span className="info-icon">📊</span>
                <span>Get personalized health insights</span>
              </div>
            </div>
            <button className="btn primary large" onClick={nextStep}>
              Let's Get Started
            </button>
          </div>
        );

      case 1: // Personal Info
        return (
          <div className="onboarding-step-content">
            <h2>Personal Information</h2>
            <p className="step-description">Tell us about yourself to personalize your experience.</p>
            
            {profileLoading && (
              <div style={{ 
                padding: '16px', 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                marginBottom: '16px',
                textAlign: 'center',
                color: 'var(--muted)'
              }}>
                <span>Loading your profile data...</span>
              </div>
            )}
            
            
            <div className="form-grid">
              <div className="form-field">
                <label>First Name *</label>
                {console.log('🎯 Rendering First Name field with value:', formData.firstName)}
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              
              <div className="form-field">
                <label>Last Name *</label>
                {console.log('🎯 Rendering Last Name field with value:', formData.lastName)}
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
              
              <div className="form-field" hidden={true}>
                <label>Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="+1 555-555-1234"
                />
              </div>
              
              <div className="form-field">
                <label>Date of Birth *</label>
                <DatePicker
                  value={formData.dateOfBirth}
                  onChange={(val) => updateFormData('dateOfBirth', val)}
                />
              </div>
              
              <div className="form-field">
                <label>Sex *</label>
                <select
                  value={formData.sexAtBirth}
                  onChange={(e) => updateFormData('sexAtBirth', e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div className="form-field">
                <label>ZIP Code</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => updateFormData('zipCode', e.target.value)}
                  placeholder="e.g., 94105"
                />
              </div>
              
              <div className="form-field">
                <label>Height</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => updateFormData('height', e.target.value)}
                    placeholder={formData.heightUnit === 'cm' ? 'e.g., 175' : 'e.g., 69'}
                    style={{ }}
                  />
                  <select
                    value={formData.heightUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value;
                      // convert existing value
                      const h = parseFloat(formData.height);
                      if (!isNaN(h)) {
                        if (formData.heightUnit === 'cm' && newUnit === 'in') {
                          const inches = (h / 2.54).toFixed(1);
                          updateFormData('height', inches);
                        } else if (formData.heightUnit === 'in' && newUnit === 'cm') {
                          const cm = (h * 2.54).toFixed(0);
                          updateFormData('height', cm);
                        }
                      }
                      updateFormData('heightUnit', newUnit);
                    }}
                  >
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                  </select>
                </div>
              </div>

           
              
              <div className="form-field">
                <label>Weight</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => updateFormData('weight', e.target.value)}
                    placeholder={formData.weightUnit === 'kg' ? 'e.g., 70' : 'e.g., 154'}
                    style={{  }}
                  />
                  <select
                    value={formData.weightUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value;
                      const w = parseFloat(formData.weight);
                      if (!isNaN(w)) {
                        if (formData.weightUnit === 'kg' && newUnit === 'lb') {
                          const lb = (w * 2.20462).toFixed(1);
                          updateFormData('weight', lb);
                        } else if (formData.weightUnit === 'lb' && newUnit === 'kg') {
                          const kg = (w / 2.20462).toFixed(1);
                          updateFormData('weight', kg);
                        }
                      }
                      updateFormData('weightUnit', newUnit);
                    }}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
                 {/* BMI auto-calculation */}
                 <div className="form-field">
                <label>BMI</label>
                {(() => {
                  const h = parseFloat(formData.height);
                  const w = parseFloat(formData.weight);
                  if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
                    return (
                      <div style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                        —
                      </div>
                    );
                  }
                  // Normalize units with sensible defaults
                  const normalizedHeightUnit = formData.heightUnit || 'cm';
                  const normalizedWeightUnit = formData.weightUnit || 'kg';

                  // Convert height to meters
                  let heightMeters;
                  if (normalizedHeightUnit === 'cm') {
                    heightMeters = h / 100; // cm to meters
                  } else {
                    // inches to meters: inches * 0.0254 = meters (direct conversion)
                    heightMeters = h * 0.0254;
                  }
                  
                  // Convert weight to kg
                  const weightKg = normalizedWeightUnit === 'kg' ? w : w * 0.453592; // lb to kg (direct conversion)
                  
                  // Validate reasonable values before calculation
                  // Height should be between 0.5m and 3m (reasonable human range)
                  // Weight should be between 5kg and 500kg (reasonable human range)
                  if (heightMeters < 0.5 || heightMeters > 3 || weightKg < 5 || weightKg > 500) {
                    console.warn('BMI Calculation: Unusual values detected', {
                      height: h,
                      heightUnit: formData.heightUnit,
                      heightMeters,
                      weight: w,
                      weightUnit: formData.weightUnit,
                      weightKg
                    });
                  }
                  
                  // Calculate BMI: weight (kg) / height (m)^2
                  const bmi = weightKg / (heightMeters * heightMeters);
                  
                  // Ensure BMI is valid and within reasonable range (10-60)
                  let bmiValue = null;
                  if (bmi && !isNaN(bmi) && isFinite(bmi) && bmi > 0 && bmi >= 10 && bmi <= 60) {
                    bmiValue = parseFloat(bmi.toFixed(1));
                  } else if (bmi && !isNaN(bmi) && isFinite(bmi) && bmi > 0) {
                    // If BMI is outside reasonable range, still calculate but log warning
                    console.warn('BMI Calculation: BMI outside normal range', {
                      bmi,
                      height: h,
                      heightUnit: formData.heightUnit,
                      weight: w,
                      weightUnit: formData.weightUnit
                    });
                    bmiValue = parseFloat(bmi.toFixed(1));
                  }
                  
                  // Debug logging
                  console.log('BMI Calculation:', {
                    height: h,
                    heightUnit: normalizedHeightUnit,
                    weight: w,
                    weightUnit: normalizedWeightUnit,
                    heightMeters: parseFloat(heightMeters.toFixed(3)),
                    weightKg: parseFloat(weightKg.toFixed(2)),
                    bmi: parseFloat(bmi.toFixed(2)),
                    bmiValue
                  });
                  
                  // BMI categories (as per image)
                  const getBMICategory = (bmi) => {
                    if (bmi < 18.5) return { label: 'Weight Deficit', color: '#3b82f6', range: [16, 18.5] };
                    if (bmi < 24) return { label: 'Norm', color: '#22c55e', range: [18.5, 24] };
                    if (bmi < 30) return { label: 'Weight Over', color: '#84cc16', range: [24, 30] };
                    if (bmi < 35) return { label: 'Obesity First Degree', color: '#fb923c', range: [30, 35] };
                    if (bmi < 40) return { label: 'Obesity Second Degree', color: '#f97316', range: [35, 40] };
                    return { label: 'Obesity Third Degree', color: '#dc2626', range: [40, 50] };
                  };
                  
                  const category = bmiValue ? getBMICategory(bmiValue) : null;
                  const minBMI = 16;
                  const maxBMI = 45;
                  const bmiPosition = bmiValue ? ((bmiValue - minBMI) / (maxBMI - minBMI)) * 100 : 0;
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
                                const viewportW = window.innerWidth || document.documentElement.clientWidth;
                                const viewportH = window.innerHeight || document.documentElement.clientHeight;
                                const estWidth = 200;   // estimated tooltip width
                                const estHeight = 120;  // estimated tooltip height
                                let x = rect.left + rect.width / 2;
                                // Clamp X inside viewport with padding
                                const padding = 12;
                                x = Math.max(padding + estWidth / 2, Math.min(viewportW - padding - estWidth / 2, x));
                                // Prefer show below; if not enough space, show above
                                const spaceBelow = viewportH - rect.bottom;
                                const y = spaceBelow > estHeight + 16 ? rect.bottom + 12 : rect.top - estHeight - 12;
                                setBmiHoveredCategory(idx);
                                setBmiTooltipPosition({ x, y });
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
                              height: '36px',
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
                                fontSize: 12,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const viewportW = window.innerWidth || document.documentElement.clientWidth;
                                const viewportH = window.innerHeight || document.documentElement.clientHeight;
                                const estWidth = 200;
                                const estHeight = 120;
                                let x = rect.left + rect.width / 2;
                                const padding = 12;
                                x = Math.max(padding + estWidth / 2, Math.min(viewportW - padding - estWidth / 2, x));
                                const spaceBelow = viewportH - rect.bottom;
                                const y = spaceBelow > estHeight + 16 ? rect.bottom + 12 : rect.top - estHeight - 12;
                                setBmiHoveredCategory('current');
                                setBmiTooltipPosition({ x, y });
                              }}
                              onMouseLeave={() => setBmiHoveredCategory(null)}
                            >
                              {bmiValue !== null && !isNaN(bmiValue) ? bmiValue.toFixed(1) : '—'}
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
                            background: 'rgba(17, 17, 17, 0.98)',
                            color: '#ffffff',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 500,
                            minWidth: '140px',
                            maxWidth: '240px',
                            zIndex: 1000,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
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
                                    background: category?.color || '#3b82f6',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)'
                                  }} />
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                                    {category?.label || 'BMI'}
                                  </div>
                                </div>
                                {category?.range && (
                                  <div style={{ 
                                    fontSize: 11, 
                                    color: '#cccccc',
                                    paddingLeft: 20,
                                    lineHeight: 1.4
                                  }}>
                                    BMI Range: <strong style={{ color: '#ffffff' }}>{category.range[0]}-{category.range[1]}</strong>
                                  </div>
                                )}
                                {bmiValue && (
                                  <div style={{ 
                                    fontSize: 11, 
                                    color: '#cccccc',
                                    paddingLeft: 20,
                                    marginTop: 4,
                                    lineHeight: 1.4
                                  }}>
                                    Your BMI: <strong style={{ color: category?.color || '#3b82f6' }}>{bmiValue.toFixed(1)}</strong>
                                  </div>
                                )}
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
                                  color: '#cccccc',
                                  paddingLeft: 20,
                                  lineHeight: 1.4
                                }}>
                                  BMI Range: <strong style={{ color: '#ffffff' }}>{categories[bmiHoveredCategory].range}</strong>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            
            </div>
            
            <div className="step-navigation">
              <button className="btn outline" onClick={prevStep}>Back</button>
              <button 
                className="btn primary" 
                onClick={nextStep}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.sexAtBirth}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 2: // Health Snapshot
        return (
          <div className="onboarding-step-content">
            <h2>Health Snapshot</h2>
            <p className="step-description">Help us understand your current health status.</p>
            
            <div className="form-fields">
              <div className="form-field">
                <label>Known Health Conditions</label>
                <input list="conditions-list" placeholder="Start typing to autocomplete..." onChange={(e)=>updateFormData('healthConditions', e.target.value)} value={formData.healthConditions} />
                <datalist id="conditions-list">
                  <option value="diabetes" />
                  <option value="hypertension" />
                  <option value="asthma" />
                  <option value="high cholesterol" />
                  <option value="thyroid disorder" />
                </datalist>
              </div>
              
              <div className="form-field">
                <label>Current Medications (Optional)</label>
                <input list="medications-list" placeholder="Start typing to autocomplete..." onChange={(e)=>updateFormData('medications', e.target.value)} value={formData.medications} />
                <datalist id="medications-list">
                  <option value="ibuprofen" />
                  <option value="acetaminophen" />
                  <option value="metformin" />
                  <option value="lisinopril" />
                  <option value="atorvastatin" />
                </datalist>
              </div>
              
              <div className="form-field">
                <label>Known Allergies (Optional)</label>
                <input list="allergies-list" placeholder="Start typing to autocomplete..." onChange={(e)=>updateFormData('allergies', e.target.value)} value={formData.allergies} />
                <datalist id="allergies-list">
                  <option value="penicillin" />
                  <option value="peanuts" />
                  <option value="shellfish" />
                  <option value="pollen" />
                  <option value="lactose" />
                </datalist>
              </div>
            </div>
            
            <div className="step-navigation">
              <button className="btn outline" onClick={prevStep}>Back</button>
              <button 
                className="btn primary" 
                onClick={nextStep}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 3: // Lifestyle & Habits
        return (
          <div className="onboarding-step-content">
            <h2>Lifestyle & Habits</h2>
            <p className="step-description">Select all that apply to your lifestyle.</p>
            
            <div className="checkbox-grid">
              {lifestyleOptions.map((option) => (
                <label key={option} className="checkbox">
                  <input
                    type="checkbox"
                    checked={formData.lifestyleHabits.includes(option)}
                    onChange={() => toggleArrayItem('lifestyleHabits', option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            
            <div className="step-navigation">
              <button className="btn outline" onClick={prevStep}>Back</button>
              <button 
                className="btn primary" 
                onClick={nextStep}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 4: // Health Goals
        return (
          <div className="onboarding-step-content">
            <h2>Health Goals</h2>
            <p className="step-description">What would you like to achieve with Anatomous?</p>
            
            <div className="checkbox-grid">
              {healthGoalOptions.map((goal) => (
                <label key={goal} className="checkbox">
                  <input
                    type="checkbox"
                    checked={formData.healthGoals.includes(goal)}
                    onChange={() => toggleArrayItem('healthGoals', goal)}
                  />
                  <span>{goal}</span>
                </label>
              ))}
            </div>
            
            <div className="form-field">
              <label>Other Goals (Optional)</label>
              <textarea
                value={formData.otherGoal}
                onChange={(e) => updateFormData('otherGoal', e.target.value)}
                placeholder="Describe any other health goals you have"
                rows={3}
              />
            </div>
            
            <div className="form-field">
              <label>Target Date (Optional)</label>
              <DatePicker
                value={formData.targetDate}
                onChange={(val) => updateFormData('targetDate', val)}
              />
            </div>
            
            <div className="form-field">
              <label>Goal Notes (Optional)</label>
              <textarea
                value={formData.goalNotes}
                onChange={(e) => updateFormData('goalNotes', e.target.value)}
                placeholder="Add any additional notes about your goals"
                rows={3}
              />
            </div>
            
            <div className="form-field">
              <label>Goal Visibility</label>
              <div className="radio-group">
                <label className="radio" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="radio"
                    name="goalVisibility"
                    value="private"
                    checked={formData.goalVisibility === 'private'}
                    onChange={(e) => updateFormData('goalVisibility', e.target.value)}
                  />
                  <span>Private - Only I can see my goals</span>
                </label>
                <label className="radio" style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="radio"
                    name="goalVisibility"
                    value="public"
                    checked={formData.goalVisibility === 'public'}
                    onChange={(e) => updateFormData('goalVisibility', e.target.value)}
                  />
                  <span>Public - Others can see my goals</span>
                </label>
              </div>
            </div>
            
            <div className="step-navigation">
              <button className="btn outline" onClick={prevStep}>Back</button>
              <button 
                className="btn primary" 
                onClick={nextStep}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 5: // Privacy Settings
        return (
          <div className="onboarding-step-content">
            <h2>Privacy Settings</h2>
            <p className="step-description">Control how your data is used and shared.</p>
            
            <div className="form-fields">
              <div className="form-field">
                <label>Who can see my data?</label>
                <select
                  value={formData.dataVisibility}
                  onChange={(e) => updateFormData('dataVisibility', e.target.value)}
                >
                  <option value="private">Private - Only I can see my data</option>
                  <option value="shareable">Shareable - I can share with healthcare providers</option>
                  <option value="export-only">Export-only - I can export my data</option>
                </select>
              </div>
              
              <div className="checkbox">
                <input
                  type="checkbox"
                  checked={formData.emailNudges}
                  onChange={(e) => updateFormData('emailNudges', e.target.checked)}
                />
                <span>Receive email nudges and insights</span>
              </div>
              
              <div className="checkbox">
                <input
                  type="checkbox"
                  checked={formData.wearableSync}
                  onChange={(e) => updateFormData('wearableSync', e.target.checked)}
                />
                <span>Enable wearable sync (coming soon)</span>
              </div>
            </div>
            
            <div className="step-navigation">
              <button className="btn outline" onClick={prevStep}>Back</button>
              <button 
                className="btn primary" 
                onClick={nextStep}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 6: // Review & Finish
        return (
          <div className="onboarding-step-content">
            <h2>Review & Finish</h2>
            <p className="step-description">Review your information and complete your setup.</p>
            
            <div className="review-sections">
              <div className="review-section">
                <h3>Personal Information</h3>
                <div className="review-content">
                  <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phoneNumber}</p>
                  <p><strong>Date of Birth:</strong> {formData.dateOfBirth}</p>
                  <p><strong>Sex:</strong> {formData.sexAtBirth}</p>
                  {formData.height && <p><strong>Height:</strong> {formData.height} cm</p>}
                  {formData.weight && <p><strong>Weight:</strong> {formData.weight} kg</p>}
                  {formData.zipCode && <p><strong>ZIP Code:</strong> {formData.zipCode}</p>}
                </div>
                <button className="btn ghost small" onClick={() => goToStep(1)}>Edit</button>
              </div>
              
              <div className="review-section">
                <h3>Health Information</h3>
                <div className="review-content">
                  {formData.healthConditions && <p><strong>Health Conditions:</strong> {formData.healthConditions}</p>}
                  {formData.medications && <p><strong>Medications:</strong> {formData.medications}</p>}
                  {formData.allergies && <p><strong>Allergies:</strong> {formData.allergies}</p>}
                </div>
                <button className="btn ghost small" onClick={() => goToStep(2)}>Edit</button>
              </div>
              
              <div className="review-section">
                <h3>Health Goals</h3>
                <div className="review-content">
                  {formData.healthGoals.length > 0 && (
                    <p><strong>Selected Goals:</strong> {formData.healthGoals.join(', ')}</p>
                  )}
                  {formData.otherGoal && <p><strong>Other Goals:</strong> {formData.otherGoal}</p>}
                  {formData.targetDate && <p><strong>Target Date:</strong> {formData.targetDate}</p>}
                  {formData.goalNotes && <p><strong>Goal Notes:</strong> {formData.goalNotes}</p>}
                  <p><strong>Goal Visibility:</strong> {formData.goalVisibility === 'private' ? 'Private' : 'Public'}</p>
                </div>
                <button className="btn ghost small" onClick={() => goToStep(4)}>Edit</button>
              </div>
              
              <div className="review-section">
                <h3>Lifestyle & Habits</h3>
                <div className="review-content">
                  {formData.lifestyleHabits.length > 0 && (
                    <p><strong>Lifestyle Habits:</strong> {formData.lifestyleHabits.join(', ')}</p>
                  )}
                </div>
                <button className="btn ghost small" onClick={() => goToStep(3)}>Edit</button>
              </div>
              
              <div className="review-section">
                <h3>Privacy Settings</h3>
                <div className="review-content">
                  <p><strong>Data Visibility:</strong> {formData.dataVisibility}</p>
                  <p><strong>Email Nudges:</strong> {formData.emailNudges ? 'Yes' : 'No'}</p>
                  <p><strong>Wearable Sync:</strong> {formData.wearableSync ? 'Yes' : 'No'}</p>
                </div>
                <button className="btn ghost small" onClick={() => goToStep(5)}>Edit</button>
              </div>
            </div>
            
            <div className="step-navigation">
              <button className="btn outline" onClick={prevStep}>Back</button>
              <button 
                className="btn success large" 
                onClick={completeOnboardingProcess}
                disabled={loading}
              >
                {loading ? 'Completing Setup...' : 'Complete Setup & Go to Dashboard'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="onboarding-layout">
      {/* Header */}
      <header className="onboarding-header">
        <div className="header-left">
          <Logo height={32} />
        </div>
        
        <div className="header-center">
          <div className="progress-indicator">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="header-right">
          <button className="btn ghost small" onClick={finishLater}>
            Finish Later
          </button>
          <button className="btn ghost small" onClick={() => window.open('https://crisp.chat', '_blank')}>
            Help
          </button>
          <button className="btn ghost small" onClick={() => navigate('/logout')}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="onboarding-content">
        {/* Left Sidebar */}
        <aside className="onboarding-sidebar">
          <nav className="steps-navigation">
            {steps.map((step, index) => {
              // Enable the last "Review & Finish" step once all previous are completed
              const allPreviousCompleted = Array.from({ length: index }).every((_, i) => completedSteps.has(i));
              const isReviewStep = index === steps.length - 1;
              const isDisabled = isReviewStep
                ? !allPreviousCompleted // allow review once all previous are done
                : (index > currentStep && !completedSteps.has(index));
              return (
              <button
                key={step.id}
                className={`step-item ${index === currentStep ? 'active' : ''} ${completedSteps.has(index) ? 'completed' : ''}`}
                onClick={() => goToStep(index)}
                disabled={isDisabled}
                aria-label={`${index + 1}. ${step.title}${step.description ? ' — ' + step.description : ''}`}
                title={`${index + 1}. ${step.title}${step.description ? ' — ' + step.description : ''}`}
                aria-current={index === currentStep ? 'step' : undefined}
              >
                <div className="step-number">
                  {completedSteps.has(index) ? '✓' : index + 1}
                </div>
                <div className="step-info">
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">{step.description}</div>
                </div>
              </button>
            )})}
          </nav>
        </aside>

        {/* Main Panel */}
        <main className="onboarding-main">
          {renderStepContent()}
        </main>
      </div>

      {/* Footer */}
      <footer className="onboarding-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span>© 2025 Anatomous</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          </div>
          <div className="footer-right">
            <a href="https://crisp.chat" target="_blank" rel="noopener noreferrer">Need Help?</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingLayout;
