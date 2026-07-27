export const reportWebVitals = () => {
  if (typeof window !== 'undefined' && 'web-vital' in window) {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log);
      onFID(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    }).catch((err) => {
      console.warn('Failed to load web-vitals:', err);
    });
  } else {
    // Note: web-vitals v3 and v4 prefer onCLS, onFID instead of getCLS etc.
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log);
      onFID(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    }).catch(e => console.warn(e));
  }
};
