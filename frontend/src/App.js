import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginSignupPage from './pages/LoginSignupPage';
import Dashboard from './pages/Dashboard';
import JournalMoodTracker from './pages/JournalMoodTracker';
import MoodInsights from './pages/MoodInsights';
import ChatbotPage from './pages/ChatbotPage';
import CommunitySupport from './pages/CommunitySupport';
import AppointmentBooking from './pages/AppointmentBooking';
import TherapistListing from './pages/TherapistListing';
import ResourcesPage from './pages/ResourcesPage';
import EmergencySupport from './pages/EmergencySupport';
import ProfileSettings from './pages/ProfileSettings';
import Toast from './components/Toast';

import api from './services/api';
import TherapistSignup from './pages/TherapistSignup';
import Assessment from './pages/Assessment';
import PersonalChat from './pages/PersonalChat';

import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { autoConnect: false });

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  
  const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
    }
    return children;
  };
  const fetchUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  };
  useEffect(() => {

    const token = localStorage.getItem("token");
    if (!token) {
      setLoadingAuth(false);
      return;
    }
    
    fetchUser();

  }, []);

  useEffect(() => {
    if (!user) return; 

    socket.connect();

    socket.on('connect', () => {
      console.log("Connected user:", socket.id);

      socket.emit("join_user", user.id);
    });

    return () => {
      socket.off('connect');
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };


  if (loadingAuth) {
    return <div style={{ color: "white", padding: "20px" }}>Loading...</div>;
  }

  return ( 
  <Router> 
    <div className="App"> 
      <Navbar
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <LoginSignupPage
                setUser={setUser}
                setIsAuthenticated={setIsAuthenticated}
                showToast={showToast}
              />
            )
          }
        />
        <Route 
          path='/therapist-signup'
          element={
            <TherapistSignup 
                setUser={setUser}
                setIsAuthenticated={setIsAuthenticated}
                showToast={showToast}/>

          }
          ></Route>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard user={user} showToast={showToast} socket={socket} />
            </ProtectedRoute>
          }
        />
        {user?.role === "user" && 
          <>
            <Route
              path="/journal"
              element={
                <ProtectedRoute>
                  <JournalMoodTracker user={user} showToast={showToast} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment"
              element={
                <ProtectedRoute>
                  <Assessment  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/insights"
              element={<MoodInsights user={isAuthenticated ? user : null} />}
            />

            <Route
              path="/chatbot"
              element={
                <ProtectedRoute>
                  <ChatbotPage user={user} showToast={showToast}/>
                </ProtectedRoute>
              }
            />
          </>
        }

        <Route
          path="/community"
          element={
            <CommunitySupport
              isAuthenticated={isAuthenticated}
              user={user}
              showToast={showToast}
            />
          }
        />

        <Route
          path="/appointment"
          element={
            <ProtectedRoute>
              <AppointmentBooking user={user} showToast={showToast} socket={socket} />
            </ProtectedRoute>
          }
        />

        <Route path="/therapists" element={<TherapistListing />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/emergency" element={<EmergencySupport />} />
        <Route path="/chat/:id" element={
          <ProtectedRoute>
            <PersonalChat user={user} showToast={showToast} socket={socket}/>
          </ProtectedRoute>
        }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileSettings user={user} showToast={showToast} />
            </ProtectedRoute>
          }
        />
      </Routes>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  </Router>


  );
}

export default App;
