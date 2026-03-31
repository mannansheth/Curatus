import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ isAuthenticated, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          
          <span className="brand-text">MindCare</span>
        </Link>

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? 'active' : ''}`}></span>
        </button>

        <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          {!isAuthenticated && (
            <>
              <Link
                to="/community"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Community
              </Link>
              <Link
                to="/therapists"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Therapists
              </Link>
              <Link
                to="/resources"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Resources
              </Link>
              <Link to="/login" className="nav-link btn btn-primary">
                Sign In
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/journal"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Journal
              </Link>
              <Link
                to="/insights"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Insights
              </Link>
              <Link
                to="/chatbot"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Chat
              </Link>
              <Link
                to="/appointment"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Appointments
              </Link>
              <Link
                to="/community"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Community
              </Link>
              <Link
                to="/profile"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="nav-link btn btn-danger"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
