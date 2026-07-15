import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  useLocation,
  Redirect,
  Router as WouterRouter,
} from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import LandingPage from "@/pages/landing";
import ScorePage from "@/pages/score";
import NotFound from "@/pages/not-found";
import { ArrowRight } from "lucide-react";

// ─── Clerk bootstrap ────────────────────────────────────────────────────────

// REQUIRED — copy verbatim.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// ─── Appearance ─────────────────────────────────────────────────────────────

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(173, 80%, 40%)",
    colorForeground: "hsl(210, 40%, 98%)",
    colorMutedForeground: "hsl(215, 20%, 65%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(220, 29%, 8%)",
    colorInput: "hsl(220, 29%, 12%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(220, 29%, 20%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(220,29%,8%)] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(220,29%,16%)] shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(210,40%,98%)] font-bold",
    headerSubtitle: "text-[hsl(215,20%,65%)]",
    socialButtonsBlockButtonText: "text-[hsl(210,40%,98%)] font-medium",
    formFieldLabel: "text-[hsl(210,40%,98%)] text-sm",
    footerActionLink:
      "text-[hsl(173,80%,40%)]",
    footerActionText: "text-[hsl(215,20%,65%)]",
    dividerText: "text-[hsl(215,20%,65%)]",
    identityPreviewEditButton: "text-[hsl(173,80%,40%)]",
    formFieldSuccessText: "text-[hsl(173,80%,40%)]",
    alertText: "text-[hsl(210,40%,98%)]",
    logoBox: "mb-1",
    logoImage: "h-9 w-9",
    socialButtonsBlockButton:
      "border-[hsl(220,29%,20%)] bg-[hsl(220,29%,11%)]",
    formButtonPrimary:
      "bg-[hsl(173,80%,40%)] text-[hsl(220,29%,5%)] font-semibold",
    formFieldInput:
      "bg-[hsl(220,29%,11%)] border-[hsl(220,29%,20%)] text-[hsl(210,40%,98%)]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[hsl(220,29%,16%)]",
    alert: "border-[hsl(0,60%,40%)] bg-[hsl(0,30%,10%)]",
    otpCodeFieldInput:
      "bg-[hsl(220,29%,11%)] border-[hsl(220,29%,20%)] text-[hsl(210,40%,98%)]",
    formFieldRow: "",
    main: "",
  },
};

// ─── Localization ────────────────────────────────────────────────────────────

const localization = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to access your intelligence briefing.",
    },
  },
  signUp: {
    start: {
      title: "Request access",
      subtitle: "Create your account to get your executive presence score.",
    },
  },
};

// ─── Auth pages ─────────────────────────────────────────────────────────────

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// ─── Public home (signed-out visitors) ──────────────────────────────────────

function PublicHome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(173_80%_40%/0.07),transparent)] pointer-events-none" />

      <div className="relative w-full max-w-xl flex flex-col items-center text-center gap-10">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="size-6 bg-primary rounded-[4px] flex items-center justify-center shrink-0">
            <div className="size-2 bg-background rounded-full" />
          </div>
          <span className="font-display font-semibold text-base tracking-tight text-muted-foreground">
            Kyronix.ai
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.05]">
            What's your executive
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-teal-300 to-primary">
              presence score?
            </span>
          </h1>
          <p className="text-muted-foreground text-base">
            Paste your LinkedIn URL. Get your intelligence briefing.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setLocation("/sign-in")}
            className="h-12 px-8 rounded-lg bg-primary text-primary-foreground font-semibold text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Sign in to get started
            <ArrowRight className="size-4" />
          </button>
          <button
            onClick={() => setLocation("/sign-up")}
            className="h-12 px-8 rounded-lg border border-border/60 text-foreground font-semibold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
          >
            Create account
          </button>
        </div>

        <p className="text-xs text-muted-foreground/50 font-mono tracking-widest uppercase">
          Sign in with Google or Apple
        </p>
      </div>
    </div>
  );
}

// ─── Home redirect ───────────────────────────────────────────────────────────

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/home" />
      </Show>
      <Show when="signed-out">
        <PublicHome />
      </Show>
    </>
  );
}

// ─── Protected scanner (/home) ───────────────────────────────────────────────

function ProtectedHome() {
  return (
    <>
      <Show when="signed-in">
        <LandingPage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

// ─── Protected score (/score/:id) ────────────────────────────────────────────

function ProtectedScore() {
  return (
    <>
      <Show when="signed-in">
        <ScorePage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

// ─── Cache invalidator ───────────────────────────────────────────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ─── Router ─────────────────────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={localization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/home" component={ProtectedHome} />
            <Route path="/score/:id" component={ProtectedScore} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ─── App root ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
