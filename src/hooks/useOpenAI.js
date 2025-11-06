// hooks/useOpenAI.js
import { useState, useCallback } from 'react';
import { InsightApi } from '../api/insightApi';
import { CheckQueryApi } from '../api/checkQueryApi';
import { useAuth } from '../api/AuthContext';

const useOpenAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const { user } = useAuth();

  // Emergency keywords detection
  const EMERGENCY_KEYWORDS = [
    "severe chest pain", "can't breathe", "suicidal", "overdose", "bleeding won't stop",
    /severe chest pain/i, /can'?t breathe/i, /suicid/i, /overdose/i, /bleeding that won'?t stop/i
  ];

  const EMERGENCY_FALLBACK_MESSAGES = [
    "I understand you're experiencing concerning symptoms. It's important to seek immediate medical attention. Please call your local emergency services or go to the nearest emergency room.",
    "Your symptoms suggest you need urgent medical care. Please contact emergency services right away - your health is the priority.",
    "For immediate health concerns, please reach out to a healthcare professional or emergency services. This assistant cannot provide emergency medical advice."
  ];

  const GENERAL_FALLBACK_MESSAGES = [
    "I'm here to help with general health information and wellness tips. For specific medical concerns, please consult with a healthcare professional.",
    "I can provide educational health information to help you understand general health topics. For personalized medical advice, please speak with your doctor.",
    "Let's discuss general health and wellness topics. For specific symptoms or medical questions, consulting a healthcare professional is recommended."
  ];

  const checkEmergencyContent = useCallback((input) => {
    const emergencyPatterns = [
      /severe chest pain/i,
      /can'?t breathe/i,
      /suicid/i,
      /overdose/i,
      /bleeding that won'?t stop/i
    ];
    
    return emergencyPatterns.some(pattern => pattern.test(input));
  }, []);

  const getRandomMessage = (messages) => {
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const sendMessage = useCallback(async (message) => {
    
    setLoading(true);
    setError(null);
    
    try {
      // Add user message to conversation immediately
      const userMessage = { role: 'user', content: message };
      setConversation(prev => [...prev, userMessage]);
      
      // Check for emergency content
      if (checkEmergencyContent(message)) {
        const fallbackResponse = getRandomMessage(EMERGENCY_FALLBACK_MESSAGES);
        setConversation(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
        setLoading(false);
        return fallbackResponse;
      }

      // Check if user is logged in and has auth token
      if (!user || !user.id) {
        const fallbackResponse = "Please log in to use the AI Health Assistant. This feature requires authentication to provide secure and personalized health insights.";
        setConversation(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
        setError('Authentication required');
        setLoading(false);
        return fallbackResponse;
      }

      // First: validate the query via /check_query
      let shouldGenerate = false;
      try {
        const check = await CheckQueryApi.checkQuery(message);
        try { console.log('✅ check_query raw:', check); } catch {}
        // Normalize nested structures: some backends wrap data in { response: { ... } }
        const payload = (check && typeof check === 'object' && ('response' in check)) ? check.response : check;
        try { console.log('✅ check_query payload:', payload); } catch {}
        const isAllowed = !!(payload && (
          payload.success === true ||
          payload.allowed === true ||
          payload.ok === true ||
          payload.validation_passed === true
        ));
        if (isAllowed) {
          // Allowed → proceed to generate insight
          shouldGenerate = true;
          try { console.log('➡️ check_query OK — proceeding to generate-insight'); } catch {}
        } else {
          // Not allowed → DO NOT generate; respond with backend message (or generic)
          const decline = (payload?.response && payload.response.message) || payload?.message || payload?.reason || "I'm unable to answer that request.";
          setConversation(prev => [...prev, { role: 'assistant', content: decline }]);
          setLoading(false);
          return decline;
        }
      } catch (checkErr) {
        // If check_query fails (network/5xx), DO NOT generate per new rule; return error guidance
        try { console.warn('⚠️ check_query failed, not generating:', checkErr?.message || checkErr); } catch {}
        const msg = "I couldn't validate your request at the moment. Please try again in a minute.";
        setConversation(prev => [...prev, { role: 'assistant', content: msg }]);
        setLoading(false);
        return msg;
      }

      // Generate insight using InsightApi
      let response;
      if (!shouldGenerate) {
        // If we already returned above for OK case, code won't reach here. Safety guard.
        setLoading(false);
        return "";
      }
      try {
        response = await InsightApi.generateInsight({
          query: message,
          metrics: [] // Add user metrics if available
        });
      } catch (apiError) {
        console.error('API Error:', apiError);
        // If it's a 401 even after refresh, show auth error
        if (apiError.status === 401) {
          const authError = "Unable to authenticate. Please try logging in again.";
          setConversation(prev => [...prev, { role: 'assistant', content: authError }]);
          setError('Authentication failed');
          setLoading(false);
          return authError;
        }
        throw apiError;
      }

      if (response && response.result) {
        // Safely extract content from various possible response formats
        let insightContent = null;
        
        // Try different fields that might contain the response
        const possibleFields = [
          response.result.description,
          response.result.educational_insight,
          response.result.response,
          response.result.message,
          response.result.content
        ];
        
        for (const field of possibleFields) {
          if (field) {
            // If it's a string, use it directly
            if (typeof field === 'string') {
              insightContent = field;
              break;
            }
            // If it's an object, try to extract a string from it
            if (typeof field === 'object' && field.message) {
              insightContent = field.message;
              break;
            }
          }
        }
        
        // Fallback if nothing found
        if (!insightContent) {
          insightContent = "I'd be happy to help you learn more about general health topics.";
        }
        
        setConversation(prev => [...prev, { role: 'assistant', content: insightContent }]);
        return insightContent;
      } else {
        // Fallback to general message
        const fallbackResponse = getRandomMessage(GENERAL_FALLBACK_MESSAGES);
        setConversation(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
        return fallbackResponse;
      }
    } catch (err) {
      console.error('Error generating insight:', err);
      
      // Handle authentication errors
      if (err.status === 401 || err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        const authErrorResponse = "I apologize, but there was an authentication issue. Please try logging out and logging back in, or refresh the page.";
        setConversation(prev => [...prev, { role: 'assistant', content: authErrorResponse }]);
        setError('Authentication failed - please log in again');
        return authErrorResponse;
      }
      
      // Handle network errors
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        const networkErrorResponse = "I'm having trouble connecting to the server. Please check your internet connection and try again.";
        setConversation(prev => [...prev, { role: 'assistant', content: networkErrorResponse }]);
        setError('Network error');
        return networkErrorResponse;
      }
      
      // Fallback message on error
      const fallbackResponse = getRandomMessage(GENERAL_FALLBACK_MESSAGES);
      setConversation(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
      setError('Failed to generate response');
      return fallbackResponse;
    } finally {
      setLoading(false);
    }
  }, [user, checkEmergencyContent]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setError(null);
  }, []);

  return {
    loading,
    error,
    conversation,
    sendMessage,
    clearConversation
  };
};

export default useOpenAI;