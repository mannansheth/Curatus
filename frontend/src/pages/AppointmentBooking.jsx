import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Card, CardContent } from '../components/Card';
import { therapistService, appointmentService } from '../services/api';
import './AppointmentBooking.css';

import { SPECIALIZATIONS } from '../data/data';
import AppointmentCard from '../components/AppointmentCard';


const MODES = ['All', 'Online', 'In-person', 'Both'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}


function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}


function TherapistAvatar({ name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777'];
  const color = colors[name?.charCodeAt(0) % colors.length] || '#4f46e5';
  return (
    <div className="therapist-avatar" style={{ background: `${color}22`, border: `2px solid ${color}44` }}>
      <span style={{ color }}>{initials}</span>
    </div>
  );
}

function StarRating({ rating }) {
  const stars = Math.round(rating || 0);
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= stars ? 'star filled' : 'star'}>★</span>
      ))}
      {rating && <span className="rating-num">{Number(rating).toFixed(1)}</span>}
    </div>
  );
}

function ModeChip({ mode }) {
  const map = { online: '💻 Online', 'in-person': '🏥 In-person', both: '🔄 Both' };
  return <span className={`mode-chip mode-chip--${mode}`}>{map[mode] || mode}</span>;
}

function CalendarPicker({ therapist, bookedAppointments, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const availableDayNums = (therapist.availableDays.split(" ") || []).map(d => {
    const idx = FULL_DAY_NAMES.findIndex(n => n.toLowerCase() === d.toLowerCase());
    return idx === -1 ? -1 : idx;
  });

  const isAvailable = (day) => {
    const date = new Date(viewYear, viewMonth, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
    return availableDayNums.includes(date.getDay());
  };

  const formatDate = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-month">{monthLabel}</span>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = formatDate(day);
          const avail = isAvailable(day);
          const selected = selectedDate === dateStr;
          return (
            <button
              key={day}
              className={`cal-day ${avail ? 'avail' : 'unavail'} ${selected ? 'selected' : ''}`}
              onClick={() => avail && onSelectDate(dateStr)}
              disabled={!avail}
              title={avail ? dateStr : 'Not available'}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function AppointmentBooking({ user, showToast }) {
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpec, setFilterSpec] = useState('All');
  const [filterMode, setFilterMode] = useState('All');
  const [filterFeeMax, setFilterFeeMax] = useState('');

  // Therapist data
  const [therapists, setTherapists] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [therapistsError, setTherapistsError] = useState('');

  // Booking state
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const bookingSectionRef = useRef(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const query = debouncedQuery.trim();
    fetchTherapists(query);
  }, [debouncedQuery, filterSpec, filterMode, filterFeeMax]);

  const fetchTherapists = async (query) => {
    setLoadingTherapists(true);
    setTherapistsError('');
    try {
      const response = await therapistService.getTherapists(query, filterSpec, filterMode, filterFeeMax);
      setTherapists(response.data?.therapists || response.data || []);
    } catch (err) {
      setTherapistsError('Could not load therapists. Please try again.');
      setTherapists([]);
    } finally {
      setLoadingTherapists(false);
    }
  };

  useEffect(() => {
    fetchMyAppointments();
  }, []);

  const fetchMyAppointments = async () => {
    setLoadingMine(true);
    try {
      var res;
      if (user.role === "user") {
        res = await appointmentService.getUserAppointments();

      } else {
        res = await appointmentService.getTherapistAppointments();
      }
      setMyAppointments(res.data?.appointments || res.data || []);
    } catch {
      /* silently fail */
    } finally {
      setLoadingMine(false);
    }
  };

  const handleSelectTherapist = async (therapist) => {

    setSelectedTherapist(therapist);
    setSelectedDate('');
    setSelectedTime('');

    
    setTimeout(() => bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  useEffect(() => {
    const getAvailableSlots = async () => {
      try {
      const res = await appointmentService.getAvailableSlots(selectedTherapist.userID, selectedDate);
      console.log(res.data);
      setAvailableSlots(res.data?.slots || []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
    }
    if (selectedDate !== "" && selectedTherapist.userID) {
      
      getAvailableSlots();
    }
  }, [selectedDate])


  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };


  const handleBooking = async () => {
    if (!selectedTherapist || !selectedDate || !selectedTime) {
      showToast('Please select a date and time slot', 'warning');
      return;
    }
    setBookingLoading(true);
    try {
      await appointmentService.bookAppointment({
        therapistId: selectedTherapist.ID,
        date: selectedDate,
        time: selectedTime,
      });
      showToast('Appointment booked successfully!', 'success');
      setShowModal(false);
      setSelectedTherapist(null);
      setSelectedDate('');
      setSelectedTime('');
      fetchMyAppointments();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Booking failed. Please try again.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };


  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    var d;
    if (dateStr.includes("T")) {
      d = new Date(dateStr);
    } else {
      d = new Date(dateStr + 'T00:00:00');

    }
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="appointment-page">
      <div className="container">
        <section className="booked-appointments">
          <h2>Your Appointments</h2>
          {loadingMine ? (
            <div className="slots-loading"><span className="spinner-sm" /> Loading…</div>
          ) : myAppointments.length > 0 ? (
            <div className="appointments-list">
              {myAppointments.map((apt, i) => (
                <AppointmentCard key={apt.ID} role={user.role} apt={apt} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <p>No appointments yet. {user.role === "user" && "Pick a therapist above to get started!"}</p>
            </div>
          )}
        </section>
        {user.role === "user" && 
          <>
            <section className="appointment-header">
              <h1>Find Your Therapist</h1>
              <p>Search by city or name, filter by specialty, and book at a time that works for you</p>
            </section>

            <div className="search-filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by city or therapist name…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>

              <div className="filters-row">
                <div className="filter-group">
                  <label>Specialty</label>
                  <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)} className="filter-select">
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Mode</label>
                  <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="filter-select">
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Max Fee (₹ {filterFeeMax || "Any"})</label>
                  <input
                    type="range"

                    value={filterFeeMax}
                    onChange={e => setFilterFeeMax(Number(e.target.value))}
                    className="filter-input"
                    min={0}
                    step={100}
                    max={5000}
                  />
                </div>

                <button className="filter-reset" onClick={() => { setFilterSpec('All'); setFilterMode('All'); setFilterFeeMax(''); }}>
                  Reset
                </button>
              </div>
            </div>

            <div className="results-meta">
              {loadingTherapists
                ? <span className="loading-indicator"><span className="spinner-sm" /> Searching…</span>
                : therapistsError
                  ? <span className="error-text">{therapistsError}</span>
                  : <span>{therapists.length} therapist{therapists.length !== 1 ? 's' : ''} found</span>
              }
            </div>

            {!loadingTherapists && !therapistsError && therapists.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">🔎</span>
                <p>No therapists found. Try a different city or adjust your filters.</p>
              </div>
            )}

            <div className="therapists-grid">
              {therapists.map((therapist) => (
                <div
                  key={therapist.id}
                  className={`therapist-card ${selectedTherapist?.id === therapist.id ? 'selected' : ''}`}
                  onClick={() => handleSelectTherapist(therapist)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleSelectTherapist(therapist)}
                >
                  <div className="therapist-card-inner">
                    <TherapistAvatar name={therapist.Name} />
                    <div className="therapist-info">
                      <h3>{therapist.Name}</h3>
                      {therapist.degree && <p className="therapist-degree">{therapist.degree}</p>}
                      <p className="specialty">{therapist.specialization}</p>
                      <div className="therapist-meta-row">
                        <ModeChip mode={therapist.mode} />
                        <span className="exp-badge">{therapist.yearsOfExperience}y exp</span>
                      </div>
                    </div>
                  </div>

                  <div className="therapist-card-footer">
                    <div className="therapist-stats">
                      <span className="stat">
                        <span className="stat-label">Fee</span>
                        <span className="stat-val">₹{therapist.consultationFee}</span>
                      </span>
                      <span className="stat">
                        <span className="stat-label">City</span>
                        <span className="stat-val">{therapist.city}</span>
                      </span>
                      <span className="stat">
                        <span className="stat-label">Days</span>
                        <span className="stat-val">
                          {(therapist.availableDays.split(" ") || []).map(d => d.slice(0, 3)).join(', ') || '—'}
                        </span>
                      </span>
                    </div>

                    {therapist.bio && (
                      <p className="therapist-bio">{therapist.bio.slice(0, 100)}{therapist.bio.length > 100 ? '…' : ''}</p>
                    )}

                    <div className="therapist-time-row">
                      <span>🕐 {formatTime12(therapist.startTime)} – {formatTime12(therapist.endTime)}</span>
                      {therapist.certifications && (
                        <span className="cert-badge">✓ Certified</span>
                      )}
                    </div>
                  </div>

                  {selectedTherapist?.Email === therapist.Email && (
                    <div className="selected-badge">Selected ✓</div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Booking Panel ── */}
            {selectedTherapist && (
              <div className="booking-panel" ref={bookingSectionRef}>
                <div className="booking-panel-header">
                  <TherapistAvatar name={selectedTherapist.name} />
                  <div>
                    <h2>Book with {selectedTherapist.name}</h2>
                    <p className="booking-subtitle">
                      {selectedTherapist.specialization} · ₹{selectedTherapist.consultationFee} / session
                    </p>
                  </div>
                  <button className="close-booking" onClick={() => setSelectedTherapist(null)} title="Close">✕</button>
                </div>

                {loadingSlots ? (
                  <div className="slots-loading"><span className="spinner-sm" /> Loading availability…</div>
                ) : (
                  <div className="booking-body">
                    {/* Calendar */}
                    <div className="booking-left">
                      <h3 className="section-label">📅 Pick a Date</h3>
                      <CalendarPicker
                        therapist={selectedTherapist}
                        selectedDate={selectedDate}
                        onSelectDate={handleDateSelect}
                      />
                      <p className="avail-hint">
                        Available on: {(selectedTherapist.availableDays.split(" ") || []).join(', ') || 'Not specified'}
                      </p>
                    </div>

                    {/* Time Slots */}
                    <div className="booking-right">
                      <h3 className="section-label">⏰ Pick a Time</h3>
                      {!selectedDate ? (
                        <div className="pick-date-prompt">← Select a date first</div>
                      ) : availableSlots.length === 0 ? (
                        <div className="pick-date-prompt">No slots available for this date</div>
                      ) : (
                        <div className="time-slots">
                          {availableSlots.map(slot => (
                            <button
                              key={slot.time}
                              className={`time-slot ${slot.booked ? 'booked' : ''} ${selectedTime === slot.time ? 'active' : ''}`}
                              onClick={() => !slot.booked && setSelectedTime(slot.time)}
                              disabled={slot.booked}
                              title={slot.booked ? 'Already booked' : ''}
                            >
                              {formatTime12(slot.time)}
                              {slot.booked && <span className="booked-label">Taken</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Summary */}
                      {(selectedDate || selectedTime) && (
                        <div className="booking-summary">
                          <div className="summary-row">
                            <span>Therapist</span><strong>{selectedTherapist.Name}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Date</span><strong>{selectedDate ? formatDateDisplay(selectedDate) : '—'}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Time</span><strong>{selectedTime ? formatTime12(selectedTime) : '—'}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Duration</span><strong>60 minutes</strong>
                          </div>
                          <div className="summary-row">
                            <span>Fee</span><strong>₹{selectedTherapist.consultationFee}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Mode</span><strong style={{ textTransform: 'capitalize' }}>{selectedTherapist.mode}</strong>
                          </div>
                        </div>
                      )}

                      <Button
                        size="lg"
                        fullWidth
                        onClick={() => setShowModal(true)}
                        disabled={!selectedDate || !selectedTime}
                      >
                        Confirm Booking
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        }

        
      </div>

      {/* ── Confirmation Modal ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm Your Booking">
        <div className="modal-content">
          <div className="modal-confirm-details">
            <TherapistAvatar name={selectedTherapist?.Name} />
            <div>
              <h3>{selectedTherapist?.Name}</h3>
              <p>{selectedTherapist?.specialization}</p>
            </div>
          </div>
          <div className="modal-summary">
            <div className="summary-row"><span>Date</span><strong>{formatDateDisplay(selectedDate)}</strong></div>
            <div className="summary-row"><span>Time</span><strong>{formatTime12(selectedTime)}</strong></div>
            <div className="summary-row"><span>Duration</span><strong>60 minutes</strong></div>
            <div className="summary-row"><span>Fee</span><strong>₹{selectedTherapist?.consultationFee}</strong></div>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Go Back</Button>
            <Button onClick={handleBooking} loading={bookingLoading}>Confirm & Book</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AppointmentBooking;