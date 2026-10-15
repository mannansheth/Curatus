import React, { useState } from 'react';
import { CardContent, CardTitle } from '../components/Card';
import './ResourcesPage.css';
import SpotlightCard from '../components/SpotlightCard';

function ResourcesPage() {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const articleContent = [
    'Sit comfortably. Breathe gently through your nose and out through your mouth. Count slowly to five each way if comfortable, without forcing or holding your breath. Continue for a few minutes and stop if you feel dizzy.',
    'Find a comfortable position. Gently tense a muscle group for a few seconds, then release and notice the difference. Work from your feet upward. Avoid injured or painful areas.',
    'Anxiety can involve persistent worry, physical tension and avoidance. When it affects daily life, a qualified professional can assess your symptoms and discuss therapy or other treatment options.',
    'CBT explores connections between thoughts, feelings and actions. Notice a difficult thought, consider the evidence for it, and write a balanced alternative. A trained therapist can help tailor this approach.',
    'Keep consistent sleep and waking times. Create a quiet, dark room, reduce evening caffeine, and put screens away before bed. Discuss persistent sleep problems with a clinician.',
    'Before bed, focus gently on natural breathing. Notice wandering thoughts and return attention without judging yourself. Keep practice short and comfortable; meditation is optional.',
    'Choose a calm time to speak. Describe specific observations and your feelings using I statements. Listen without interrupting and check that you understood the other person.',
    'Identify what you can comfortably offer. State your limit clearly and respectfully, and be consistent. Seek trusted support if communicating a boundary feels unsafe.'
  ];
  const resources = [
    {
      category: 'Stress Management',
      icon: '😌',
      articles: [
        { title: 'Deep Breathing Techniques', description: 'Learn effective breathing exercises to reduce stress immediately' },
        { title: 'Progressive Muscle Relaxation', description: 'A guide to releasing physical tension and anxiety' },
      ],
    },
    {
      category: 'Anxiety',
      icon: '😰',
      articles: [
        { title: 'Understanding Anxiety Disorders', description: 'Learn about different types of anxiety and their treatments' },
        { title: 'Cognitive Behavioral Therapy Basics', description: 'An introduction to CBT techniques for anxiety management' },
      ],
    },
    {
      category: 'Sleep & Wellness',
      icon: '😴',
      articles: [
        { title: 'Sleep Hygiene Tips', description: 'Establish healthy sleep habits for better rest' },
        { title: 'Meditation for Better Sleep', description: 'Guided meditation practices to improve sleep quality' },
      ],
    },
    {
      category: 'Relationships',
      icon: '💕',
      articles: [
        { title: 'Healthy Communication Skills', description: 'Improve relationships through better communication' },
        { title: 'Setting Healthy Boundaries', description: 'Learn to establish and maintain personal boundaries' },
      ],
    },
  ];

  return (
    <div className="resources-page">
      <div className="container">
        <section className="resources-header">
          <h1>Mental Health Resources</h1>
          <p>Articles, guides, and tips to support your mental wellness journey</p>
        </section>

        {/* Resources by Category */}
        {resources.map((category, index) => (
          <section key={index} className="resource-category">
            <div className="category-title">
              <span className="category-icon">{category.icon}</span>
              <h2>{category.category}</h2>
            </div>

            <div className="articles-grid">
              {category.articles.map((article, idx) => (
                <SpotlightCard key={idx} className="article-card" interactive>
                  <CardContent>
                    <CardTitle>{article.title}</CardTitle>
                    <p>{article.description}</p>
                    <button type="button" className="read-more" onClick={() => setSelectedArticle({ ...article, content: articleContent[index * 2 + idx] })}>
                      Read More →
                    </button>
                  </CardContent>
                </SpotlightCard>
              ))}
            </div>
          </section>
        ))}

        {selectedArticle && <section className="tip-card" aria-live="polite">
          <h2>{selectedArticle.title}</h2><p>{selectedArticle.content}</p>
          <button type="button" onClick={() => setSelectedArticle(null)}>Close article</button>
        </section>}
        {/* Wellness Tips */}
        <section className="wellness-tips">
          <h2>💡 Daily Wellness Tips</h2>
          <div className="tips-container">
            <div className="tip-card">
              <h3>Practice Gratitude</h3>
              <p>Spend 5 minutes each morning writing down 3 things you&apos;re grateful for.</p>
            </div>
            <div className="tip-card">
              <h3>Move Your Body</h3>
              <p>Regular exercise releases endorphins and improves mental health naturally.</p>
            </div>
            <div className="tip-card">
              <h3>Connect with Others</h3>
              <p>Social connection is vital for mental wellness. Reach out to friends and family.</p>
            </div>
            <div className="tip-card">
              <h3>Practice Mindfulness</h3>
              <p>Even 10 minutes of mindfulness meditation daily can reduce stress and anxiety.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResourcesPage;
