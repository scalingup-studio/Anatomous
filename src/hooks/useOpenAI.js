// hooks/useOpenAI.js
import { useState, useCallback } from 'react';
import { InsightApi } from '../api/insightApi';
import { CheckQueryApi } from '../api/checkQueryApi';
import { useAuth } from '../api/AuthContext';

const useOpenAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [previousChats, setPreviousChats] = useState([]);
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
        // For new chat, send chat_id: null; for existing chat, send the chat_id (integer)
        // Always send chat_id if it exists (not null/undefined), even if it's 0
        let chatIdToSend = null;
        if (currentChatId !== null && currentChatId !== undefined) {
          // Convert to integer if it's a string or number
          chatIdToSend = typeof currentChatId === 'string' 
            ? (parseInt(currentChatId, 10) || 0) 
            : (typeof currentChatId === 'number' ? currentChatId : 0);
        }
        
        console.log('📤 Sending message with chat_id:', chatIdToSend, '(currentChatId:', currentChatId, ')');
        
        response = await InsightApi.generateInsight({
          query: message,
          metrics: {}, // Add user metrics if available
          chat_id: chatIdToSend // null for new chats, or integer for existing chats
        });
        
        console.log('✅ generate-insight response:', response);
        
        // If response contains chat_id, update currentChatId
        // Check multiple possible locations for chat_id
        const newChatId = response?.chat_id !== undefined && response?.chat_id !== null
          ? response.chat_id
          : (response?.result?.chat_id !== undefined && response?.result?.chat_id !== null
            ? response.result.chat_id
            : (response?.data?.chat_id !== undefined && response?.data?.chat_id !== null
              ? response.data.chat_id
              : (response?.chatId !== undefined && response?.chatId !== null
                ? response.chatId
                : null)));
        
        if (newChatId !== null && newChatId !== undefined) {
          console.log('🔄 Updating currentChatId to:', newChatId);
          setCurrentChatId(newChatId);
        }
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
    setCurrentChatId(null);
  }, []);

  const loadChat = useCallback(async (chatId) => {
    if (!chatId) {
      setConversation([]);
      setCurrentChatId(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await InsightApi.getInsight(chatId);
      
      // Parse the response structure: { result: [...] }
      // Each item in result array has: id, created_at, description, data_sources, chat_id
      let insights = [];
      
      if (response?.result && Array.isArray(response.result)) {
        insights = response.result;
      } else if (Array.isArray(response)) {
        insights = response;
      } else if (response?.messages && Array.isArray(response.messages)) {
        insights = response.messages;
      } else if (response?.conversation && Array.isArray(response.conversation)) {
        insights = response.conversation;
      }
      
      // Convert insights array to conversation messages
      // Sort by created_at (oldest first) to show chronological order
      const sortedInsights = insights.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeA - timeB;
      });
      
      // Map insights to conversation format as dialog
      // Each insight has: title (user question) and description (AI response)
      const normalizedMessages = [];
      
      sortedInsights.forEach(insight => {
        // Add user message (question) if title exists
        if (insight.title && insight.title.trim()) {
          normalizedMessages.push({
            role: 'user',
            content: insight.title,
            id: insight.id ? `user-${insight.id}` : undefined,
            created_at: insight.created_at,
            chat_id: insight.chat_id
          });
        }
        
        // Add assistant message (answer) if description exists
        if (insight.description && insight.description.trim()) {
          normalizedMessages.push({
            role: 'assistant',
            content: insight.description || insight.content || insight.message || '',
            id: insight.id,
            created_at: insight.created_at,
            metrics: insight.data_sources?.metrics || [],
            chat_id: insight.chat_id
          });
        }
      });
      
      setConversation(normalizedMessages);
      setCurrentChatId(chatId);
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load chat history');
      setConversation([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load list of previous queries/insights for display
  const loadPreviousQueries = useCallback(async (chatId) => {
    if (!chatId) {
      return [];
    }

    try {
      const response = await InsightApi.getInsight(chatId);
      
      // Parse the response structure: { result: [...] }
      let insights = [];
      
      if (response?.result && Array.isArray(response.result)) {
        insights = response.result;
      } else if (Array.isArray(response)) {
        insights = response;
      }
      
      // Sort by created_at (newest first) for display
      const sortedInsights = insights.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeB - timeA; // Newest first
      });
      
      return sortedInsights.map(insight => ({
        id: insight.id,
        created_at: insight.created_at,
        description: insight.description || '',
        metrics: insight.data_sources?.metrics || [],
        chat_id: insight.chat_id,
        title: insight.title || ''
      }));
    } catch (err) {
      console.error('Error loading previous queries:', err);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    conversation,
    sendMessage,
    clearConversation,
    currentChatId,
    setCurrentChatId,
    loadChat,
    loadPreviousQueries,
    previousChats,
    setPreviousChats
  };
};

export default useOpenAI;