import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { userService }  from '../services/api';
import './MoodInsights.css';

function MoodInsights({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await userService.getUserStats();
        
        // sort by date ASC
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

    if (user) fetchData();
  }, [user]);

  // -------------------------
  // LOADING
  // -------------------------
  if (loading) {
    return <div className="mood-insights">Loading...</div>;
  }

  // -------------------------
  // NOT LOGGED IN
  // -------------------------
  if (!user) {
    return (
      <div className="mood-insights">
        <div className="container">
          <section className="locked-preview">
            <Card className="preview-card">
              <CardContent>
                <div className="locked-content">
                  <span className="lock-icon">🔒</span>
                  <h2>Track Your Emotional Patterns</h2>
                  <p>Login to see your personalized mood insights.</p>
                  <Link to="/login">
                    <Button size="lg">Login</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    );
  }

  // -------------------------
  // LAST 7 DAYS
  // -------------------------
  const moodData = data.slice(-7).map((item, index) => ({
    date: index + 1,
    mood: item.score,
    emoji: item.emoji
  }));

  // -------------------------
  // MOOD TRENDS
  // -------------------------
  const moodCounts = {};

  data.forEach(item => {
    const key = `${item.mood} ${item.emoji}`;
    moodCounts[key] = (moodCounts[key] || 0) + 1;
  });

  const total = data.length;

  const moodTrends = Object.entries(moodCounts).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / total) * 100)
  }));

  // -------------------------
  // STATS
  // -------------------------
  const avgMood =
    data.length > 0
      ? (data.reduce((sum, i) => sum + i.score, 0) / data.length).toFixed(1)
      : 0;

  const bestEntry =
    data.length > 0
      ? data.reduce((max, i) => (i.score > max.score ? i : max), data[0])
      : null;

  const totalEntries = data.length;

  // -------------------------
  // 🔥 STREAK CALCULATION
  // -------------------------

  const getStreaks = (entries) => {
    if (!entries.length) return { current: 0, longest: 0 };

    // get unique days (ignore multiple entries same day)
    const days = [
      ...new Set(
        entries.map(e =>
          new Date(e.createdAt).toISOString().split("T")[0]
        )
      )
    ];

    // convert to Date objects
    const dates = days.map(d => new Date(d)).sort((a, b) => a - b);

    let longest = 1;
    let current = 1;

    // longest streak
    let temp = 1;

    for (let i = 1; i < dates.length; i++) {
      const diff =
        (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        temp++;
        longest = Math.max(longest, temp);
      } else {
        temp = 1;
      }
    }

    // current streak (from today backwards)
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;

    for (let i = dates.length - 1; i >= 0; i--) {
      const diff =
        (today - dates[i]) / (1000 * 60 * 60 * 24);

      if (diff === streak) {
        streak++;
      } else if (diff > streak) {
        break;
      }
    }

    current = streak;

    return { current, longest };
  };

  const { current: currentStreak, longest: longestStreak } =
    getStreaks(data);

  // -------------------------
  // RENDER
  // -------------------------

  return (
    <div className="mood-insights">
      <div className="container">

        {/* HEADER */}
        <section className="insights-header">
          <h1>Your Mood Insights</h1>
          <p>Understand your emotional patterns</p>
        </section>

        {/* MOOD GRID */}
        <Card className="mood-grid-card">
          <CardContent>
            <h2>Last 7 Entries</h2>

            <div className="mood-grid">
              {moodData.map((day, index) => (
                <div
                  key={index}
                  className="mood-cell"
                  style={{ opacity: 0.3 + day.mood / 10 }}
                  title={`${day.emoji} ${day.mood}/10`}
                >
                  <span className="mood-emoji">{day.emoji}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* GRID */}
        <div className="insights-grid">

          {/* TRENDS */}
          <Card className="trends-card">
            <CardContent>
              <h2>Mood Distribution</h2>

              <div className="trends-list">
                {moodTrends.map((trend, index) => (
                  <div key={index} className="trend-item">
                    <div className="trend-info">
                      <span className="trend-label">{trend.label}</span>
                      <span className="trend-count">{trend.count} entries</span>
                    </div>

                    <div className="trend-bar">
                      <div
                        className="trend-fill"
                        style={{ width: `${trend.percentage}%` }}
                      />
                    </div>

                    <span className="trend-percentage">
                      {trend.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* STATS */}
          <Card className="stats-card">
            <CardContent>
              <h2>Your Stats</h2>

              <div className="stat-item">
                <span className="stat-label">Average Mood</span>
                <span className="stat-value">{avgMood}</span>
                <span className="stat-unit">/10</span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Entries</span>
                <span className="stat-value">{totalEntries}</span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Best Mood</span>
                <span className="stat-value">{bestEntry?.emoji}</span>
                <span className="stat-unit">{bestEntry?.score}/10</span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Current Streak</span>
                <span className="stat-value">{currentStreak}</span>
                <span className="stat-unit">days</span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Longest Streak</span>
                <span className="stat-value">{longestStreak}</span>
                <span className="stat-unit">days</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

export default MoodInsights;