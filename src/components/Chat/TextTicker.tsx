import React, { useState, useEffect } from 'react';

interface TextTickerProps {
  text: string;
  speed?: number; // ms per character
}

export const TextTicker: React.FC<TextTickerProps> = ({ text, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        // Play typing sound here if WebAudio is hooked up
      }, speed);
      
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <div className="glass-panel" style={{ 
      padding: '1.5rem', 
      width: '100%', 
      maxWidth: '800px', 
      margin: '0 auto',
      minHeight: '120px',
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '1.2rem',
      lineHeight: '1.6'
    }}>
      <p>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', marginRight: '0.5rem' }}>O Mestre (IA):</span>
        {displayedText}
        {currentIndex < text.length && <span style={{ opacity: 0.5 }}>|</span>}
      </p>
    </div>
  );
};
