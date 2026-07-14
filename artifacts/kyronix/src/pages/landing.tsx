import { useState } from 'react';
import { useLocation } from 'wouter';
import { useSubmitScore, useGetScoreStats } from '@workspace/api-client-react';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState('');

  const submitScore = useSubmitScore();
  const { data: stats } = useGetScoreStats();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    submitScore.mutate({ data: { linkedin_url: url } }, {
      onSuccess: (result) => setLocation(`/score/${result.id}`),
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.07),transparent)] pointer-events-none" />

      <div className="relative w-full max-w-2xl flex flex-col items-center text-center">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-20">
          <div className="size-6 bg-primary rounded-[4px] flex items-center justify-center shrink-0">
            <div className="size-2 bg-background rounded-full" />
          </div>
          <span className="font-display font-semibold text-base tracking-tight text-muted-foreground">Kyronix.ai</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.05] mb-5">
          What's your executive
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-teal-300 to-primary">
            presence score?
          </span>
        </h1>

        <p className="text-muted-foreground text-base mb-12 tracking-wide">
          Paste your LinkedIn URL. Get your intelligence briefing.
        </p>

        {/* Input + button */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-2.5">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
            className="flex-1 h-13 px-5 rounded-lg border border-border/60 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={submitScore.isPending || !url.trim()}
            className="h-13 px-7 rounded-lg bg-primary text-primary-foreground font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 shrink-0"
          >
            {submitScore.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>Analyze <ArrowRight className="size-4" /></>
            )}
          </button>
        </form>

        {/* Metrics */}
        {stats && (
          <div className="mt-16 flex items-center gap-8 text-center divide-x divide-border/40">
            <div className="pr-8">
              <div className="text-2xl font-display font-bold tabular-nums">
                {stats.total_scores > 0 ? stats.total_scores.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Profiles Scored</div>
            </div>
            <div className="px-8">
              <div className="text-2xl font-display font-bold tabular-nums">
                {stats.avg_overall ? Math.round(stats.avg_overall) : '—'}
                <span className="text-sm text-muted-foreground font-normal">/100</span>
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Avg Global Score</div>
            </div>
            <div className="pl-8">
              <div className="text-2xl font-display font-bold tabular-nums">5</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Archetypes</div>
            </div>
          </div>
        )}
        {!stats && (
          <div className="mt-16 h-14" />
        )}
      </div>
    </div>
  );
}
