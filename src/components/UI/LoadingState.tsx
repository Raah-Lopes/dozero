import './LoadingState.css';

type LoadingStateProps = {
  label: string;
  detail?: string;
  compact?: boolean;
  className?: string;
};

/** Shared loading feedback for screens, lazy workspaces and in-panel data fetches. */
export function LoadingState({ label, detail, compact = false, className = '' }: LoadingStateProps) {
  return (
    <div className={`dozero-loading ${compact ? 'dozero-loading--compact' : ''} ${className}`} role="status" aria-live="polite">
      <div className="dozero-loading__art" aria-hidden="true">
        <img className="dozero-loading__sleeping-gif" src="/mascot/loading/zye-waiting.gif" alt="" />
        <img src="/mascot/loading/zye-running.gif" alt="" />
      </div>
      <div className="dozero-loading__copy">
        <strong>{label}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </div>
  );
}
