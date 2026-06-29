import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  code: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configura o tema dark para combinar com a Wiki
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });

    const renderDiagram = async () => {
      try {
        setError(null);
        // Gera um ID único para evitar conflito se houver múltiplos gráficos na mesma página
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
      } catch (err: any) {
        console.error("Mermaid parsing error:", err);
        setError(err.message || 'Erro ao renderizar diagrama. Verifique a sintaxe.');
      }
    };

    if (code && code.trim() !== '') {
      renderDiagram();
    }
  }, [code]);

  if (error) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5' }}>
        <strong>Erro de Sintaxe (Mermaid)</strong> <br />
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</pre>
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Código Original:</span>
          <pre style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '0.5rem' }}>{code}</pre>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="mermaid-wrapper"
      style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
