export const reportWebVitals = () => {
  // Métricas de desenvolvimento não devem poluir o console de quem joga.
  if (!import.meta.env.DEV) return;

  if (typeof window !== 'undefined' && 'web-vital' in window) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log);
      onINP(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    }).catch((err) => {
      console.warn('Failed to load web-vitals:', err);
    });
  } else {
    // Note: web-vitals v3 and v4 prefer onCLS, onINP instead of getCLS etc.
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(console.log);
      onINP(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    }).catch(e => console.warn(e));
  }
};
