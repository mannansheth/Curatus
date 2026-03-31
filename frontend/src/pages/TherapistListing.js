import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './TherapistListing.css';

function TherapistListing() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');

  const therapists = [
    { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Clinical Psychology', rating: 4.9, experience: '10+ years' },
    { id: 2, name: 'Dr. Mike Chen', specialty: 'Anxiety Disorders', rating: 4.8, experience: '8+ years' },
    { id: 3, name: 'Dr. Emma Smith', specialty: 'Depression & Trauma', rating: 4.7, experience: '12+ years' },
    { id: 4, name: 'Dr. James Wilson', specialty: 'Family Therapy', rating: 4.9, experience: '9+ years' },
  ];

  const specialties = ['All', 'Clinical Psychology', 'Anxiety Disorders', 'Depression & Trauma', 'Family Therapy'];

  const filtered = selectedSpecialty === 'All'
    ? therapists
    : therapists.filter(t => t.specialty === selectedSpecialty);

  return (
    <div className="therapist-page">
      <div className="container">
        <section className="therapist-header">
          <h1>Our Therapists</h1>
          <p>Meet our team of qualified mental health professionals</p>
        </section>

        {/* Filters */}
        <div className="filters">
          <span className="filter-label">Specialty:</span>
          <div className="filter-buttons">
            {specialties.map(specialty => (
              <button
                key={specialty}
                className={`filter-btn ${selectedSpecialty === specialty ? 'active' : ''}`}
                onClick={() => setSelectedSpecialty(specialty)}
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>

        {/* Therapists Grid */}
        <div className="therapists-list">
          {filtered.map(therapist => (
            <Card key={therapist.id} className="therapist-card-item" interactive>
              <CardContent>
                <div className="therapist-header-card">
                  <div className="therapist-avatar-large">👨‍⚕️</div>
                  <div className="therapist-rating">⭐ {therapist.rating}</div>
                </div>
                <h3>{therapist.name}</h3>
                <p className="therapist-specialty">{therapist.specialty}</p>
                <p className="therapist-experience">Experience: {therapist.experience}</p>
                <Link to="/login">
                  <Button size="sm" fullWidth>
                    Book Session
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TherapistListing;
