function UserAvatar({ src, name, size = 'md', className = '' }) {
  const normalizedName = (name || 'User').trim();
  const fallbackText = normalizedName.charAt(0).toUpperCase() || 'U';
  const resolvedSrc = src || '';

  return resolvedSrc ? (
    <img
      src={resolvedSrc}
      alt={normalizedName || 'User'}
      className={`app-avatar app-avatar-${size} ${className}`.trim()}
    />
  ) : (
    <div className={`app-avatar app-avatar-${size} app-avatar-fallback ${className}`.trim()}>
      {fallbackText}
    </div>
  );
}

export default UserAvatar;
