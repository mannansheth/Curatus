import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { userService } from '../services/api';
import './MoodInsights.css';
import MoodLineGraph from '../components/MoodLineGraph';


function MoodInsights({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

    if (user) fetchData();
  }, [user]);

  if (loading) {
    return <div className="mood-insights loading-state">Loading…</div>;
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const last7 = data.slice(-7);

  // Graph data: use all entries, map to { score, emoji, date }
  const graphData = data.map(item => ({
    score: parseInt(item.score),
    emoji: item.emoji,
    date: item.createdAt,
  }));

  // Last 7 grid
  const moodData = last7.map((item, index) => ({
    date: index + 1,
    mood: item.score,
    emoji: item.emoji,
  }));

  // Distribution
  const moodCounts = {};
  data.forEach(item => {
    const key = `${item.mood} ${item.emoji}`;
    moodCounts[key] = (moodCounts[key] || 0) + 1;
  });
  const total = data.length;
  const moodTrends = Object.entries(moodCounts).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / total) * 100),
  }));

  // Stats
  const avgMood =
    data.length > 0
      ? (data.reduce((sum, i) => sum + parseInt(i.score), 0) / data.length).toFixed(1)
      : 0;
  const bestEntry =
    data.length > 0
      ? data.reduce((max, i) => (parseInt(i.score) > parseInt(max.score) ? i : max), data[0])
      : null;
  const totalEntries = data.length;

  const getStreaks = (entries) => {
    if (!entries.length) return { current: 0, longest: 0 };
    const formatDate = (d) =>
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const days = [...new Set(data.map(e => formatDate(new Date(e.createdAt))))].sort();

    let longest = 1, temp = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]).setHours(0,0,0,0) - new Date(days[i-1]).setHours(0,0,0,0)) / 86400000;
      if (Math.floor(diff) === 1) { temp++; longest = Math.max(longest, temp); }
      else temp = 1;
    }

    let today = new Date(); today.setHours(0,0,0,0);
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const d = new Date(days[i]); d.setHours(0,0,0,0);
      if (Math.floor((today - d) / 86400000) === streak) streak++;
      else break;
    }

    return { current: streak, longest };
  };

  const { current: currentStreak, longest: longestStreak } = getStreaks(data);

  return (
    <div className="mood-insights">
      <div className="container">

        {/* Header */}
        <section className="insights-header">
          <h1>Your Mood Insights</h1>
          <p>Understand your emotional patterns</p>
        </section>

        {/* ── Line Graph ── */}
        <Card className="graph-card">
          <CardContent>
            <div className="graph-card-header">
              <h2>Mood Over Time</h2>
              <span className="graph-subtitle">{data.length} entries · score out of 10</span>
            </div>
            <MoodLineGraph data={graphData} />
          </CardContent>
        </Card>

        {/* Last 7 grid */}
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

        {/* Grid: distribution + stats */}
        <div className="insights-grid">

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
                      <div className="trend-fill" style={{ width: `${trend.percentage}%` }} />
                    </div>
                    <span className="trend-percentage">{trend.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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