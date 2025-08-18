// Date formatting utilities

/**
 * Format a date string into a readable format
 * @param {string|Date} dateString - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

/**
 * Format a date into relative time (e.g., "2 hours ago")
 * @param {string|Date} date - The date to format
 * @returns {string} - Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(date);
  }
};

/**
 * Format a date for display in a list or card
 * @param {string|Date} date - The date to format
 * @returns {string} - Short formatted date
 */
export const formatShortDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Calculate user tenure in years/months
 * @param {string|Date} createdAt - User creation date
 * @returns {string} - User tenure string
 */
export const calculateUserTenure = (createdAt) => {
  if (!createdAt) return '';
  
  const created = new Date(createdAt);
  const now = new Date();
  const yearDiff = now.getFullYear() - created.getFullYear();
  
  if (yearDiff > 0) {
    return `${yearDiff} ${yearDiff === 1 ? 'year' : 'years'}`;
  } else {
    const monthDiff = now.getMonth() - created.getMonth() + 
      (now.getFullYear() - created.getFullYear()) * 12;
    return `${monthDiff} ${monthDiff === 1 ? 'month' : 'months'}`;
  }
};