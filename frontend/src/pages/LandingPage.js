import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent, CardTitle } from '../components/Card';
import './LandingPage.css';

function LandingPage() {
  const features = [
    {
      icon: '01',
      title: 'Journal & Mood Tracking',
      description: 'Write freely and track your emotional patterns with AI-powered sentiment analysis.',
    },
    {
      icon: '02',
      title: 'Mood Insights',
      description: 'Visualize your emotional journey with beautiful mood history charts.',
    },
    {
      icon: '03',
      title: 'AI Chatbot Support',
      description: 'Get instant support and guidance from our intelligent mental health chatbot.',
    },
    {
      icon: '04',
      title: 'Expert Therapists',
      description: 'Connect with verified therapists and book consultations with ease.',
    },
    {
      icon: '05',
      title: 'Community Support',
      description: 'Share your journey and find support from others in our safe community.',
    },
    {
      icon: '06',
      title: 'Resources & Tips',
      description: 'Access curated mental health articles and coping strategies.',
    },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Your Mental Health Companion</h1>
          <p className="hero-subtitle">
            Take control of your emotional wellbeing with MindCare. Track your mood, journal your thoughts, and connect with expert therapists—all in one calming space.
          </p>
          <div className="hero-buttons">
            <Link to="/login">
              <Button size="lg" fullWidth={false}>
                Get Started
              </Button>
            </Link>
            <Link to="/community">
              <Button variant="secondary" size="lg" fullWidth={false}>
                Explore Community
              </Button>
            </Link>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need for Mental Wellness</h2>
            <p>Comprehensive tools designed to support your emotional health journey</p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <Card key={index} className="feature-card">
                <CardContent>
                  <div className="feature-icon">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                  <p className="feature-description">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-us">
        <div className="container">
          <h2>Why Choose MindCare?</h2>
          <div className="benefits-grid">
            <div className="benefit">
              <h3>Private & Secure</h3>
              <p>Your data is encrypted and protected. We prioritize your privacy above all.</p>
            </div>
            <div className="benefit">
              <h3>Expert Therapists</h3>
              <p>Access verified mental health professionals with years of experience.</p>
            </div>
            <div className="benefit">
              <h3>Accessible Anywhere</h3>
              <p>Available 24/7 on all devices. Your support is always just a click away.</p>
            </div>
            <div className="benefit">
              <h3>Personalized Care</h3>
              <p>Get recommendations tailored to your emotional needs and preferences.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Mental Health?</h2>
          <p>Join thousands of people already using MindCare to improve their wellbeing</p>
          <Link to="/login">
            <Button size="lg">Start Your Journey</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
