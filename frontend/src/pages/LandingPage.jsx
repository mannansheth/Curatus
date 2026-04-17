import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import './LandingPage.css';
import SpotlightCard from '../components/SpotlightCard';


const CYCLING_WORDS = ['Mood Patterns', 'Emotional Clarity', 'Your Wellbeing', 'Inner Peace'];

function TypewriterCycle() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = CYCLING_WORDS[wordIndex];
    let timeout;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % CYCLING_WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIndex]);

  return (
    <span className="typewriter-word">
      {displayed}
      <span className="typewriter-cursor">|</span>
    </span>
  );
}


const FEATURES = [
  {
    num: '01',
    title: 'Journal & Mood Tracking',
    description: 'Write freely and track your emotional patterns with AI-powered sentiment analysis.',
    tag: 'Daily Practice',
    size: 'wide',  // spans 2 cols
    link:""
  },
  {
    num: '02',
    title: 'Mood Insights',
    description: 'Visualize your emotional journey with beautiful mood history charts.',
    tag: 'Analytics',
    size: 'normal',
    link:""
  },
  {
    num: '03',
    title: 'AI Chatbot Support',
    description: 'Get instant support and guidance from our intelligent mental health chatbot.',
    tag: 'Always On',
    size: 'normal',
    link:""
  },
  {
    num: '04',
    title: 'Expert Therapists',
    description: 'Connect with verified therapists and book consultations with ease.',
    tag: 'Professional',
    size: 'normal',
    link:"/therapists"
  },
  {
    num: '05',
    title: 'Community',
    description: 'Share your journey and find support from others in our safe space.',
    tag: 'Together',
    size: 'normal',
    link:"/community"
  },
  {
    num: '06',
    title: 'Resources & Tips',
    description: 'Access curated mental health articles and coping strategies.',
    tag: 'Curated',
    size: 'wide',
    link:"/resources"
  },
];

const BENEFITS = [
  { icon: '⟳', title: 'Private & Secure', description: 'End-to-end encrypted. Your data belongs to you.' },
  { icon: '✦', title: 'Expert Therapists', description: 'Verified mental health professionals, background checked.' },
  { icon: '◈', title: 'Accessible Anywhere', description: 'Available 24/7 on all devices. Always one click away.' },
  { icon: '⬡', title: 'Personalized Care', description: 'Recommendations tailored to your emotional needs.' },
];


function LandingPage() {
  const heroRef = useRef(null);

  return (
    <div className="landing-page">


      <section className="hero" ref={heroRef}>

        <div className="hero-inner">
          {/* <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            Mental Wellness Platform
          </div> */}

          <h1 className="hero-title">
            Understand
            <br />
            <TypewriterCycle />
          </h1>

          <p className="hero-subtitle">
            Take control of your emotional wellbeing with MindCare. Track your mood,
            journal your thoughts, and connect with expert therapists—all in one calming space.
          </p>

          <div className="hero-buttons">
            <Link to="/login">
              <button className="btn-primary-hero">
                Get Started
                <span className="btn-arrow">→</span>
              </button>
            </Link>
            <Link to="/community">
              <button className="btn-ghost-hero">
                Explore Community
              </button>
            </Link>
          </div>

          {/* <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">10k+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Therapists</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">4.9★</span>
              <span className="stat-label">User Rating</span>
            </div>
          </div> */}
        </div>
        <div className="hero-graphic">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="section-label-row">
            <span className="section-label-tag">What we offer</span>
            <h2 className="section-title">Tools built for your mind</h2>
            <p className="section-sub">Comprehensive features designed around how people actually heal</p>
          </div>

          <div className="bento-grid">
            {FEATURES.map((f, i) => (
              <SpotlightCard
                key={f.num}
                className={`bento-card bento-${f.size}`}
                delay={i * 80}
              >
                <div className="bento-watermark">{f.num}</div>
                <div className="bento-tag">{f.tag}</div>
                <h3 className="bento-title">{f.title}</h3>
                <p className="bento-desc">{f.description}</p>
                <div className="bento-arrow">
                  <Link to={f.link === "" ? "login": f.link}> 
                    ↗
                  </Link>
                  </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>


      <section className="why-section">
        <div className="container">
          <div className="why-inner">
            <div className="why-left">
              <span className="section-label-tag">Why MindCare</span>
              <h2 className="why-title">Built with care,<br />designed with purpose</h2>
              <p className="why-body">
                Every decision we make is guided by one principle: your wellbeing comes first.
                We work with psychologists, therapists, and real users to build something that
                actually helps.
              </p>
              <Link to="/login">
                <button className="btn-primary-hero" style={{ marginTop: '8px' }}>
                  Start for free <span className="btn-arrow">→</span>
                </button>
              </Link>
            </div>

            <div className="why-right">
              {BENEFITS.map((b, i) => (
                <SpotlightCard key={i} className="benefit-card" delay={i * 100}>
                  <span className="benefit-icon">{b.icon}</span>
                  <div>
                    <h4 className="benefit-title">{b.title}</h4>
                    <p className="benefit-desc">{b.description}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-glow" aria-hidden="true" />
        <div className="cta-inner">
          <span className="section-label-tag" style={{ marginBottom: '20px' }}>Get started today</span>
          <h2 className="cta-title">Ready to transform<br />your mental health?</h2>
          <p className="cta-sub">
            Join thousands of people already using MindCare to understand themselves better.
          </p>
          <Link to="/login">
            <button className="btn-primary-hero btn-large">
              Start Your Journey <span className="btn-arrow">→</span>
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
}

export default LandingPage;