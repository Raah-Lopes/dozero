import { useState, ReactNode } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-2 px-3 flex items-center justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
        aria-expanded={open}
        aria-controls={`accordion-content-${title.replace(/\s+/g, '-')}`}
      >
        <span className="font-medium">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'transform rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div
          id={`accordion-content-${title.replace(/\s+/g, '-')}`}
          className="p-3 space-y-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
