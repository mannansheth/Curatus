import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './LoginSignupPage.css';
import './TherapistSignup.css';
import { authService } from '../services/api';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

const SPECIALIZATIONS = [
  'Anxiety & Stress',
  'Depression',
  'Trauma & PTSD',
  'Relationships & Family',
  'Addiction & Substance Abuse',
  'Grief & Loss',
  'Child & Adolescent',
  'Career & Life Coaching',
  'Eating Disorders',
  'OCD',
  'Bipolar Disorder',
  'Other',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const INITIAL_FORM = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  specialization: '',
  yearsOfExperience: '',
  bio: '',
  city: '',
  address: '',
  consultationFee: '',
  mode: '',
  availableDays: [],
  startTime: '',
  endTime: '',
  degree: '',
  certifications: '',
};

function TherapistSignup({ showToast, setIsAuthenticated, setUser }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const already = prev.availableDays.includes(day);
      return {
        ...prev,
        availableDays: already
          ? prev.availableDays.filter((d) => d !== day)
          : [...prev.availableDays, day],
      };
    });
    setErrors((prev) => ({ ...prev, availableDays: '' }));
  };

  const validateForm = () => {
    const e = {};

    if (!formData.fullName.trim()) e.fullName = 'Full name is required';

    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format';

    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters';

    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';

    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.phone)) e.phone = 'Enter a valid phone number';

    if (!formData.specialization) e.specialization = 'Please select a specialization';

    if (!formData.yearsOfExperience) e.yearsOfExperience = 'Years of experience is required';
    else if (isNaN(formData.yearsOfExperience) || Number(formData.yearsOfExperience) < 0)
      e.yearsOfExperience = 'Enter a valid number';
    else if (Number(formData.yearsOfExperience) > 60)
      e.yearsOfExperience = 'Please enter a realistic value';

    if (!formData.bio.trim()) e.bio = 'Bio is required';
    else if (formData.bio.trim().length < 50) e.bio = 'Bio should be at least 50 characters';

    if (!formData.city.trim()) e.city = 'City is required';

    if (!formData.address.trim()) e.address = 'Address is required';

    if (!formData.consultationFee) e.consultationFee = 'Consultation fee is required';
    else if (isNaN(formData.consultationFee) || Number(formData.consultationFee) < 0)
      e.consultationFee = 'Enter a valid fee';

    if (!formData.mode) e.mode = 'Please select a consultation mode';

    if (formData.availableDays.length === 0) e.availableDays = 'Select at least one available day';

    if (!formData.startTime) e.startTime = 'Start time is required';
    if (!formData.endTime) e.endTime = 'End time is required';
    else if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime)
      e.endTime = 'End time must be after start time';

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // scroll to first error
      const firstErrorField = document.querySelector('.error');
      if (firstErrorField) firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        specialization: formData.specialization,
        yearsOfExperience: Number(formData.yearsOfExperience),
        bio: formData.bio.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        consultationFee: Number(formData.consultationFee),
        mode: formData.mode,
        availableDays: formData.availableDays,
        startTime: formData.startTime,
        endTime: formData.endTime,
        ...(formData.degree.trim() && { degree: formData.degree.trim() }),
        ...(formData.certifications.trim() && { certifications: formData.certifications.trim() }),
      };

      const response = await authService.registerTherapist(payload);

      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      setIsAuthenticated(true);
      showToast('Therapist account created successfully!', 'success');
      setUser({ name: response.data.user.name, email: response.data.user.email, role: response.data.user.role });
      navigate('/dashboard');
    } catch (err) {
      console.error('Therapist Signup Error:', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container therapist-layout">
        <Card className="login-card therapist-card">
          <CardContent>
            <div className="auth-header">
              <h2>Join as a Therapist</h2>
              <p className="auth-subtitle">
                Create your professional profile on MindCare
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">

              {/* ── SECTION: Account Info ── */}
              <p className="form-section-label">Account Information</p>

              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Dr. Jane Smith"
                />
                {errors.fullName && <span className="error">{errors.fullName}</span>}
              </div>

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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                  <span className="eye-button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEye size={22} /> : <FaEyeSlash size={22} />}
                  </span>
                  {errors.password && <span className="error">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                  />
                  <span className="eye-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <FaEye size={22} /> : <FaEyeSlash size={22} />}
                  </span>
                  {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
                </div>
              </div>

              {/* ── SECTION: Professional Info ── */}
              <p className="form-section-label">Professional Details</p>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="specialization">Specialization</label>
                  <select
                    id="specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">Select a specialization</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.specialization && <span className="error">{errors.specialization}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="yearsOfExperience">Years of Experience</label>
                  <input
                    type="number"
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                    min="0"
                    max="60"
                  />
                  {errors.yearsOfExperience && <span className="error">{errors.yearsOfExperience}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bio">
                  Bio
                  <span className="char-hint"> ({formData.bio.length} / 50 min)</span>
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell clients about your approach, experience and what to expect from sessions..."
                  className="form-textarea"
                  rows={4}
                />
                {errors.bio && <span className="error">{errors.bio}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="degree">Degree <span className="optional-label">(optional)</span></label>
                <input
                  type="text"
                  id="degree"
                  name="degree"
                  value={formData.degree}
                  onChange={handleChange}
                  placeholder="e.g. M.A. Clinical Psychology, MBBS"
                />
                {errors.degree && <span className="error">{errors.degree}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="certifications">Certifications <span className="optional-label">(optional)</span></label>
                <input
                  type="text"
                  id="certifications"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  placeholder="e.g. CBT Certified, RCI Licensed"
                />
                {errors.certifications && <span className="error">{errors.certifications}</span>}
              </div>

              {/* ── SECTION: Location & Fees ── */}
              <p className="form-section-label">Location & Fees</p>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru"
                />
                {errors.city && <span className="error">{errors.city}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="address">Clinic / Practice Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, area, landmark"
                />
                {errors.address && <span className="error">{errors.address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="consultationFee">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    id="consultationFee"
                    name="consultationFee"
                    value={formData.consultationFee}
                    onChange={handleChange}
                    placeholder="e.g. 1500"
                    min="0"
                  />
                  {errors.consultationFee && <span className="error">{errors.consultationFee}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="mode">Consultation Mode</label>
                  <select
                    id="mode"
                    name="mode"
                    value={formData.mode}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">Select mode</option>
                    <option value="online">Online</option>
                    <option value="in-person">In-person</option>
                    <option value="both">Both</option>
                  </select>
                  {errors.mode && <span className="error">{errors.mode}</span>}
                </div>
              </div>

              {/* ── SECTION: Availability ── */}
              <p className="form-section-label">Availability</p>

              <div className="form-group">
                <label>Available Days</label>
                <div className="days-grid">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`day-chip ${formData.availableDays.includes(day) ? 'day-chip--active' : ''}`}
                      onClick={() => handleDayToggle(day)}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {errors.availableDays && <span className="error">{errors.availableDays}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="form-time"
                  />
                  {errors.startTime && <span className="error">{errors.startTime}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="form-time"
                  />
                  {errors.endTime && <span className="error">{errors.endTime}</span>}
                </div>
              </div>

              {errors.general && (
                <span className="error" style={{ display: 'block', marginBottom: '16px' }}>
                  {errors.general}
                </span>
              )}

              <Button type="submit" size="lg" fullWidth loading={loading}>
                Create Therapist Account
              </Button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="toggle-auth" style={{ textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </div>

            <div className="therapist-link-section">
              <p>
                Looking for support?{' '}
                <Link to="/login" className="therapist-link">
                  Sign up as a User
                </Link>
              </p>
            </div>
            <p className="terms-text">
              By registering, you agree to our{' '}
              <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>
            </p>

          </CardContent>
        </Card>

        <div className="auth-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <h3>Grow Your Practice</h3>
            <p>Reach clients actively seeking mental health support</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <h3>Flexible Scheduling</h3>
            <p>Set your own hours and manage bookings with ease</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <h3>Secure Platform</h3>
            <p>HIPAA-aligned tools designed for professional practice</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TherapistSignup;