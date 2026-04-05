import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './JournalMoodTracker.css';
import { journalService } from '../services/api';

function JournalMoodTracker({ user, showToast }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState([]);

 const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;

    const fetchEntries = async () => {
      try {
        const res = await journalService.getEntries();
        setEntries(res.data.entries || []);
        setLoaded(true);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEntries();
  }, [loaded]);

  const handleSubmit = async (e) => {
    e.preventDefault();


    if (!content.trim()) {
      showToast('Please write something first', 'warning');
      return;
    }

    setIsSubmitting(true);

    const tempId = Date.now();

    const newEntry = {
      ID: tempId,
      content,
      timestamp: new Date().toLocaleString(),
      loading: true,
      moodScore: null,
      aiMood: "⏳"
    };


    setEntries((prev) => [newEntry, ...prev]);
    setContent('');

    try {
      const res = await journalService.addEntry(
        tempId,
        content,
        newEntry.timestamp
      );

      const updatedEntry = res.data.entry;

      setEntries((prev) =>
        prev.map((entry) =>
          entry.ID === tempId
            ? {
                ...entry,
                ...updatedEntry,
                loading: false
              }
            : entry
        )
      );

      showToast('Entry saved & analyzed!', 'success');

    } catch (err) {
        console.error(err);

        // remove failed entry
        setEntries((prev) =>
          prev.filter((entry) => entry.ID !== tempId)
        );

        showToast('Failed to save entry', 'error');
    } finally {
      setIsSubmitting(false);
    }


  };

  return ( <div className="journal-page"> <div className="container">


      <section className="journal-header">
        <h1>Journal & Mood Tracker</h1>
        <p>A safe space to express your thoughts and track your emotional journey</p>
      </section>

      <div className="journal-layout">

        <div className="journal-writer">
          <Card className="writer-card">
            <CardContent>
              <h2>Write Your Thoughts</h2>
              <p className="writer-subtitle">
                Your entry will be analyzed automatically.
              </p>

              <form onSubmit={handleSubmit}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing..."
                  className="journal-textarea"
                />

                <div className="char-count">
                  <span>{content.length} characters</span>
                </div>

                <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
                  Save Entry & Analyze
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="journal-entries">
          <h2>Recent Entries</h2>

          <div className="entries-list">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <Card key={entry.ID} className="entry-item">
                  <CardContent>

                    <div className="entry-meta">
                      <span className="entry-mood-display">
                        {entry.loading ? "⏳" : entry.emoji || "😐"}
                      </span>
                      <span className="entry-timestamp">
                        {entry.timestamp}
                      </span>
                    </div>

                    <p className="entry-text">{entry.content}</p>

                    <div className="entry-footer">
                      {entry.loading ? (
                        <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                          Analyzing mood...
                        </span>
                      ) : (
                        <div className="mood-score-indicator">
                          <span className="score-label">Mood Score</span>
                          <div className="score-bar">
                            <div
                              className="score-fill"
                              style={{ width: `${(entry.score + 2) * 20}%` }}
                            />
                          </div>
                          <span className="score-value">
                            {entry.score}
                          </span>
                        </div>
                      )}
                    </div>

                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="empty-state">
                <p>No entries yet. Start writing your first one.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  </div>


  );
}

export default JournalMoodTracker;
