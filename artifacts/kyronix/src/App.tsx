import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import InvitePage, { hasAccess } from '@/pages/invite';
import LandingPage from '@/pages/landing';
import ScorePage from '@/pages/score';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

const queryClient = new QueryClient();

function GuardedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!hasAccess()) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Invite gate — always accessible */}
      <Route path="/" component={InvitePage} />

      {/* Protected routes */}
      <Route path="/home">
        {() => <GuardedRoute component={LandingPage} />}
      </Route>
      <Route path="/score/:id">
        {() => <GuardedRoute component={ScorePage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <main className="min-h-screen bg-background text-foreground dark selection:bg-primary/30">
            <Router />
          </main>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
