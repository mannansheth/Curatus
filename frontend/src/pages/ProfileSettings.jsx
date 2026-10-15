import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './ProfileSettings.css';
import SpotlightCard from '../components/SpotlightCard';
import { userService } from '../services/api';
import { Link } from 'react-router-dom';

function ProfileSettings({ user, setUser, onLogout, showToast }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    avatar: 'User',
  });
  const [userData, setUserData] = useState({});

  useEffect(() => {
    const getUserData = async () => {
      try {
        const res = await userService.getUserProfile();
        setUserData(res.data.userData || {});
        const profile = res.data.profile || res.data.user || res.data.userData || {};
        setFormData(prev => ({ ...prev, ...profile }));
      } catch {
        showToast("Error while getting info", "danger")
      }
    }
    getUserData();
  }, [showToast])
  const [saving, setSaving] = useState(false);
  const [accountAction, setAccountAction] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showToast('Enter a name and valid email address', 'error'); return;
    }
    setSaving(true);
    try {
      await userService.updateUserProfile(formData);
      setUser?.(prev => ({ ...prev, name: formData.name, email: formData.email }));
      showToast('Profile saved', 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Unable to save profile', 'error'); }
    finally { setSaving(false); }
  };
  const handleAccountAction = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (accountAction === 'password') {
        await userService.changePassword({ currentPassword, newPassword });
        showToast('Password changed', 'success');
      } else {
        await userService.deleteAccount(currentPassword);
        onLogout?.();
      }
      setAccountAction(''); setCurrentPassword(''); setNewPassword('');
    } catch (err) { showToast(err.response?.data?.message || 'Account operation failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="profile-page">
      <div className="container">
        {/* Header */}
        <section className="profile-header">
          <h1>Profile Settings</h1>
          <p>Manage your account information and preferences</p>
        </section>
        {user.role === "user" &&
          <div className="assessment-card-wrapper">
              <Card className="assessment-card-dsh">
                <CardContent>
                  <div className="assessment-content">
                    <div className="assessment-text">
                      <h3>Take Your Wellness Assessment Again</h3>
                      <p>
                        Get personalized insights and improve your experience by taking a quick mental wellness check.
                      </p>
                    </div>

                    <Link to="/assessment">
                      <Button className="assessment-btn">
                        Take Assessment Again →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
        }
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
                  placeholder="9876543210"
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

              <Button size="lg" fullWidth onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
            </CardContent>
          </SpotlightCard>

          {/* Sidebar */}
          <div className="profile-sidebar">
            {/* Preferences */}


            {/* Account Stats */}
            <Card className="stats-card">
              <CardContent>
                <h3>Account Stats</h3>
                <div className="stat-row">
                  <span>Member Since</span>
                  <strong>{new Date(userData?.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}</strong>
                </div>
                <div className="stat-row">
                  <span>Journal Entries</span>
                  <strong>{userData?.journalEntries}</strong>
                </div>
                <div className="stat-row">
                  <span>Community Posts</span>
                  <strong>{userData?.communityMessages}</strong>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="danger-card">
              <CardContent>
                <h3>Danger Zone</h3>
                <Button variant="danger" size="sm" fullWidth onClick={() => setAccountAction("password")}>
                  Change Password
                </Button>
                <Button variant="danger" size="sm" fullWidth style={{ marginTop: '8px' }} onClick={() => setAccountAction("delete")}>
                  Delete Account
                </Button>
              </CardContent>
              {accountAction && <form onSubmit={handleAccountAction}>
                <p>{accountAction === 'delete' ? 'Deleting your account permanently removes your personal data. Enter your password to confirm.' : 'Enter your current and new password.'}</p>
                <label>Current password<input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
                {accountAction === 'password' && <label>New password<input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>}
                <Button type="submit" loading={saving}>Confirm {accountAction === 'delete' ? 'deletion' : 'password change'}</Button>
                <Button type="button" onClick={() => setAccountAction('')}>Cancel</Button>
              </form>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
