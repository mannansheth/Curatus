import React from 'react';
import { Card, CardContent } from '../components/Card';
import './EmergencySupport.css';

function EmergencySupport() {
  const emergencyContacts = [
    { name: 'Kiran Mental Health Helpline (Govt. of India)', number: '1800-599-0019', available: '24/7' },
    { name: 'AASRA Suicide Prevention Helpline', number: '91-9820466726', available: '24/7' },
    { name: 'Vandrevala Foundation Helpline', number: '9999666555', available: '24/7 (Call & WhatsApp)' },
  ];

  return (
    <div className="emergency-page">
      <div className="container">
        <div className="emergency-alert">
          <h1>🚨 Crisis Support</h1>
          <p>If you're in immediate danger, please call 112 (India Emergency Helpline)</p>
        </div>

        {/* Emergency Contacts */}
        <section className="emergency-contacts">
          <h2>Immediate Help Available</h2>
          <div className="contacts-grid">
            {emergencyContacts.map((contact, index) => (
              <Card key={index} className="contact-card">
                <CardContent>
                  <h3>{contact.name}</h3>
                  <div className="contact-info">
                    <a href={`tel:${contact.number}`} className="contact-number">
                      {contact.number}
                    </a>
                    <p className="contact-availability">Available: {contact.available}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="emergency-resources">
          <h2>When You Need Help...</h2>
          <div className="resources-list">
            <Card className="resource-item">
              <CardContent>
                <h3>💬 Chat Support</h3>
                <p>Connect with trained crisis counselors online through Crisis Text Line</p>
              </CardContent>
            </Card>
            <Card className="resource-item">
              <CardContent>
                <h3>📞 Phone Support</h3>
                <p>Talk to a trained counselor via phone available 24/7</p>
              </CardContent>
            </Card>
            <Card className="resource-item">
              <CardContent>
                <h3>🏥 Emergency Services</h3>
                <p>Go to your nearest hospital or call 112 for immediate assistance</p>
              </CardContent>
            </Card>
            <Card className="resource-item">
              <CardContent>
                <h3>👥 Support Groups</h3>
                <p>Join support groups with people who understand what you&apos;re going through</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Coping Strategies */}
        <section className="coping-strategies">
          <h2>Immediate Coping Strategies</h2>
          <div className="strategies-grid">
            <div className="strategy">
              <h3>5-4-3-2-1 Technique</h3>
              <p>Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste</p>
            </div>
            <div className="strategy">
              <h3>Breathing Exercise</h3>
              <p>Breathe in for 4 counts, hold for 4, exhale for 4</p>
            </div>
            <div className="strategy">
              <h3>Reach Out</h3>
              <p>Call a trusted friend, family member, or counselor</p>
            </div>
            <div className="strategy">
              <h3>Safe Space</h3>
              <p>Go to a place where you feel safe and comfortable</p>
            </div>
          </div>
        </section>

        {/* Important Message */}
        <Card className="important-message">
          <CardContent>
            <h2>❤️ Your Life Matters</h2>
            <p>
              You are not alone. There are people who care about you and want to help. Your feelings are valid, and your life has value. Please reach out to someone today.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default EmergencySupport;
