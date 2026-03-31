import React from 'react';
import './Button.css';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className,
  type = 'button',
  fullWidth = false,
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading ? (
        <>
          <span className="spinner"></span>
          <span className="opacity-50">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
