import React, { useState } from 'react';
import Button from '../components/Button';
import { Card, CardContent, CardTitle } from '../components/Card';
import './ProfileSettings.css';
import SpotlightCard from '../components/SpotlightCard';

function ProfileSettings({ user }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    avatar: 'User',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    monthlyReport: true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePreferenceChange = (e) => {
    const { name, checked } = e.target;
    setPreferences({ ...preferences, [name]: checked });
  };

  const handleSave = () => {
    // Handle save
    console.log('Profile updated:', formData);
  };

  return (
    <div className="profile-page">
      <div className="container">
        {/* Header */}
        <section className="profile-header">
          <h1>Profile Settings</h1>
          <p>Manage your account information and preferences</p>
        </section>

        <div className="profile-layout">
          {/* Profile Card */}
          <SpotlightCard className="profile-card" angle={2}>
            <CardContent>
              <h2>Personal Information</h2>

              {/* <div className="form-group">
                <label>Avatar</label>
                <div className="avatar-selector">
                  <div className="avatar-display">{formData.avatar}</div>
                  <p>Choose an avatar or emoji</p>
                </div>
              </div> */}

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  rows="4"
                ></textarea>
              </div>

              <Button size="lg" fullWidth onClick={handleSave}>
                Save Changes
              </Button>
            </CardContent>
          </SpotlightCard>

          {/* Sidebar */}
          <div className="profile-sidebar">
            {/* Preferences */}
            <Card className="preferences-card">
              <CardContent>
                <h3>Notification Preferences</h3>
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      name="emailNotifications"
                      checked={preferences.emailNotifications}
                      onChange={handlePreferenceChange}
                    />
                    <span>Email Notifications</span>
                  </label>
                  <p>Receive updates via email</p>
                </div>

                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      name="pushNotifications"
                      checked={preferences.pushNotifications}
                      onChange={handlePreferenceChange}
                    />
                    <span>Push Notifications</span>
                  </label>
                  <p>Receive app notifications</p>
                </div>

                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      name="monthlyReport"
                      checked={preferences.monthlyReport}
                      onChange={handlePreferenceChange}
                    />
                    <span>Monthly Report</span>
                  </label>
                  <p>Get a summary of your progress</p>
                </div>
              </CardContent>
            </Card>

            {/* Account Stats */}
            <Card className="stats-card">
              <CardContent>
                <h3>Account Stats</h3>
                <div className="stat-row">
                  <span>Member Since</span>
                  <strong>Jan 2026</strong>
                </div>
                <div className="stat-row">
                  <span>Journal Entries</span>
                  <strong>24</strong>
                </div>
                <div className="stat-row">
                  <span>Community Posts</span>
                  <strong>5</strong>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="danger-card">
              <CardContent>
                <h3>Danger Zone</h3>
                <Button variant="danger" size="sm" fullWidth>
                  Change Password
                </Button>
                <Button variant="danger" size="sm" fullWidth style={{ marginTop: '8px' }}>
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
