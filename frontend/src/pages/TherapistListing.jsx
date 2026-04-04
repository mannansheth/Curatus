import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Card, CardContent } from '../components/Card';
import './TherapistListing.css';
import { therapistService } from '../services/api';
import { SPECIALIZATIONS } from '../data/data';


function TherapistListing() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [therapists, setTherapists] = useState([])
  const getTherapists = async () => {
    try {
      const response = await therapistService.getTherapists("", selectedSpecialty, "", "");
      setTherapists(response?.data?.therapists || []);
    } catch {
      setTherapists([]);
    }
  }
  useEffect(() => {
    getTherapists();
  }, [selectedSpecialty])
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
            {SPECIALIZATIONS.map(specialty => (
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
          {therapists.length === 0 &&
          <div className="empty-state">
            <span className="empty-icon">🔎</span>
            <p>No therapists found.</p>
          </div>
          }
          {therapists.map(therapist => (
            <Card key={therapist.ID} className="therapist-card-item" interactive>
              <CardContent>
                <div className="therapist-header-card">
                  <div className="therapist-avatar-large">👨‍⚕️</div>
                  <div className="therapist-rating">⭐ {therapist.rating}</div>
                </div>
                <h3>{therapist.Name}</h3>
                <p className="therapist-specialty">{therapist.specialization}</p>
                <p className="therapist-experience">Experience: {therapist.yearsOfExperience}</p>
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
