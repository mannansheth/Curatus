import React, { useState, useRef, useEffect } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { appointmentService } from '../services/api';
import './AppointmentCard.css';
import { Link } from 'react-router-dom';

const formatDate = (dateObj) =>
      dateObj.getFullYear() +
      "-" +
      String(dateObj.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dateObj.getDate()).padStart(2, "0");


function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime12(time24) {
  if (!time24) return '—';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isPast(date, time) {
  if (!date || !time) return false;
  const aptDateTime = new Date(`${formatDate(new Date(date))}T${time}`);
  return aptDateTime < new Date();
}


function PatientAvatar({ name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colors = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className="apt-card-avatar"
      style={{ background: `${color}22`, border: `2px solid ${color}44`, color }}
    >
      {initials}
    </div>
  );
}

function PreRemarksPopover({ remarks, onClose, role }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="preremarks-popover" ref={ref}>
      <div className="preremarks-header">
        <span>{role === "user" ? "Therapist's" : "Patient's"} Note</span>
        <button className="popover-close" onClick={onClose}>✕</button>
      </div>
      <p className="preremarks-body">
        {remarks?.trim() ? remarks : <em className="preremarks-empty">No note provided by {role === "user" ? "therapist" : "patient"}.</em>}
      </p>
    </div>
  );
}

function RemarksModal({ apt, onClose, onSaved, showToast }) {
  const [remarks, setRemarks] = useState(apt.therapistRemarks || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!remarks.trim()) {
      setError('Please enter your remarks before saving.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await appointmentService.saveRemarks({
        id: apt.ID,
        remarks: remarks.trim(),
      });
      showToast("Remarks saved successfully", "success");
      onSaved(remarks.trim());
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to save remarks. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Session Remarks">
      <div className="remarks-modal-body">
        <div className="remarks-apt-summary">
          <PatientAvatar name={apt.patientName} />
          <div>
            <p className="remarks-patient-name">{apt.patientName}</p>
            <p className="remarks-apt-meta">
              {formatDateDisplay(apt.date)} &nbsp;·&nbsp; {formatTime12(apt.time)}
            </p>
          </div>
        </div>

        <label className="remarks-label">
          Your remarks about this session
          <span className="remarks-char">{remarks.length} chars</span>
        </label>
        <textarea
          className="remarks-textarea"
          placeholder="Describe session notes, observations, follow-up actions…"
          value={remarks}
          onChange={e => { setRemarks(e.target.value); if (error) setError(''); }}
          rows={5}
          autoFocus
        />

        {error && <p className="remarks-error">{error}</p>}

        <div className="remarks-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}>Save Remarks</Button>
        </div>
      </div>
    </Modal>
  );
}

function AppointmentCard({ apt, onReschedule, onCancel, showToast, role, socket, userId }) {


  const [showRemarksModal, setShowRemarksModal]     = useState(false);
  const [showPreRemarks, setShowPreRemarks]         = useState(false);
  const [savedRemarks, setSavedRemarks]             = useState(apt.postRemarks || '');
  const [unread, setUnread] = useState(apt.unreadCount);


  useEffect(() => {
    socket.on("new_message_notification", (data) => {
      console.log(data, userId);
      
      if (parseInt(data.aptId) === apt.ID && data.sentBy !== userId) {
        console.log('hello');
        
        setUnread(prev => prev + 1);
      }
    });

    return () => {
      socket.off("new_message_notification");
    };
  }, []);

  const handleRemarksSaved = (text) => setSavedRemarks(text);

  return (
    <>
      <div className={`apt-card apt-card--${apt.status}`}>
        
        <div className="apt-card-left">
          <PatientAvatar name={apt.patientName} />
          <div className="apt-card-info">
            <h3 className="apt-card-name">{role === "user" ? apt.therapistName : apt.patientName}</h3>
            <p className="apt-card-meta">
              <span>📅 {formatDateDisplay(apt.date)}</span>
              <span className="meta-dot">·</span>
              <span>⏰ {formatTime12(apt.time)}</span>
            </p>
            <p className="apt-card-meta">
              <span>⏱️ 60 min</span>
              <span className="meta-dot">·</span>
              <span style={{ textTransform: 'capitalize' }}>{apt.mode || 'Online'}</span>
            </p>
          </div>
        </div>


        <div className="apt-card-right">
          <div className='notification-badge'>{unread} unread messages</div>
          <span className={`apt-status-badge apt-status--${apt.status}`}>
            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
          </span>

          <div className="apt-card-actions">
            {apt.status === "upcoming" &&
              <Link to={`/chat/${btoa(apt.ID)}`} >
                <button
                    className="apt-btn apt-btn--primary"
                  >
                    Chat 
                  </button>
              </Link>
            }
            {apt.status === "completed" && role === "therapist" ? (

              <button
                className={`apt-btn apt-btn--remarks ${savedRemarks ? 'apt-btn--remarks-done' : ''}`}
                onClick={() => setShowRemarksModal(true)}
                title={savedRemarks ? 'Edit session remarks' : 'Add session remarks'}
              >
                {savedRemarks ? '✎ Edit Remarks' : '+ Add Remarks'}
              </button>
            ) : (

              <>
                {apt.status === "upcoming" &&
                <>
                  <button
                    className="apt-btn apt-btn--secondary"
                    onClick={() => onReschedule?.(apt)}
                  >
                    Reschedule
                  </button>
                  <button
                    className="apt-btn apt-btn--danger"
                    onClick={() => onCancel?.(apt)}
                  >
                    Cancel
                  </button>
                </>
                }

                <div className="preremarks-wrap">
                  <button
                    className={`apt-btn apt-btn--note ${showPreRemarks ? 'apt-btn--note-active' : ''}`}
                    onClick={() => setShowPreRemarks(v => !v)}
                    title="View patient's pre-session note"
                  >
                    📋 Note
                  </button>
                  {showPreRemarks && (
                    <PreRemarksPopover
                      remarks={role === "user" ? apt.postRemarks : apt.preRemarks}
                      onClose={() => setShowPreRemarks(false)}
                      role={role}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Remarks Modal (portal via Modal component) ── */}
      {showRemarksModal && (
        <RemarksModal
          apt={{ ...apt, therapistRemarks: savedRemarks }}
          onClose={() => setShowRemarksModal(false)}
          onSaved={handleRemarksSaved}
          showToast={showToast}
        />
      )}
    </>
  );
}

export default AppointmentCard;