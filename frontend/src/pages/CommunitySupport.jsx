import React, { useState, useEffect, useRef } from 'react';
import './CommunitySupport.css';
import { communityService } from '../services/api';

const REACTIONS = ['❤️', '🤗', '💪', '😢', '🙏', '👋'];

function CommunitySupport({ isAuthenticated, user, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [name, setName] = useState(user?.name);
  const [reactingTo, setReactingTo] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await communityService.getMessages();
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // useEffect(() => {
  //   chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  // }, [messages]);


  useEffect(() => {
    const handler = () => setReactingTo(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);


  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      showToast('Message cannot be empty', 'warning');
      return;
    }
    const message = {
    //id: Date.now(),
      content: input,
      Name: isAnonymous ? 'Anonymous' : name || 'User',
      createdAt: new Date(),
      isOwn: true,
      reactions: Object.fromEntries(REACTIONS.map((r) => [r, 0])),
      isAnonymous: isAnonymous,
      usedName: user?.name === name ? "" : name
    };

    
    try {
      const response = await communityService.sendMessage(message);
      if (!response.data.success) {
        showToast(response.data.message, "error");
        
      } else {
        setMessages((prev) => [...prev, message]);
        setInput('');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to send message', 'error');
    } 
  };

  const handleReact = async (e, msgId, emoji) => {
    e.stopPropagation();
    setReactingTo(null);

    
    try {
      const response = await communityService.addReaction(msgId, emoji);
      setMessages(response?.data?.messages)
    } catch (err) {
      console.error(err);
    } 
  };

  const togglePicker = (e, msgId) => {
    e.stopPropagation();
    setReactingTo((prev) => (prev === msgId ? null : msgId));
  };

  return (
    <div className="chat-page">
      <div className="chat-container">

        <div className="chat-header">
          <div className="chat-header-inner">
            <div className="chat-header-dot" />
            <div>
              <h2>Community Chat</h2>
              <p>Talk freely. No login required.</p>
            </div>
          </div>
        </div>

        <div className="chat-messages" ref={chatRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <span>🌱</span>
              <p>No messages yet. Be the first to say something.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.ID} className={`chat-bubble-wrap ${msg.isOwn ? 'own' : ''}`}>
              <div className={`chat-bubble ${msg.isOwn ? 'own' : ''}`}>
                <div className="chat-meta">
                  <span className="chat-author">{msg.isAnonymous === 1 ? "Anonymous" : msg.Name || "Anonymous"}</span>
                  <span className="chat-time">{new Date(msg.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                </div>
                <div className="chat-text">{msg.content}</div>

                {msg.reactions && Object.entries(msg.reactions).some(([, v]) => v > 0) && (
                  <div className="chat-reactions">
                    {Object.entries(msg.reactions)
                      .filter(([, count]) => count > 0)
                      .map(([emoji, count]) => (
                        <button
                          key={emoji}
                          className="reaction-pill"
                          onClick={(e) => handleReact(e, msg.id, emoji)}
                        >
                          {emoji} <span>{count}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {!msg.isOwn && (
                <div className="react-wrap">
                  <button
                    className="react-trigger"
                    onClick={(e) => togglePicker(e, msg.ID)}
                    title="React"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>

                  {reactingTo === msg.ID && (
                    <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className="reaction-option"
                          onClick={(e) => handleReact(e, msg.ID, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <div className="chat-options">
            <label className="anon-toggle">
              <div
                className={`toggle-track ${isAnonymous ? 'on' : ''}`}
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                <div className="toggle-thumb" />
              </div>
              <span>Anonymous</span>
            </label>

            {!isAnonymous && (
              <input
                className="name-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              className="chat-text-input"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="send-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default CommunitySupport;