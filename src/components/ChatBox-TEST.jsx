import React, { useState, useRef, useEffect } from 'react';
import useOpenAI from '../hooks/useOpenAI';
import { useTheme } from '../contexts/ThemeContext.jsx';
import "../routes/pages/InsightsPage-TEST-CSS.css";

const ChatComponent = ({ sharedHook }) => {
  const { isLight } = useTheme();
  const [inputMessage, setInputMessage] = useState('');
  const [chatIdInput, setChatIdInput] = useState('');
  const [showChatSelector, setShowChatSelector] = useState(false);
  const [previousQueries, setPreviousQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [showPreviousQueries, setShowPreviousQueries] = useState(false);
  
  // Use shared hook if provided, otherwise use own instance
  const hookInstance = sharedHook || useOpenAI();
  const { 
    loading, 
    error, 
    conversation, 
    sendMessage, 
    clearConversation,
    currentChatId,
    loadChat,
    loadPreviousQueries
  } = hookInstance;
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showDisclaimer] = useState(true);
  const prevConversationLengthRef = useRef(0);

  const scrollToBottom = () => {
    // Scroll only within the messages container, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    // Only scroll if conversation length increased (new message added)
    // Don't scroll on initial load or when loading previous chat
    const currentLength = conversation.length;
    const prevLength = prevConversationLengthRef.current;
    
    if (currentLength > prevLength && currentLength > 0) {
      // Only scroll if a new message was added (not initial load)
      scrollToBottom();
    }
    
    prevConversationLengthRef.current = currentLength;
  }, [conversation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    await sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLoadChat = async () => {
    if (chatIdInput.trim()) {
      await loadChat(chatIdInput.trim());
      // Load previous queries list
      setLoadingQueries(true);
      const queries = await loadPreviousQueries(chatIdInput.trim());
      setPreviousQueries(queries);
      setLoadingQueries(false);
      setChatIdInput('');
      setShowChatSelector(false);
      setShowPreviousQueries(true);
    }
  };

  const handleNewChat = () => {
    clearConversation();
    setShowChatSelector(false);
    setChatIdInput('');
    setPreviousQueries([]);
    setShowPreviousQueries(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMetrics = (metrics) => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return null;
    }
    return metrics.map(m => `${m.metric_type}: ${m.value}`).join(', ');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>AI Health Assistant</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {currentChatId && (
            <div style={{ 
              fontSize: 11, 
              color: 'var(--muted)', 
              padding: '4px 8px',
              background: 'rgba(0, 186, 206, 0.1)',
              borderRadius: 4
            }}>
              Chat: {String(currentChatId).slice(0, 8)}...
            </div>
          )}
          <button 
            onClick={() => setShowChatSelector(!showChatSelector)} 
            className="clear-btn"
            style={{ fontSize: 12 }}
          >
            {showChatSelector ? 'Hide' : 'Load Chat'}
          </button>
          <button onClick={handleNewChat} className="clear-btn">
            New Chat
          </button>
        </div>
      </div>

      {showChatSelector && (
        <div style={{
          padding: 12,
          margin: 12,
          background: "rgba(0, 186, 206, 0.1)",
          border: "1px solid rgba(0, 186, 206, 0.3)",
          borderRadius: 8,
          display: 'flex',
          gap: 8,
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={chatIdInput}
            onChange={(e) => setChatIdInput(e.target.value)}
            placeholder="Enter chat ID to load previous queries"
            style={{
              flex: 1,
              padding: "8px 12px",
              background: isLight ? "rgba(249, 250, 251, 0.8)" : "rgba(17,17,17,.85)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLoadChat();
              }
            }}
          />
          <button
            onClick={handleLoadChat}
            disabled={!chatIdInput.trim() || loading || loadingQueries}
            className="btn primary"
            style={{ 
              padding: "8px 16px",
              fontSize: 13,
              whiteSpace: 'nowrap'
            }}
          >
            {loadingQueries ? 'Loading...' : 'Load'}
          </button>
        </div>
      )}

      {showPreviousQueries && previousQueries.length > 0 && (
        <div style={{
          margin: 12,
          padding: 12,
          background: isLight ? "rgba(241, 243, 245, 0.6)" : "rgba(17,17,17,.5)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          maxHeight: "300px",
          overflowY: "auto"
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Previous Queries</h3>
            <button
              onClick={() => setShowPreviousQueries(false)}
              className="btn ghost small"
              style={{ fontSize: 11 }}
            >
              Hide
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {previousQueries.map((query, index) => (
              <div
                key={query.id || index}
                style={{
                  padding: 12,
                  background: "rgba(0, 186, 206, 0.05)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 186, 206, 0.1)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 186, 206, 0.05)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
                onClick={() => {
                  // Load detailed insights for this chat
                  if (query.chat_id) {
                    console.log('🔄 Loading insights for chat_id:', query.chat_id);
                    loadChat(String(query.chat_id));
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                  gap: 8
                }}>
                  <div style={{ flex: 1 }}>
                    {query.title && (
                      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                        {query.title}
                      </div>
                    )}
                    <div style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 6
                    }}>
                      {formatDate(query.created_at)}
                    </div>
                    {query.metrics && query.metrics.length > 0 && (
                      <div style={{
                        fontSize: 11,
                        color: "var(--primary)",
                        marginBottom: 6,
                        padding: "4px 8px",
                        background: "rgba(0, 186, 206, 0.1)",
                        borderRadius: 4,
                        display: 'inline-block'
                      }}>
                        {formatMetrics(query.metrics)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  fontSize: 13,
                  color: "var(--text)",
                  lineHeight: 1.5,
                  maxHeight: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical"
                }}>
                  {query.description || 'No description'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDisclaimer && conversation.length === 0 && (
        <div style={{
          background: "rgba(0, 186, 206, 0.1)",
          border: "1px solid rgba(0, 186, 206, 0.3)",
          borderRadius: 8,
          padding: 12,
          margin: 12,
          fontSize: 12,
          color: "var(--muted)"
        }}>
          <strong>Important:</strong> This AI assistant provides general health information and educational content only. 
          It is not a substitute for professional medical advice. For specific health concerns, please consult with a healthcare professional.
        </div>
      )}

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="messages-container" ref={messagesContainerRef}>
        {conversation.length === 0 ? (
          <div className="empty-state">
            <p>Ask a question to start the conversation!</p>
          </div>
        ) : (
          conversation.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">
                {msg.created_at && (
                  <div style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    marginBottom: 6,
                    opacity: 0.7
                  }}>
                    {formatDate(msg.created_at)}
                  </div>
                )}
                {msg.metrics && msg.metrics.length > 0 && (
                  <div style={{
                    fontSize: 11,
                    color: "var(--primary)",
                    marginBottom: 8,
                    padding: "4px 8px",
                    background: "rgba(0, 186, 206, 0.1)",
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    {formatMetrics(msg.metrics)}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            disabled={loading}
            rows={3}
            className="message-input"
          />
          <button 
            type="submit" 
            disabled={loading || !inputMessage.trim()}
            className="send-button"
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
