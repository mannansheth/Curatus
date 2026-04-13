import React, { useState, useEffect, useRef } from 'react';
import './CommunitySupport.css';
import { appointmentService } from '../services/api';
import UserAvatar from '../components/UserAvatar';
import { useLocation, useParams } from 'react-router-dom';

import { FaCheckDouble } from 'react-icons/fa6';

const REACTIONS = ['❤️', '🤗', '💪', '😢', '🙏', '👋'];


function PersonalChat({ user, showToast, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatWith, setChatWith] = useState("")
  const chatRef = useRef(null);
  const { id } = useParams();
  const aptId = atob(id);
  const fetchMessages = async () => {
    try {
      const res = await appointmentService.getMessages(aptId);
      setChatWith(res.data?.chatWith);
      setMessages(res.data.messages || []);

      chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join_chat', { aptId, userId: user.id });
    socket.emit("mark_read", {
      aptId,
      userId: user.id,

    });

    const handleReceive = (data) => {
      if (data.sentBy === user.id) return;
      setMessages(prev => [...prev, data]);
      socket.emit("mark_read", {
        aptId,
        userId: user.id,
      });
    };

    const handleRead = ({ readBy }) => {
      if (readBy === user.id) return;
      setMessages(prev =>
        prev.map(msg =>
          msg.isOwn ? { ...msg, status: "read" } : msg
        )
      );
    };

    socket.on('receive_message', handleReceive);
    socket.on('messages_read', handleRead);

    fetchMessages();

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('messages_read', handleRead);
    };
  }, [aptId, user.id]);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      showToast('Message cannot be empty', 'warning');
      return;
    }
    const message = {
      content: input,
      createdAt: new Date(),
      isOwn: true,
      status:"delivered"
    };
    try {
      const response = await appointmentService.sendMessage(message, aptId);
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

  return (
    <div className="chat-page">
      <div className="chat-container">

        <div className="chat-header">
          <div className="chat-header-inner">
            <UserAvatar name={chatWith} />
            <div>
              <h2 style={{textAlign:"left"}}>{chatWith}</h2>
              <p>Chat with your therapist before the appointment</p>
            </div>
          </div>
        </div>

        <div className="chat-messages" ref={chatRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <span></span>
              <p>No messages yet. Be the first to say something.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble-wrap ${msg.isOwn ? 'own' : ''}`}>
              <div className={`chat-bubble ${msg.isOwn ? 'own' : ''}`}>
                <div className="chat-meta">
                  <span className="chat-author">{msg.name}</span>
                  <span className="chat-time">{new Date(msg.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                </div>
                <div className="chat-text">{msg.content}</div>
              </div>
                {i === messages.length - 1 && msg.isOwn && <span className='status' style={{color:"lightgrey", fontSize:"10px"}}><FaCheckDouble size={18} color={msg.status === "read" ? "blue" : "lightgrey"}></FaCheckDouble></span>}
            </div>
          ))}
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>

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

export default PersonalChat;