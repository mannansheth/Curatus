import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import MoodBoard from '../components/MoodBoard';
import {userService} from '../services/api';
import './Dashboard.css';

function Dashboard({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await userService.getUserStats();

        const sorted = res.data.entries.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        setData(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetch();
  }, [user]);

  if (loading) return <div className="dashboard">Loading...</div>;

  // stats
  const totalEntries = data.length;

  const avgMood =
    totalEntries > 0
      ? (data.reduce((s, i) => s + parseInt(i.score), 0) / totalEntries).toFixed(1)
      : 0;

  // streak
  const getStreak = () => {
    const days = [
      ...new Set(
        data.map(e =>
          new Date(e.createdAt).toISOString().split("T")[0]
        )
      )
    ].sort();

    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days.length - 1; i >= 0; i--) {
      const d = new Date(days[i]);
      const diff = (today - d) / (1000 * 60 * 60 * 24);

      if (diff === streak) streak++;
      else break;
    }

    return streak;
  };

  const currentStreak = getStreak();

  const recentEntries = data.slice(-3).reverse();

  return (
    <div className="dashboard">
      <div className="container">

        {/* 🔥 MOOD BOARD */}
        

        {/* Welcome */}
        <section className="welcome-section">
          <h1>Welcome back, {user?.name || 'Friend'}!</h1>
          <p>Here’s your wellness overview</p>
        </section>

        {/* Stats */}
        <section className="stats-grid">
          <Card className="stat-card">
            <CardContent>
              <h3>{totalEntries}</h3>
              <p>Entries</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent>
              <h3>{avgMood}/10</h3>
              <p>Average Mood</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent>
              <h3>{currentStreak}</h3>
              <p>Streak</p>
            </CardContent>
          </Card>
        </section>

        {/* Main Grid */}
        <div className="dashboard-grid">

          {/* Recent Entries */}
          <section className="dashboard-section">
            <MoodBoard data={data} />
            
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
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p>{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* ✅ QUICK ACTIONS (RESTORED) */}
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

      </div>
    </div>
  );
}

export default Dashboard;