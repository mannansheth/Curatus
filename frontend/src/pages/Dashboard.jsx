import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import MoodBoard from '../components/MoodBoard';
import {appointmentService, userService} from '../services/api';
import './Dashboard.css';
import SpotlightCard from '../components/SpotlightCard';
import AppointmentCard from '../components/AppointmentCard';

function Dashboard({ user, showToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [appointments, setAppointments] = useState([])
  useEffect(() => {
    const fetch = async () => {
      try {
        if (user?.role === "user") {
          const res = await userService.getUserStats();
          setHasSubmitted(res.data.hasSubmitted);
          setData(res.data.entries);

        } else {
          const res = await appointmentService.getTherapistAppointments();
          setAppointments(res.data?.appointments);

        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetch();
  }, [user]);

  if (loading) return <div className="dashboard">Loading...</div>;

  const totalEntries = data.length;

  const avgMood =
    totalEntries > 0
      ? (data.reduce((s, i) => s + parseInt(i.score), 0) / totalEntries).toFixed(1)
      : 0;

  const getStreak = () => {
    const formatDate = (dateObj) =>
      dateObj.getFullYear() +
      "-" +
      String(dateObj.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dateObj.getDate()).padStart(2, "0");

    const days = [
      ...new Set(
        data.map(e => formatDate(new Date(e.createdAt)))
      )
    ].sort();

    let streak = 0;

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days.length - 1; i >= 0; i--) {
      const d = new Date(days[i]);
      d.setHours(0, 0, 0, 0);

      const diff = (today - d) / (1000 * 60 * 60 * 24);

      if (Math.floor(diff) === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const currentStreak = getStreak();
  const recentEntries = data.slice(0, 3);

  return (
    <div className="dashboard">
      <div className="container">
        <section className="welcome-section">
          <h1>Welcome back, {user?.name || 'Friend'}!</h1>
          {user.role === "user" ? 
          <p>Here’s your wellness overview</p>:
          <p>Here are your pending appointments</p>
        }
        </section>

        {!hasSubmitted && user.role === "user" &&
          <div className="assessment-card-wrapper">
            <Card className="assessment-card-dsh">
              <CardContent>
                <div className="assessment-content">
                  <div className="assessment-text">
                    <h3>Complete Your Wellness Assessment</h3>
                    <p>
                      Get personalized insights and improve your experience by taking a quick mental wellness check.
                    </p>
                  </div>

                  <Link to="/assessment">
                    <Button className="assessment-btn">
                      Take Assessment →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        }
        {user?.role === "user" ? 
          <>
            <section className="stats-grid">
              <SpotlightCard className="stat-card">
                <CardContent>
                  <h3>{totalEntries}</h3>
                  <p>Entries</p>
                </CardContent>
              </SpotlightCard>

              <SpotlightCard className="stat-card">
                <CardContent>
                  <h3>{avgMood}/10</h3>
                  <p>Average Mood</p>
                </CardContent>
              </SpotlightCard>

              <SpotlightCard className="stat-card">
                <CardContent>
                  <h3>{currentStreak}</h3>
                  <p>Streak</p>
                </CardContent>
              </SpotlightCard>
            </section>


            <div className="dashboard-grid">

              <section className="dashboard-section">
                <SpotlightCard className='mb-container' angle={4} >
                  <MoodBoard data={data} />

                </SpotlightCard>
                <div className="section-header">
                  <h2>Recent Journal Entries</h2>
                  <Link to="/journal">
                    <Button size="sm">View All</Button>
                  </Link>
                </div>

                {recentEntries.map(entry => (
                  <Card key={entry.id}>
                    <CardContent>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{entry.emoji}</span>
                        <span>{new Date(entry.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p>{entry.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </section>
              <section className="quick-actions">
                <h2>Quick Actions</h2>

                <div className="actions-list">
                  <Link to="/journal">
                    <Card className="action-card" interactive>
                      <CardContent>
                        📝 Write Journal
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/chatbot">
                    <Card className="action-card" interactive>
                      <CardContent>
                        💬 Chat with AI
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/appointment">
                    <Card className="action-card" interactive>
                      <CardContent>
                        📅 Book Appointment
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/insights">
                    <Card className="action-card" interactive>
                      <CardContent>
                        📊 View Insights
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </section>
            </div>
          </>
          :
          <>
            {appointments.length === 0 &&
              <h4>No appointments yet</h4>
            }
            {appointments.map(a => (
              <AppointmentCard key={a.ID} apt={a} onReschedule={true} onCancel={true} showToast={showToast} role={user.role}/>

            ))}
          </>
        }

        

      </div>
      <aside className="chat-sidebar">
          <Card className="sidebar-card">
            <CardContent>
              <h3>📞 Quick Help</h3>
              <div className="quick-links">
                <a href="/appointment" className="quick-link">
                  Book Therapist
                </a>
                <a href="/resources" className="quick-link">
                  View Resources
                </a>
                <a href="/emergency" className="quick-link">
                  Emergency Support
                </a>
              </div>
            </CardContent>
          </Card>

        </aside>
    </div>
  );
}

export default Dashboard;