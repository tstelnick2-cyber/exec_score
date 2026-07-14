import { useState } from 'react';
import { useLocation } from 'wouter';

const VALID_CODES = new Set([
  'KYRONIX',
  'PRESTIGE',
  'EPS2026',
  'EXECUTIVE',
  'K-ALPHA',
]);

export const INVITE_KEY = 'kyronix_access';

export function hasAccess() {
  return localStorage.getItem(INVITE_KEY) === '1';
}

export default function InvitePage() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (VALID_CODES.has(code.toUpperCase().trim())) {
      localStorage.setItem(INVITE_KEY, '1');
      setLocation('/home');
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col items-center text-center space-y-10">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="size-7 bg-primary rounded-[4px] flex items-center justify-center shrink-0">
            <div className="size-2.5 bg-background rounded-full" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Kyronix.ai</span>
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Restricted Access</p>
          <h1 className="text-3xl font-display font-bold tracking-tight">You've been invited.</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Kyronix is currently invite-only.<br />Enter your code to continue.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`w-full space-y-3 ${shaking ? 'animate-[shake_0.5s_ease]' : ''}`}
        >
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            placeholder="INVITE CODE"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className={`w-full h-13 px-5 rounded-lg border bg-background/50 text-center text-base font-mono tracking-[0.25em] uppercase placeholder:normal-case placeholder:tracking-widest placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
              error
                ? 'border-destructive/70 text-destructive'
                : 'border-border/60'
            }`}
          />
          {error && (
            <p className="text-xs text-destructive/80 font-mono">Invalid code. Try again.</p>
          )}
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm tracking-wide transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Enter
          </button>
        </form>

        <p className="text-xs text-muted-foreground/40 font-mono">
          kyronix.ai — executive presence intelligence
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
