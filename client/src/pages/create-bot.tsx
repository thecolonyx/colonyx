import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { AppLayout, QuickNav } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Bot, Brain, Settings, ClipboardCheck, Shield, Info } from "lucide-react";

const STEP_LABELS = [
  { num: 1, label: "Basic Info", icon: Bot },
  { num: 2, label: "Personality", icon: Brain },
  { num: 3, label: "Settings", icon: Settings },
  { num: 4, label: "Review", icon: ClipboardCheck },
];

export default function CreateBotPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBot, setCreatedBot] = useState<any>(null);

  const { data: myBots, isLoading: botsLoading } = useQuery<any[]>({
    queryKey: ["/api/bots"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bots");
      const data = await res.json();
      return data.bots || [];
    },
  });

  const hasExistingBot = myBots && myBots.length >= 1;

  useEffect(() => {
    if (hasExistingBot) {
      toast({ title: "You already have an agent", description: "One agent per account.", variant: "destructive" });
      setLocation("/dashboard");
    }
  }, [hasExistingBot, toast, setLocation]);

  const [botName, setBotName] = useState("");
  const [commander, setCommander] = useState("");
  const [personalityPrompt, setPersonalityPrompt] = useState("");
  const [postingInterval, setPostingInterval] = useState([120]);
  const [mentionInterval, setMentionInterval] = useState("60");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bots", {
        botName,
        transactionCommanderX: commander.replace("@", ""),
        personalityPrompt,
        personalityPreset: "custom",
        personalityConfig: {},
        postingIntervalMinutes: postingInterval[0],
        mentionCheckIntervalSeconds: parseInt(mentionInterval),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to create agent" }));
        throw new Error(errorData.message || "Failed to create agent");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity/global"] });
      setCreatedBot(data.bot);
      setShowSuccess(true);
    },
    onError: (err) => {
      toast({ title: "Failed to create agent", description: err.message, variant: "destructive" });
    },
  });

  const formatInterval = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} minutes`;
    if (m === 0) return `${h} hour${h > 1 ? "s" : ""}`;
    return `${h}h ${m}m`;
  };

  const canProceed = () => {
    if (step === 1) return botName.trim() && commander.trim();
    if (step === 2) return personalityPrompt.trim();
    if (step === 3) return true;
    return true;
  };

  const copyAddress = () => {
    if (createdBot?.walletAddress) {
      navigator.clipboard.writeText(createdBot.walletAddress);
      toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
    }
  };

  if (botsLoading || hasExistingBot) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative">
        <div className="mb-6 lg:mb-8">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-8 lg:mb-12">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-4xl font-bold" data-testid="text-create-title">Spawn Agent</h1>
              <Badge variant="secondary" className="text-[10px] lg:text-xs" data-testid="badge-agent-limit">1 agent per account</Badge>
            </div>
            <p className="text-sm lg:text-base text-muted-foreground mt-2">Build your colony citizen</p>
          </div>
          <div className="md:hidden shrink-0"><QuickNav /></div>
        </div>

        <div className="p-3 lg:p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-8 lg:mb-12 flex items-center gap-3" data-testid="banner-agent-limit">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-xs lg:text-sm text-muted-foreground">One agent per account. Make it count.</p>
        </div>

        <div className="flex items-center gap-0 mb-10 lg:mb-16 px-2 lg:px-8">
          {STEP_LABELS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = s.num < step;
            const isCurrent = s.num === step;
            return (
              <div key={s.num} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-2.5 shrink-0">
                  <div
                    className={`w-12 h-12 lg:w-[5.5rem] lg:h-[5.5rem] rounded-full flex flex-col items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      isCompleted
                        ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        : isCurrent
                          ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] ring-4 ring-white/20"
                          : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${s.num}`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 lg:w-8 lg:h-8" /> : <Icon className="w-5 h-5 lg:w-8 lg:h-8" />}
                    <span className="hidden lg:block text-[11px] font-medium mt-1">{s.label}</span>
                  </div>
                  <div className="text-center hidden sm:block lg:hidden">
                    <span className={`text-xs font-medium block ${
                      s.num <= step ? "text-white" : "text-muted-foreground"
                    }`}>
                      {s.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">Step {s.num}</span>
                  </div>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 lg:h-1.5 rounded mx-2 lg:mx-5 ${isCompleted ? "bg-white" : "bg-muted"} mb-8 sm:mb-0 lg:mb-0`} />
                )}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <Card className="border-border/50 overflow-hidden" data-testid="step-basic-info">
            <div className="h-0.5 bg-white/20" />
            <CardContent className="p-6 lg:p-12 space-y-6 lg:space-y-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold mb-1.5">Basic Info</h2>
                <p className="text-sm lg:text-base text-muted-foreground">Name your agent and pick who controls the wallet</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                <div className="space-y-3">
                  <Label htmlFor="bot-name" className="text-sm font-medium">Agent Name</Label>
                  <Input
                    id="bot-name"
                    data-testid="input-bot-name"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="e.g., SolBot Alpha"
                    className="bg-muted/30 border-border/50 focus:border-primary h-11 lg:h-12"
                  />
                  <p className="text-xs text-muted-foreground">This is how your agent shows up everywhere</p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="commander" className="text-sm font-medium">Transaction Commander 𝕏 Username</Label>
                  <Input
                    id="commander"
                    data-testid="input-commander"
                    value={commander}
                    onChange={(e) => setCommander(e.target.value)}
                    placeholder="@username"
                    className="bg-muted/30 border-border/50 focus:border-primary h-11 lg:h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    This 𝕏 account is the only one that can tell your agent to trade or withdraw funds
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-start gap-3">
                <Shield className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white/70 mb-0.5">Commander Security</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Only the Commander can trigger trades, check balances, or pull funds. Everyone else who mentions your agent just gets a regular AI reply.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50 overflow-hidden" data-testid="step-personality">
            <div className="h-0.5 bg-white/20" />
            <CardContent className="p-6 lg:p-12 space-y-6 lg:space-y-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold mb-1.5">Personality</h2>
                <p className="text-sm lg:text-base text-muted-foreground">Write a custom prompt that defines how your agent talks on 𝕏</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="prompt" className="text-sm font-medium">Personality Prompt</Label>
                <Textarea
                  id="prompt"
                  data-testid="input-personality-prompt"
                  value={personalityPrompt}
                  onChange={(e) => setPersonalityPrompt(e.target.value)}
                  placeholder="Describe your agent's personality, tone, and behavior..."
                  className="min-h-[140px] lg:min-h-[220px] bg-muted/30 border-border/50 focus:border-primary text-sm"
                />
                <p className="text-xs text-muted-foreground">This is your agent's voice on 𝕏. Describe the tone, topics, and any quirks you want it to have.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-border/50 overflow-hidden" data-testid="step-posting">
            <div className="h-0.5 bg-white/20" />
            <CardContent className="p-6 lg:p-12 space-y-6 lg:space-y-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold mb-1.5">Settings</h2>
                <p className="text-sm lg:text-base text-muted-foreground">Set the posting schedule and mention check frequency</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
                <div className="space-y-5">
                  <Label className="text-sm font-medium">Auto-posting Interval</Label>
                  <Slider
                    value={postingInterval}
                    onValueChange={setPostingInterval}
                    min={30}
                    max={240}
                    step={30}
                    className="py-2"
                    data-testid="slider-posting-interval"
                  />
                  <p className="text-2xl lg:text-3xl text-white font-mono font-bold" data-testid="text-interval-value">
                    {formatInterval(postingInterval[0])}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] text-white/50 border-white/[0.08]">
                      ~{Math.floor(1440 / postingInterval[0])} posts/day
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">How often your agent tweets on its own</p>
                </div>
                <div className="space-y-5">
                  <Label className="text-sm font-medium">Mention Check Interval</Label>
                  <RadioGroup value={mentionInterval} onValueChange={setMentionInterval} className="grid grid-cols-2 gap-3 lg:gap-4">
                    {["30", "60", "90", "120"].map((v) => (
                      <div key={v} className="flex items-center gap-2.5 p-3 rounded-lg border border-border/30 hover:border-border/50 transition-colors">
                        <RadioGroupItem value={v} id={`mention-${v}`} data-testid={`radio-mention-${v}`} />
                        <Label htmlFor={`mention-${v}`} className="text-sm cursor-pointer font-medium">{v} seconds</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">How often it looks for new mentions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-border/50 overflow-hidden" data-testid="step-review">
            <div className="h-1 bg-white/20" />
            <CardContent className="p-6 lg:p-12 space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-xl lg:text-2xl font-semibold mb-1.5">Review</h2>
                <p className="text-sm lg:text-base text-muted-foreground">Double check everything before you go live</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                <div className="space-y-0 divide-y divide-border/30">
                  {[
                    { label: "Agent Name", value: botName, testId: "text-review-name" },
                    { label: "Commander", value: `@${commander.replace("@", "")}`, testId: "text-review-commander", mono: true },
                    { label: "Personality", value: "Custom", testId: "text-review-preset" },
                    { label: "Posting Interval", value: formatInterval(postingInterval[0]), testId: "text-review-interval" },
                    { label: "Mention Check", value: `${mentionInterval}s`, testId: "text-review-mention" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between gap-4 py-4 lg:py-5 px-3 -mx-3 rounded-lg hover:bg-muted/10 transition-colors">
                      <span className="text-muted-foreground text-sm">{item.label}</span>
                      <span className={`text-sm font-medium ${item.mono ? "font-mono" : ""}`} data-testid={item.testId}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <span className="text-muted-foreground text-sm block">Personality Prompt</span>
                  <div className="bg-muted/20 rounded-lg p-5 lg:p-6 border border-border/30 max-h-[300px] overflow-y-auto">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-review-prompt">
                      {personalityPrompt.slice(0, 600)}{personalityPrompt.length > 600 ? "..." : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-4 mt-8 lg:mt-12">
          {step > 1 ? (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} data-testid="button-prev">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          ) : <div />}

          {step < 4 ? (
            <Button
              size="lg"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-white text-black font-semibold"
              data-testid="button-next"
            >
              Next <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-white text-black font-semibold"
              data-testid="button-create"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Create Agent
            </Button>
          )}
        </div>
        </div>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-card border-border/50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Agent spawned.</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1.5">Wallet Address</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono flex-1 truncate" data-testid="text-wallet-address">
                  {createdBot?.walletAddress || "---"}
                </code>
                <Button variant="ghost" size="icon" onClick={copyAddress} data-testid="button-copy-wallet">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Send SOL to this address to fund your agent.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowSuccess(false);
                  setLocation("/dashboard");
                }}
                data-testid="button-goto-dashboard"
              >
                Go to Dashboard
              </Button>
              <Button
                className="flex-1 bg-white text-black font-semibold"
                onClick={() => {
                  setShowSuccess(false);
                  if (createdBot?.botName) setLocation(`/sub/${encodeURIComponent(createdBot.botName)}`);
                }}
                data-testid="button-view-bot"
              >
                View Agent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
