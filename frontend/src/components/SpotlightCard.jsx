import {useState, useEffect, useRef} from 'react';
import './SpotlightCard.css'

function SpotlightCard({ children, className = '', delay = 0, angle=10 }) {
  const cardRef = useRef(null);
  const [style, setStyle] = useState({});
  const [spotStyle, setSpotStyle] = useState({});
  const [visible, setVisible] = useState(false);

  // Scroll reveal
useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -angle;
    const rotY = ((x - cx) / cx) *angle;

    setStyle({
      transform: `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`,
    });
    setSpotStyle({
      background: `radial-gradient(320px circle at ${x}px ${y}px, rgba(99,102,241,0.13), transparent 65%)`,
    });
  };

  const handleMouseLeave = () => {
    setStyle({ transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)' });
    setSpotStyle({});
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className} ${visible ? 'card-visible' : ''}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="spotlight-layer" style={spotStyle} />
      {children}
    </div>
  );
}

export default SpotlightCard;