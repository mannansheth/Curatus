import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar({ isAuthenticated, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) =>
  path === "/" 
    ? location.pathname === "/" 
    : location.pathname.startsWith(path);

  const getClass = (path) =>
    `nav-link ${isActive(path) ? "active" : ""}`;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
        <img src="/images/logo2.png" width={200} height={100}></img>
          {/* <span className="brand-text">Curatus</span> */}
        </Link>

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? 'active' : ''}`}></span>
        </button>

        <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>

          {!isAuthenticated && (
            <>
              <Link to="/" className={getClass("/")} onClick={() => setMenuOpen(false)}>
                Home
              </Link>

              <Link
                to="/community"
                className={getClass("/community")}
                onClick={() => setMenuOpen(false)}
              >
                Community
              </Link>

              <Link
                to="/therapists"
                className={getClass("/therapists")}
                onClick={() => setMenuOpen(false)}
              >
                Therapists
              </Link>

              <Link
                to="/resources"
                className={getClass("/resources")}
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
                className={getClass("/dashboard")}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>

              {user.role === "user" && (
                <>
                  <Link
                    to="/journal"
                    className={getClass("/journal")}
                    onClick={() => setMenuOpen(false)}
                  >
                    Journal
                  </Link>

                  <Link
                    to="/insights"
                    className={getClass("/insights")}
                    onClick={() => setMenuOpen(false)}
                  >
                    Insights
                  </Link>

                  <Link
                    to="/chatbot"
                    className={getClass("/chatbot")}
                    onClick={() => setMenuOpen(false)}
                  >
                    Chat
                  </Link>
                </>
              )}

              <Link
                to="/appointment"
                className={getClass("/appointment")}
                onClick={() => setMenuOpen(false)}
              >
                Appointments
              </Link>

              <Link
                to="/community"
                className={getClass("/community")}
                onClick={() => setMenuOpen(false)}
              >
                Community
              </Link>

              <Link
                to="/profile"
                className={getClass("/profile")}
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