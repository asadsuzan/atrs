export const exportAllData = () => {
  // Directly trigger download via window.location or a temporary link
  window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/export`;
};
