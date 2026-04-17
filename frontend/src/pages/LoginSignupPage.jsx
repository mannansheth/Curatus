import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent, CardTitle } from '../components/Card';
import './LoginSignupPage.css';
import api, { authService } from '../services/api';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import SpotlightCard from '../components/SpotlightCard';

function LoginSignupPage({setUser, showToast, setIsAuthenticated}) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    const nameRegex = /^[A-Za-z\s]{2,}$/;

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters and include letters and numbers';
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      } else if (!nameRegex.test(formData.name)) {
        newErrors.name = 'Name should contain only letters and spaces';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      let response;

      if (isLogin) {
        response = await authService.login(
          formData.email,
          formData.password
        );

        if (!response.data.success) {
          response.data.type === "email" ? setErrors({"email": response.data.message}) : setErrors({"password":response.data.message})
          
        } else {

          if (response.data && response.data.token) {
            localStorage.setItem("token", response.data.token);
          }
          setIsAuthenticated(true);
          showToast("Logged in succesfully!", "success");
          setUser({id: response.data.user.id, name:response.data.user.name, email:response.data.user.email, role:response.data.user.role});
          navigate("/dashboard");
        }

      } else {
        response = await authService.signup(
          formData.email,
          formData.password,
          formData.name
        );

        setFormData({
          email: '',
          password: '',
          name: '',
          confirmPassword: '',
        });
        if (response.data && response.data.token) {
          localStorage.setItem("token", response.data.token);
        }
        setIsAuthenticated(true);
        showToast("Registered succesfully!", "success");
        setUser({id: response.data.user.id, name:response.data.user.name, email:response.data.user.email, role:response.data.user.role});
        navigate("/dashboard");
      }


    } catch (err) {
      console.error("Auth Error:", err);


      const message =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";

      setErrors({ general: message });


    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-page">
      <div className="login-container" style={{flexDirection:isLogin ?'row':'row-reverse'}}>
        <SpotlightCard className="login-card" angle={3}>
          <CardContent>
            <div className="auth-header">
              <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="auth-subtitle">
                {isLogin
                  ? 'Sign in to your MindCare account'
                  : 'Join our community for mental wellness'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                  {errors.name && <span className="error">{errors.name}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <span className="eye-button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEye  size={22}/> : <FaEyeSlash size={22}/> }

                </span>
                {errors.password && <span className="error">{errors.password}</span>}
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                  <span className="eye-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <FaEye  size={22}/> : <FaEyeSlash size={22}/> }

                </span>
                  {errors.confirmPassword && (
                    <span className="error">{errors.confirmPassword}</span>
                  )}
                </div>
              )}

              {errors.general && (
                <span className="error" style={{ display: 'block', marginBottom: '16px' }}>
                  {errors.general}
                </span>
              )}

              {isLogin && (
                <div className="forgot-password">
                  <a href="#forgot">Forgot password?</a>
                </div>
              )}

              <Button type="submit" size="lg" fullWidth loading={loading}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            
            <div className="auth-divider">
              <span>or</span>
            </div>


            <div className="auth-footer">
              {isLogin ? (
                <p>
                  Do not have an account?{' '}
                  <button
                    type="button"
                    className="toggle-auth"
                    onClick={() => setIsLogin(false)}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="toggle-auth"
                    onClick={() => setIsLogin(true)}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
            <div className="therapist-link-section">
              <p>
                Are you a therapist?{' '}
                <Link to="/therapist-signup" className="therapist-link">
                  Register as a Therapist
                </Link>
              </p>
            </div>

            <p className="terms-text">
              By signing up, you agree to our{' '}
              <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>
            </p>

            
          </CardContent>
        </SpotlightCard>

        <div className="auth-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <h3>Track Your Mood</h3>
            <p>Monitor your emotional patterns with advanced analytics</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <h3>Connect with Experts</h3>
            <p>Book sessions with qualified mental health professionals</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <h3>Find Support</h3>
            <p>Join a compassionate community of people on their wellness journey</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginSignupPage;