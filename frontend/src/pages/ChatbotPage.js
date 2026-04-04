import React, { useState } from 'react';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './ChatbotPage.css';

function ChatbotPage({ user }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! I\'m your mental health companion. How are you feeling today?', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestedPrompts = [
    'I\'m feeling anxious about work',
    'How can I improve my sleep?',
    'I need stress management tips',
    'Tell me about meditation',
  ];

  const handleSend = (text = input) => {
    if (!text.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        sender: 'bot',
        text: 'Thank you for sharing that with me. I understand how you\'re feeling. Here are some strategies that might help: 1) Practice breathing exercises, 2) Take short breaks, 3) Talk to someone you trust. Would you like to know more about any of these?',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="chatbot-page">
      <div className="chatbot-container">
        {/* Chat Header */}
        <div className="chat-header">
          <h1>Mental Health Chatbot</h1>
          <p>Your 24/7 support companion</p>
        </div>

        {/* Messages Area */}
        <Card className="chat-card">
          <div className="messages-area">
            {messages.map((msg) => (
              <div key={msg.id} className={`message message-${msg.sender}`}>
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
        </Card>

        {/* Suggestions */}
        <div className="chat-info">
          <p>💡 Tip: For serious concerns, please book an appointment with a professional therapist</p>
        </div>
      </div>

      
    </div>
  );
}

export default ChatbotPage;
