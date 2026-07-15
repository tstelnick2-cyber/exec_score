import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetScore,
  useRequestEmailVerification,
  useVerifyEmail,
  getScorePdf,
  getGetScoreQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk, useUser } from "@clerk/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Lock,
  Unlock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Activity,
  Radar,
  ScanEye,
  LogOut,
} from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});

export default function ScorePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [gateState, setGateState] = useState<"email" | "otp">("email");

  const { data: scoreData, isLoading } = useGetScore(id, {
    query: {
      queryKey: getGetScoreQueryKey(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "pending" || status === "processing" ? 2000 : false;
      },
    },
  });

  const requestVerification = useRequestEmailVerification();
  const verifyEmail = useVerifyEmail();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: user?.emailAddresses?.[0]?.emailAddress ?? "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const onEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    requestVerification.mutate(
      { id, data: { email: values.email } },
      { onSuccess: () => setGateState("otp") },
    );
  };

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    verifyEmail.mutate(
      { id, data: { code: values.otp } },
      {
        onSuccess: (res) => {
          if (res.verified) {
            queryClient.setQueryData(
              getGetScoreQueryKey(id),
              (old: any) =>
                old
                  ? {
                      ...old,
                      email_verified: true,
                      verified_email: emailForm.getValues().email,
                      verification_token: res.token,
                    }
                  : old,
            );
          } else {
            otpForm.setError("otp", { message: "Invalid code. Please try again." });
          }
        },
        onError: () => {
          otpForm.setError("otp", { message: "Invalid code. Please try again." });
        },
      },
    );
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await getScorePdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kyronix_Score_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download PDF", err);
    }
  };

  if (
    isLoading ||
    !scoreData ||
    scoreData.status === "pending" ||
    scoreData.status === "processing"
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 animate-in fade-in duration-1000">
          <div className="relative size-24">
            <ScanEye className="size-24 text-primary/20 absolute inset-0 animate-pulse" />
            <Radar className="size-24 text-primary absolute inset-0 animate-[spin_3s_linear_infinite]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold tracking-tight">
              Analyzing Profile...
            </h2>
            <p className="text-muted-foreground text-sm">
              Running proprietary checks across 5 primary domains.
            </p>
          </div>
          <div className="w-full space-y-4 text-left">
            {[
              { label: "Parsing headline and positioning...", delay: "delay-[0ms]" },
              { label: "Evaluating visual authority metrics...", delay: "delay-[1500ms]" },
              { label: "Quantifying network social proof...", delay: "delay-[3000ms]" },
              { label: "Scoring content depth and reach...", delay: "delay-[4500ms]" },
            ].map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-4 fill-mode-both ${step.delay}`}
              >
                <CheckCircle2 className="size-4 text-primary" />
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (scoreData.status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="size-16 text-destructive mb-6" />
        <h2 className="text-2xl font-display font-bold mb-2">Analysis Failed</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          {scoreData.error_message || "We encountered an issue analyzing this profile."}
        </p>
        <Button onClick={() => setLocation("/home")} variant="outline">
          <ChevronLeft className="mr-2 size-4" /> Return to Scanner
        </Button>
      </div>
    );
  }

  const isLocked = !scoreData.email_verified;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-6 h-16 flex items-center border-b border-border/40 bg-background/95 backdrop-blur z-50 sticky top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/home")}
          className="mr-4 rounded-full size-8 hover:bg-secondary"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2 font-display font-bold tracking-tight">
          Kyronix.ai
        </div>
        <div className="ml-auto flex items-center gap-4">
          {user && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user.firstName
                ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                : user.emailAddresses[0]?.emailAddress}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-widest">
            {isLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
            {isLocked ? "Locked" : "Unlocked"}
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Main Result Card */}
        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden mb-8 shadow-2xl shadow-primary/5">
          {isLocked && (
            <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center border-t border-primary/20">
              <ShieldCheck className="size-12 text-primary mb-6 animate-pulse" />
              <h3 className="text-2xl font-display font-bold mb-3">
                Analysis Complete
              </h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Your profile has been scored across 5 dimensions. Verify your
                email to permanently unlock your intelligence briefing.
              </p>

              {gateState === "email" ? (
                <Form {...emailForm}>
                  <form
                    onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                    className="w-full max-w-sm space-y-4"
                  >
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="name@company.com"
                              className="h-12 text-center text-lg bg-background/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={requestVerification.isPending}
                    >
                      {requestVerification.isPending ? "Sending..." : "Unlock Report"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...otpForm}>
                  <form
                    onSubmit={otpForm.handleSubmit(onOtpSubmit)}
                    className="w-full max-w-sm space-y-6 flex flex-col items-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to{" "}
                      <span className="text-foreground font-medium">
                        {emailForm.getValues().email}
                      </span>
                    </p>
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              autoFocus
                            >
                              <InputOTPGroup>
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <InputOTPSlot
                                    key={i}
                                    index={i}
                                    className="size-12 text-lg border-primary/30"
                                  />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage className="text-center" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={verifyEmail.isPending}
                    >
                      {verifyEmail.isPending ? "Verifying..." : "Confirm & View Results"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setGateState("email")}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
                    >
                      Use a different email
                    </button>
                  </form>
                </Form>
              )}
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-12 items-center md:items-start justify-between">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="text-sm text-primary font-mono uppercase tracking-widest mb-3">
                    Target Acquired
                  </div>
                  <h1
                    className="text-xl text-muted-foreground truncate max-w-md"
                    title={scoreData.linkedin_url}
                  >
                    {scoreData.linkedin_url}
                  </h1>
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-semibold mb-3">
                    {isLocked ? (
                      <Lock className="size-4" />
                    ) : (
                      <Activity className="size-4" />
                    )}
                    Archetype: {scoreData.archetype || "Analyzing..."}
                  </div>
                  <p
                    className={`text-muted-foreground leading-relaxed ${isLocked ? "blur-sm select-none" : ""}`}
                  >
                    {scoreData.archetype_description ||
                      "A comprehensive breakdown of your market positioning."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center min-w-[200px] shrink-0">
                <div className="relative flex items-center justify-center size-48 rounded-full border-4 border-secondary shadow-[0_0_40px_rgba(20,184,166,0.1)]">
                  <svg className="absolute inset-0 size-full -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="90"
                      className="stroke-secondary fill-none"
                      strokeWidth="8"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="90"
                      className={`stroke-primary fill-none transition-all duration-1000 ease-out ${isLocked ? "opacity-20" : ""}`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="565"
                      strokeDashoffset={
                        565 -
                        (565 * (isLocked ? 0 : scoreData.overall_score || 0)) /
                          100
                      }
                    />
                  </svg>
                  <div
                    className={`flex flex-col items-center text-center ${isLocked ? "blur-md select-none" : ""}`}
                  >
                    <span className="text-6xl font-display font-bold tracking-tighter">
                      {scoreData.overall_score || "--"}
                    </span>
                    <span className="text-sm text-muted-foreground uppercase tracking-widest mt-1">
                      Score
                    </span>
                  </div>
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="size-10 text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>
                <p
                  className={`mt-6 text-sm text-center text-muted-foreground ${isLocked ? "blur-sm select-none" : ""}`}
                >
                  You score higher than{" "}
                  <strong className="text-foreground">
                    {scoreData.percentile || "--"}%
                  </strong>{" "}
                  of peers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div
          className={`space-y-6 ${isLocked ? "blur-sm opacity-40 select-none pointer-events-none" : ""}`}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold">
              Category Diagnostics
            </h2>
            {!isLocked && (
              <Button
                onClick={handleDownloadPdf}
                variant="outline"
                size="sm"
                className="hidden sm:flex border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                <Download className="size-4 mr-2" /> Download Briefing
              </Button>
            )}
          </div>

          <div className="grid gap-6">
            {scoreData.categories?.map((cat, i) => (
              <div
                key={cat.key}
                className="p-6 rounded-xl border border-border/40 bg-card/50 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{cat.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                        cat.label.toLowerCase() === "elite"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : cat.label.toLowerCase() === "strong"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : cat.label.toLowerCase() === "developing"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-destructive/20 text-destructive border border-destructive/30"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-display font-bold">
                      {cat.score}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{cat.max_score}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${
                      cat.label.toLowerCase() === "elite"
                        ? "bg-primary"
                        : cat.label.toLowerCase() === "strong"
                          ? "bg-blue-500"
                          : cat.label.toLowerCase() === "developing"
                            ? "bg-amber-500"
                            : "bg-destructive"
                    }`}
                    style={{ width: `${(cat.score / cat.max_score) * 100}%` }}
                  />
                </div>

                <div className="mt-2 space-y-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Tactical Fixes:
                  </p>
                  <ul className="space-y-2">
                    {(cat.fixes ?? []).map((fix, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-foreground/80"
                      >
                        <ChevronRight className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {!isLocked && (
            <div className="mt-8 flex justify-center sm:hidden">
              <Button
                onClick={handleDownloadPdf}
                variant="outline"
                className="w-full border-primary/30"
              >
                <Download className="size-4 mr-2" /> Download Briefing PDF
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
