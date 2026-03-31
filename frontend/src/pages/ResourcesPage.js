import React from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import './ResourcesPage.css';

function ResourcesPage() {
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
                <Card key={idx} className="article-card" interactive>
                  <CardContent>
                    <CardTitle>{article.title}</CardTitle>
                    <p>{article.description}</p>
                    <a href="#read" className="read-more">
                      Read More →
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

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
