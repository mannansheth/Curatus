function UserAvatar({ name }) {
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
export default UserAvatar;