import React, { useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './ChatbotPage.css';
import SpotlightCard from '../components/SpotlightCard';
import { chatbotService } from '../services/api';

function ChatbotPage({ showToast }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I\'m your mental health companion. How are you feeling today?', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef(null);
  const suggestedPrompts = [
    'I\'m feeling anxious about work',
    'How can I improve my sleep?',
    'I need stress management tips',
    'Tell me about meditation',
  ];

  useEffect(() => {
    const fetchMessages = async () => {

      try {
        const response = await chatbotService.getMessages();
        setMessages([...messages, ...response.data?.messages]);
      } catch (err) {
        showToast("Unable to load messages.", "error");
      }

    }
    fetchMessages();
  }, [])

   useEffect(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMessage = {
      // id: messages.length + 1,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await chatbotService.sendMessage(userMessage);
      setMessages([...messages, userMessage, response.data?.botReply])
    } catch {
      showToast("Error! Unable to get response.");
      setMessages(messages.slice(0, messages.length -2));
    } finally {
      setIsLoading(false);
    }

  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-container">
  
        <div className="chat-header">
          <h1>Mental Health Chatbot</h1>
          <p>Your 24/7 support companion</p>
        </div>


        <SpotlightCard className="chat-card" angle={1}>
          <div className="messages-area" ref={chatRef}>
            {messages.map((msg, _i) => (
              <div key={_i} className={`message message-${msg.sender}`}>
                <div className="message-content">
                  {msg.sender === 'bot' && <span className="bot-icon">🤖</span>}
                  <div className="message-text">{msg.text}</div>
                  {msg.sender === 'user' && <span className="user-icon">👤</span>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message message-bot">
                <div className="message-content">
                  <span className="bot-icon">🤖</span>
                  <div className="message-text typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            {messages.length <= 1 && (
              <div className="suggested-prompts">
                <p>Try asking:</p>
                <div className="prompts-grid">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="prompt-btn"
                      onClick={() => handleSend(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="chat-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Share your thoughts..."
                className="chat-input"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                Send
              </Button>
            </form>
          </div>
        </SpotlightCard>

        {/* Suggestions */}
        <div className="chat-info">
          <p>💡 Tip: For serious concerns, please book an appointment with a professional therapist</p>
        </div>
      </div>

      
    </div>
  );
}

export default ChatbotPage;
