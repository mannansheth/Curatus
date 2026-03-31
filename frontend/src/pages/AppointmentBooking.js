import React, { useState } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Card, CardContent, CardTitle } from '../components/Card';
import './AppointmentBooking.css';

function AppointmentBooking({ user, showToast }) {
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState([
    {
      id: 1,
      therapist: 'Dr. Sarah Johnson',
      date: 'March 31, 2026',
      time: '2:00 PM',
      duration: '60 minutes',
    },
  ]);

  const therapists = [
    { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Clinical Psychology', rating: 4.9 },
    { id: 2, name: 'Dr. Mike Chen', specialty: 'Anxiety & Stress', rating: 4.8 },
    { id: 3, name: 'Dr. Emma Smith', specialty: 'Depression & Trauma', rating: 4.7 },
  ];

  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

  const handleBooking = () => {
    if (!selectedTherapist || !selectedDate || !selectedTime) {
      showToast('Please select therapist, date, and time', 'warning');
      return;
    }

    const newAppointment = {
      id: bookedAppointments.length + 1,
      therapist: selectedTherapist.name,
      date: selectedDate,
      time: selectedTime,
      duration: '60 minutes',
    };

    setBookedAppointments([...bookedAppointments, newAppointment]);
    setShowModal(false);
    setSelectedTherapist(null);
    setSelectedDate('');
    setSelectedTime('');
    showToast('Appointment booked successfully!', 'success');
  };

  return (
    <div className="appointment-page">
      <div className="container">
        <section className="appointment-header">
          <h1>Book an Appointment</h1>
          <p>Schedule a session with our expert therapists</p>
        </section>

        {/* Therapists Grid */}
        <div className="therapists-grid">
          {therapists.map((therapist) => (
            <Card
              key={therapist.id}
              className={`therapist-card ${selectedTherapist?.id === therapist.id ? 'selected' : ''}`}
              interactive
              onClick={() => setSelectedTherapist(therapist)}
            >
              <CardContent>
                <div className="therapist-avatar">👨‍⚕️</div>
                <h3>{therapist.name}</h3>
                <p className="specialty">{therapist.specialty}</p>
                <div className="rating">
                  <span>⭐ {therapist.rating}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Booking Form */}
        {selectedTherapist && (
          <Card className="booking-form-card">
            <CardContent>
              <h2>Select Date & Time</h2>
              <div className="booking-form">
                <div className="form-group">
                  <label>Preferred Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Select Time Slot</label>
                  <div className="time-slots">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        className={`time-slot ${selectedTime === time ? 'active' : ''}`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="booking-summary">
                  <p><strong>Therapist:</strong> {selectedTherapist.name}</p>
                  <p><strong>Date:</strong> {selectedDate || 'Not selected'}</p>
                  <p><strong>Time:</strong> {selectedTime || 'Not selected'}</p>
                  <p><strong>Duration:</strong> 60 minutes</p>
                </div>

                <Button size="lg" fullWidth onClick={() => setShowModal(true)}>
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booked Appointments */}
        <section className="booked-appointments">
          <h2>Your Appointments</h2>
          {bookedAppointments.length > 0 ? (
            <div className="appointments-list">
              {bookedAppointments.map((apt) => (
                <Card key={apt.id} className="appointment-item">
                  <CardContent>
                    <div className="apt-info">
                      <div>
                        <h3>{apt.therapist}</h3>
                        <p>📅 {apt.date} at {apt.time}</p>
                        <p>⏱️ {apt.duration}</p>
                      </div>
                    </div>
                    <div className="apt-actions">
                      <Button variant="secondary" size="sm">
                        Reschedule
                      </Button>
                      <Button variant="danger" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No appointments booked yet. Select a therapist above to schedule one!</p>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm Your Booking">
        <div className="modal-content">
          <p>
            Booking appointment with <strong>{selectedTherapist?.name}</strong> on{' '}
            <strong>{selectedDate}</strong> at <strong>{selectedTime}</strong>?
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBooking}>Confirm Booking</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AppointmentBooking;
