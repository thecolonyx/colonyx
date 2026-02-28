import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { AppLayout, QuickNav } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import BotPublicPage from "@/pages/bot-public";
import {
  Copy, RefreshCw, Wallet, TrendingUp, MessageSquare, Brain, Settings, Activity,
  Loader2, Trash2, ArrowUpRight, ArrowDownRight, ExternalLink, AlertTriangle, Bot,
  Power, Link2, ArrowRightLeft, Search, BarChart3, Flame, DollarSign, AreaChart,
  Unlink, Send, Zap
} from "lucide-react";

function TokenLogo({ logoUrl, symbol }: { logoUrl: string | null; symbol: string }) {
  const [imgError, setImgError] = useState(false);
  const fallbackText = (symbol || "??").slice(0, 2).toUpperCase();

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted/30 border border-border/30 flex items-center justify-center shrink-0">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xs font-bold text-muted-foreground">{fallbackText}</span>
      )}
    </div>
  );
}

export default function BotDetailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ botName: string }>();
  const botName = params.botName ? decodeURIComponent(params.botName) : "";

  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search || window.location.hash.split("?")[1] || "");
    return urlParams.get("x_connected") ? "posts" : "wallet";
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search || window.location.hash.split("?")[1] || "");
    if (urlParams.get("x_connected")) {
      toast({ title: "𝕏 Account Connected!", description: "Your agent can now post tweets and respond to mentions." });
    }
  }, []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");

  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tokenMint, setTokenMint] = useState("");
  const [tradeAmount, setTradeAmount] = useState("");

  const { data: botResponse, isLoading } = useQuery({
    queryKey: ["/api/bots/by-name", botName],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/by-name/${encodeURIComponent(botName)}`);
      return await res.json();
    },
    enabled: !!botName,
  });

  const bot = botResponse?.bot;
  const isOwner = botResponse?.isOwner === true;
  const botId = bot?.id?.toString();

  const { data: trades } = useQuery({
    queryKey: ["/api/bots", botId, "trades"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/${botId}/trades`);
      const data = await res.json();
      return data.trades || [];
    },
    enabled: !!botId && isOwner,
  });

  const { data: posts } = useQuery({
    queryKey: ["/api/bots", botId, "posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/${botId}/posts`);
      const data = await res.json();
      return data.posts || [];
    },
    enabled: !!botId && isOwner,
  });

  const { data: mentions } = useQuery({
    queryKey: ["/api/bots", botId, "mentions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/${botId}/mentions`);
      const data = await res.json();
      return data.mentions || [];
    },
    enabled: !!botId && isOwner,
  });

  const { data: activity } = useQuery({
    queryKey: ["/api/bots", botId, "activity"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/${botId}/activity`);
      const data = await res.json();
      return data.logs || [];
    },
    enabled: !!botId && isOwner,
  });

  const toggleMutation = useMutation({
    mutationFn: async (action: "pause" | "resume") => {
      await apiRequest("POST", `/api/bots/${botId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots/by-name", botName] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity/global"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", `/api/bots/${botId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots/by-name", botName] });
      toast({ title: "Saved", description: "Bot settings updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/bots/${botId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity/global"] });
      setLocation("/dashboard");
      toast({ title: "Bot deleted" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const tradeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/bots/${botId}/trade`, {
        action: tradeType,
        tokenMint,
        amountSol: tradeType === "buy" ? tradeAmount : undefined,
        amountTokens: tradeType === "sell" ? tradeAmount : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "trades"] });
      toast({ title: "Trade submitted" });
      setTokenMint("");
      setTradeAmount("");
    },
    onError: (err) => {
      toast({ title: "Trade failed", description: err.message, variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/bots/${botId}/wallet/withdraw`, {
        destinationAddress: withdrawAddress,
        amountSol: withdrawAmount,
      });
    },
    onSuccess: () => {
      setShowWithdrawModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bots/by-name", botName] });
      toast({ title: "Withdrawal submitted" });
    },
    onError: (err) => {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    },
  });

  const connectXMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bots/${botId}/x/connect`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const disconnectXMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/bots/${botId}/x/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots/by-name", botName] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({ title: "Disconnected", description: "𝕏 account disconnected" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testPostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bots/${botId}/x/test-post`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity/global"] });
      toast({ title: "Test post sent!", description: data.content?.substring(0, 80) + "..." });
    },
    onError: (err) => {
      toast({ title: "Test post failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: walletBalances, isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
    queryKey: ["/api/bots", botId, "wallet", "balances"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/${botId}/wallet/balances`);
      return await res.json();
    },
    refetchInterval: 30000,
    enabled: !!botId && isOwner,
  });

  const copyAddress = () => {
    if (bot?.walletAddress) {
      navigator.clipboard.writeText(bot.walletAddress);
      toast({ title: "Copied!" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-12 space-y-5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!bot) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-24 text-center">
          <h2 className="text-xl font-semibold">Bot not found</h2>
          <Button variant="secondary" className="mt-4" onClick={() => setLocation("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!isOwner) {
    return <BotPublicPage bot={bot} />;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight" data-testid="text-page-title">My Agent</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your agent in the colony</p>
          </div>
          <QuickNav />
        </div>

        <div className="rounded-xl lg:bg-gradient-to-b lg:from-white/[0.03] lg:to-transparent lg:p-6 lg:p-10 lg:-mx-4 lg:mb-6 lg:border lg:border-white/[0.06]">
          <div className="flex items-start justify-between gap-4 mb-6 lg:mb-10 flex-wrap">
            <div className="flex items-center gap-4 lg:gap-7">
              {bot.xProfileImageUrl ? (
                <img src={bot.xProfileImageUrl} alt={bot.botName} className="w-14 h-14 lg:w-20 lg:h-20 rounded-full object-cover shrink-0 ring-2 ring-border/20" data-testid="img-bot-pfp" />
              ) : (
                <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 lg:w-9 lg:h-9 text-white/40" />
                </div>
              )}
              <div>
                <h2 className="text-xl lg:text-3xl font-bold" data-testid="text-bot-name">{bot.botName}</h2>
                <div className="flex items-center gap-3 mt-1.5 lg:mt-2 flex-wrap">
                  <Badge
                    variant={bot.status === "active" ? "default" : "secondary"}
                    className={bot.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                    data-testid="badge-bot-status"
                  >
                    {bot.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground" data-testid="text-x-status">
                    𝕏: {bot.xUsername ? `@${bot.xUsername}` : "Not connected"}
                  </span>
                  <span className="text-xs text-muted-foreground" data-testid="text-commander">
                    Commander: @{bot.transactionCommanderX}
                  </span>
                  {bot.createdAt && (
                    <span className="text-xs text-muted-foreground hidden lg:inline" data-testid="text-created">
                      Created {new Date(bot.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/20 px-4 lg:px-6 py-2.5 lg:py-3.5 rounded-lg border border-border/30">
              <div className="hidden lg:flex flex-col mr-1">
                <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Agent Status</span>
                <span className="text-sm font-medium">
                  {bot.status === "active" ? "Active" : "Paused"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground lg:hidden">
                {bot.status === "active" ? "Active" : "Paused"}
              </span>
              <Switch
                checked={bot.status === "active"}
                onCheckedChange={(checked) => toggleMutation.mutate(checked ? "resume" : "pause")}
                data-testid="switch-bot-status"
              />
            </div>
          </div>
        </div>

        {!bot.xUsername && (
          <Card className="border-white/[0.1] bg-white/[0.03] mb-6 lg:mb-8 overflow-hidden" data-testid="banner-connect-x">
            <div className="h-0.5 bg-gradient-to-r from-white/30 to-white/10" />
            <CardContent className="p-5 lg:p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Link2 className="w-5 h-5 text-white/40" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Connect your 𝕏 account to activate your agent</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Your agent needs an 𝕏 account to post tweets, reply to mentions, and execute trades.</p>
                  </div>
                </div>
                <Button
                  className="bg-white text-black font-semibold gap-1.5"
                  onClick={() => connectXMutation.mutate()}
                  disabled={connectXMutation.isPending}
                  data-testid="button-connect-x-banner"
                >
                  {connectXMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Connect 𝕏 Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 mb-6 lg:mb-8" data-testid="card-agent-capabilities">
          <CardContent className="p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">What Your Agent Does</h3>
                <p className="text-[11px] text-muted-foreground">Runs on its own once you flip the switch</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white/40" />
                  </div>
                  <p className="text-sm font-semibold">Auto-Post</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your agent writes original tweets on its own using the personality you gave it. It posts every few hours, up to 8 times a day, and keeps track of what it already said so nothing repeats.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-white/40" />
                  </div>
                  <p className="text-sm font-semibold">Reply Mentions</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Checks for new mentions about once a minute. When someone tags your agent, it reads the message and fires back a reply that stays in character.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white/40" />
                  </div>
                  <p className="text-sm font-semibold">Trade via 𝕏</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your Commander sends a trade command by mentioning the agent on 𝕏. The agent confirms, asks for the contract address if needed, then executes the swap on chain through Jupiter.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/20 border border-border/40 mb-8 lg:mb-12 flex-wrap h-auto gap-0.5 lg:gap-1 p-1.5 lg:p-2 rounded-xl lg:rounded-2xl">
            <TabsTrigger value="wallet" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-wallet"><Wallet className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Wallet</TabsTrigger>
            <TabsTrigger value="market" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-market"><BarChart3 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Market</TabsTrigger>
            <TabsTrigger value="trading" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-trading"><TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Trading</TabsTrigger>
            <TabsTrigger value="posts" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-posts"><MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4" />𝕏 & Posts</TabsTrigger>
            <TabsTrigger value="personality" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-personality"><Brain className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Personality</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-settings"><Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Settings</TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 px-4 lg:px-6 py-2 lg:py-3 text-xs lg:text-sm" data-testid="tab-activity"><Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <div className="space-y-5 lg:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
                <Card className="border-border/50 h-full overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-white/20 to-white/5" />
                  <CardContent className="p-6 lg:p-8 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Wallet Info</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchBalances()}
                        className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        data-testid="button-refresh-balance"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${balancesLoading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Address</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono truncate flex-1" data-testid="text-wallet-full">{bot.walletAddress || "---"}</code>
                          <Button variant="ghost" size="icon" onClick={copyAddress} data-testid="button-copy">
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">SOL Balance</p>
                        <div className="flex items-baseline gap-2">
                          {balancesLoading ? (
                            <Skeleton className="h-10 w-48" />
                          ) : (
                            <>
                              <span className="text-3xl lg:text-4xl font-bold text-white font-mono" data-testid="text-sol-balance">
                                {walletBalances?.solBalance ? parseFloat(walletBalances.solBalance).toFixed(4) : "0.0000"}
                              </span>
                              <span className="text-lg text-muted-foreground">SOL</span>
                            </>
                          )}
                        </div>
                        {walletBalances?.solUsdValue > 0 && (
                          <p className="text-sm text-muted-foreground mt-1 font-mono" data-testid="text-sol-usd">
                            ≈ ${walletBalances.solUsdValue.toFixed(2)} USD
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Send SOL to this address to fund trades. The wallet is encrypted and only your account can access it.
                      </p>
                      {walletBalances?.lastUpdated && (
                        <p className="text-xs text-muted-foreground/60">
                          Last updated: {new Date(walletBalances.lastUpdated).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 h-full">
                  <CardContent className="p-6 lg:p-8 h-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Withdraw SOL</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Amount (SOL)</Label>
                        <Input
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.0"
                          type="number"
                          step="0.001"
                          className="bg-muted/30 border-border/50 font-mono"
                          data-testid="input-withdraw-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Destination Address</Label>
                        <Input
                          value={withdrawAddress}
                          onChange={(e) => setWithdrawAddress(e.target.value)}
                          placeholder="Solana wallet address"
                          className="bg-muted/30 border-border/50 font-mono"
                          data-testid="input-withdraw-address"
                        />
                      </div>
                      <Button
                        className="w-full bg-white text-black font-semibold"
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={!withdrawAmount || !withdrawAddress}
                        data-testid="button-withdraw"
                      >
                        Withdraw
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardContent className="p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-semibold">Token Holdings</h3>
                      <p className="text-xs text-muted-foreground mt-1">SPL tokens in this wallet</p>
                    </div>
                    {walletBalances?.tokens?.length > 0 && (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-token-count">
                        {walletBalances.tokens.length} token{walletBalances.tokens.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {balancesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : !walletBalances?.tokens || walletBalances.tokens.length === 0 ? (
                    <div className="py-16 text-center relative">
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "24px 24px" }} />
                      <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground" data-testid="status-no-tokens">No SPL tokens found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Tokens will appear here when the wallet holds any</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {walletBalances.tokens.map((token: any) => (
                        <div
                          key={token.mint}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
                          data-testid={`row-token-${token.symbol}`}
                        >
                          <TokenLogo logoUrl={token.logoUrl} symbol={token.symbol} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{token.name}</p>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{token.symbol}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate" title={token.mint}>
                              {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-mono font-medium" data-testid={`text-balance-${token.symbol}`}>
                              {parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </p>
                            {token.usdValue > 0 && (
                              <p className="text-xs text-muted-foreground font-mono">
                                ${token.usdValue.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="market">
            <MarketTab />
          </TabsContent>

          <TabsContent value="trading">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
              <Card className="border-border/50 lg:col-span-2 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-white/20 to-white/5" />
                <CardContent className="p-6 lg:p-8">
                  <h3 className="font-semibold mb-5">Quick Trade</h3>
                  <div className="flex items-center gap-3 mb-5">
                    <Button
                      variant={tradeType === "buy" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setTradeType("buy")}
                      className={tradeType === "buy" ? "bg-green-600 text-white" : ""}
                      data-testid="button-trade-buy"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Buy
                    </Button>
                    <Button
                      variant={tradeType === "sell" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setTradeType("sell")}
                      className={tradeType === "sell" ? "bg-red-600 text-white" : ""}
                      data-testid="button-trade-sell"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Sell
                    </Button>
                  </div>
                  <div className="space-y-4 mb-5">
                    <div className="space-y-2">
                      <Label>Token Mint Address</Label>
                      <Input
                        value={tokenMint}
                        onChange={(e) => setTokenMint(e.target.value)}
                        placeholder="Token mint address"
                        className="bg-muted/30 border-border/50 font-mono text-xs"
                        data-testid="input-token-mint"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{tradeType === "buy" ? "Amount (SOL)" : "Amount (Tokens)"}</Label>
                      <Input
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        placeholder="0.0"
                        type="number"
                        step="0.001"
                        className="bg-muted/30 border-border/50 font-mono"
                        data-testid="input-trade-amount"
                      />
                    </div>
                  </div>
                  {tradeType === "sell" && (
                    <div className="flex items-center gap-2 mb-5 flex-wrap">
                      {["25", "50", "75", "100"].map((pct) => (
                        <Button
                          key={pct}
                          variant="secondary"
                          size="sm"
                          onClick={() => setTradeAmount(pct)}
                          data-testid={`button-pct-${pct}`}
                        >
                          {pct}%
                        </Button>
                      ))}
                    </div>
                  )}
                  <Button
                    className="w-full bg-white text-black font-semibold"
                    disabled={!tokenMint || !tradeAmount || tradeMutation.isPending}
                    onClick={() => tradeMutation.mutate()}
                    data-testid="button-execute-trade"
                  >
                    {tradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Execute Trade
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50 lg:col-span-3">
                <CardContent className="p-6 lg:p-8">
                  <h3 className="font-semibold mb-4">Trade History</h3>
                  {!trades || trades.length === 0 ? (
                    <div className="py-12 text-center">
                      <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground" data-testid="status-no-trades">No trades yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-xs border-b border-border/30">
                            <th className="text-left py-2.5 pr-4">Date</th>
                            <th className="text-left py-2.5 pr-4">Type</th>
                            <th className="text-left py-2.5 pr-4">Token</th>
                            <th className="text-right py-2.5 pr-4">SOL</th>
                            <th className="text-left py-2.5 pr-4">Source</th>
                            <th className="text-left py-2.5 pr-4">Status</th>
                            <th className="text-left py-2.5">TX</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((trade: any) => (
                            <tr key={trade.id} className="border-b border-border/20" data-testid={`row-trade-${trade.id}`}>
                              <td className="py-3 pr-4 text-xs text-muted-foreground">
                                {new Date(trade.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant={trade.tradeType === "buy" ? "default" : "destructive"} className="text-xs">
                                  {trade.tradeType}
                                </Badge>
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs">{trade.tokenSymbol || trade.tokenMint?.slice(0, 8)}</td>
                              <td className="py-3 pr-4 text-right font-mono text-xs">{trade.amountSol}</td>
                              <td className="py-3 pr-4 text-xs">{trade.triggeredBy}</td>
                              <td className="py-3 pr-4">
                                <Badge variant="secondary" className={`text-xs ${trade.status === "completed" ? "bg-green-500/15 text-green-400 border-green-500/20" : trade.status === "failed" ? "bg-red-500/15 text-red-400 border-red-500/20" : ""}`}>
                                  {trade.status}
                                </Badge>
                              </td>
                              <td className="py-3">
                                {trade.txHash ? (
                                  <a href={`https://orbmarkets.io/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white" data-testid={`link-trade-tx-${trade.id}`}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                ) : <span className="text-muted-foreground/30">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="posts">
            <div className="space-y-5 lg:space-y-6">
              <Card className="border-border/50 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-blue-500/40 to-transparent" />
                <CardContent className="p-6 lg:p-8">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-semibold">𝕏 Connection</h3>
                      <p className="text-xs text-muted-foreground mt-1">Manage your agent's 𝕏 account connection</p>
                    </div>
                    {bot.xUsername ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-connected">
                        Connected as @{bot.xUsername}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-disconnected">Not connected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-5 flex-wrap">
                    {bot.xUsername ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => testPostMutation.mutate()}
                          disabled={testPostMutation.isPending}
                          data-testid="button-test-post"
                        >
                          {testPostMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Send Test Post
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => disconnectXMutation.mutate()}
                          disabled={disconnectXMutation.isPending}
                          data-testid="button-disconnect-x"
                        >
                          {disconnectXMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="bg-white text-black font-semibold gap-1.5"
                        size="sm"
                        onClick={() => connectXMutation.mutate()}
                        disabled={connectXMutation.isPending}
                        data-testid="button-connect-x"
                      >
                        {connectXMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                        Connect 𝕏 Account
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                <Card className="border-border/50">
                  <CardContent className="p-6 lg:p-8">
                    <h3 className="font-semibold mb-4">Recent Posts</h3>
                    {!posts || posts.length === 0 ? (
                      <div className="py-10 text-center">
                        <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground" data-testid="status-no-posts">No posts yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {posts.map((post: any) => (
                          <div key={post.id} className="p-4 rounded-md bg-muted/20 border border-border/30" data-testid={`card-post-${post.id}`}>
                            <p className="text-sm leading-relaxed">{post.content}</p>
                            <div className="flex items-center gap-2 mt-2.5">
                              <span className="text-xs text-muted-foreground">
                                {post.postedAt ? new Date(post.postedAt).toLocaleString() : "Pending"}
                              </span>
                              <Badge variant="secondary" className="text-xs">{post.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6 lg:p-8">
                    <h3 className="font-semibold mb-4">Mentions & Replies</h3>
                    {!mentions || mentions.length === 0 ? (
                      <div className="py-10 text-center">
                        <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground" data-testid="status-no-mentions">No mentions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mentions.map((mention: any) => (
                          <div key={mention.id} className="p-4 rounded-md bg-muted/20 border border-border/30" data-testid={`card-mention-${mention.id}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium">@{mention.authorXUsername}</span>
                              {mention.isCommand && (
                                <Badge className="bg-white/[0.06] text-white/50 border-white/[0.08] text-xs">
                                  {mention.commandType}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{mention.mentionText}</p>
                            {mention.replyText && (
                              <div className="mt-2.5 pl-3 border-l-2 border-white/[0.1]">
                                <p className="text-sm">{mention.replyText}</p>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground mt-2 block">
                              {new Date(mention.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="personality">
            <PersonalityTab bot={bot} onSave={(data: any) => updateMutation.mutate(data)} saving={updateMutation.isPending} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab
              bot={bot}
              onSave={(data: any) => updateMutation.mutate(data)}
              onDelete={() => setShowDeleteModal(true)}
              saving={updateMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="border-border/50">
              <CardContent className="p-6 lg:p-8">
                <h3 className="font-semibold mb-4">Activity Log</h3>
                {!activity || activity.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground" data-testid="status-no-activity">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activity.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 py-3 border-b border-border/20" data-testid={`row-log-${log.id}`}>
                        <div className="w-2 h-2 rounded-full bg-white/30 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{log.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                            {log.source ? ` via ${log.source}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Bot
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete your bot, wallet, and all data. This cannot be undone.
          </p>
          <div className="space-y-2">
            <Label>Type "{bot.botName}" to confirm</Label>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={bot.botName}
              className="bg-muted/30 border-border/50"
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteConfirmName !== bot.botName || deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Withdraw <span className="font-mono text-white">{withdrawAmount} SOL</span> to{" "}
            <span className="font-mono text-xs">{withdrawAddress}</span>?
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowWithdrawModal(false)}>Cancel</Button>
            <Button
              className="bg-white text-black font-semibold"
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
              data-testid="button-confirm-withdraw"
            >
              {withdrawMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PersonalityTab({ bot, onSave, saving }: { bot: any; onSave: (d: any) => void; saving: boolean }) {
  const [prompt, setPrompt] = useState(bot.personalityPrompt || "");

  return (
    <div className="space-y-5 lg:space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Brain className="w-5 h-5 text-white/40" />
              </div>
              <h3 className="font-semibold text-lg">Personality</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Write a custom prompt that defines how your agent talks on 𝕏</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Personality Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[160px] lg:min-h-[220px] bg-muted/30 border-border/50"
              data-testid="input-edit-prompt"
            />
          </div>
          <Button
            className="bg-white text-black font-semibold"
            onClick={() => onSave({ personalityPrompt: prompt })}
            disabled={saving}
            data-testid="button-save-personality"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniSparkline({ data, width = 120, height = 32, color = "#ffffff" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPrice(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

function MarketTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dexSearchQuery, setDexSearchQuery] = useState("");
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [selectedDexToken, setSelectedDexToken] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"coingecko" | "dex">("coingecko");

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ["/api/crypto/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { coins: [] };
      const res = await apiRequest("GET", `/api/crypto/search?q=${encodeURIComponent(searchQuery)}`);
      return await res.json();
    },
    enabled: searchQuery.length >= 2 && searchMode === "coingecko",
  });

  const { data: dexResults, isFetching: dexSearching } = useQuery({
    queryKey: ["/api/crypto/dex/search", dexSearchQuery],
    queryFn: async () => {
      if (!dexSearchQuery || dexSearchQuery.length < 2) return { pairs: [] };
      const res = await apiRequest("GET", `/api/crypto/dex/search/${encodeURIComponent(dexSearchQuery)}`);
      return await res.json();
    },
    enabled: dexSearchQuery.length >= 2 && searchMode === "dex",
  });

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["/api/crypto/trending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/crypto/trending");
      return await res.json();
    },
    refetchInterval: 120000,
  });

  const { data: coinDetail, isLoading: coinLoading } = useQuery({
    queryKey: ["/api/crypto/price", selectedCoinId],
    queryFn: async () => {
      if (!selectedCoinId) return null;
      const res = await apiRequest("GET", `/api/crypto/price/${selectedCoinId}`);
      return await res.json();
    },
    enabled: !!selectedCoinId,
    refetchInterval: 60000,
  });

  const { data: dexDetail, isLoading: dexLoading } = useQuery({
    queryKey: ["/api/crypto/dex", selectedDexToken],
    queryFn: async () => {
      if (!selectedDexToken) return null;
      const res = await apiRequest("GET", `/api/crypto/dex/${selectedDexToken}`);
      return await res.json();
    },
    enabled: !!selectedDexToken,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        <div className="lg:col-span-1 space-y-5">
          <Card className="border-border/50">
            <CardContent className="p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-white/40" />
                <h3 className="text-sm font-semibold">Token Search</h3>
              </div>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={searchMode === "coingecko" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setSearchMode("coingecko")}
                  className={searchMode === "coingecko" ? "bg-white text-black" : ""}
                  data-testid="button-search-cg"
                >
                  CoinGecko
                </Button>
                <Button
                  variant={searchMode === "dex" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setSearchMode("dex")}
                  className={searchMode === "dex" ? "bg-white text-black" : ""}
                  data-testid="button-search-dex"
                >
                  DexScreener
                </Button>
              </div>
              {searchMode === "coingecko" ? (
                <>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tokens (e.g. SOL, BTC)"
                    className="bg-muted/30 border-border/50 mb-3"
                    data-testid="input-crypto-search"
                  />
                  {searching && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>}
                  {searchResults?.coins?.length > 0 && (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {searchResults.coins.map((coin: any) => (
                        <button
                          key={coin.id}
                          onClick={() => { setSelectedCoinId(coin.id); setSelectedDexToken(null); }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                            selectedCoinId === coin.id ? "bg-white/[0.08] border border-white/[0.1]" : "hover:bg-muted/30"
                          }`}
                          data-testid={`search-result-${coin.id}`}
                        >
                          {coin.thumb && <img src={coin.thumb} alt={coin.symbol} className="w-6 h-6 rounded-full" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{coin.name}</p>
                            <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
                          </div>
                          {coin.marketCapRank && (
                            <span className="text-[10px] text-muted-foreground/60">#{coin.marketCapRank}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Input
                    value={dexSearchQuery}
                    onChange={(e) => setDexSearchQuery(e.target.value)}
                    placeholder="Search Solana tokens / paste address"
                    className="bg-muted/30 border-border/50 mb-3"
                    data-testid="input-dex-search"
                  />
                  {dexSearching && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>}
                  {dexResults?.pairs?.length > 0 && (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {dexResults.pairs.map((pair: any) => (
                        <button
                          key={pair.pairAddress}
                          onClick={() => { setSelectedDexToken(pair.baseToken.address); setSelectedCoinId(null); }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                            selectedDexToken === pair.baseToken.address ? "bg-white/[0.08] border border-white/[0.1]" : "hover:bg-muted/30"
                          }`}
                          data-testid={`dex-result-${pair.pairAddress}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{pair.baseToken.symbol}/{pair.quoteToken.symbol}</p>
                            <p className="text-xs text-muted-foreground">{pair.dexId}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-mono">{pair.priceUsd ? formatPrice(parseFloat(pair.priceUsd)) : "—"}</p>
                            <p className={`text-[10px] font-mono ${pair.priceChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {pair.priceChange24h >= 0 ? "+" : ""}{pair.priceChange24h?.toFixed(1)}%
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-white/40" />
                <h3 className="text-sm font-semibold">Trending</h3>
              </div>
              {trendingLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-1">
                  {(trendingData?.coins || []).slice(0, 8).map((coin: any, idx: number) => (
                    <button
                      key={coin.id}
                      onClick={() => { setSelectedCoinId(coin.id); setSelectedDexToken(null); }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors text-left ${
                        selectedCoinId === coin.id ? "bg-white/[0.08] border border-white/[0.1]" : "hover:bg-muted/30"
                      }`}
                      data-testid={`trending-${coin.id}`}
                    >
                      <span className="text-xs text-muted-foreground/50 w-4 text-right shrink-0">{idx + 1}</span>
                      {coin.thumb && <img src={coin.thumb} alt={coin.symbol} className="w-5 h-5 rounded-full" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{coin.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground uppercase shrink-0">{coin.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {selectedCoinId && (
            <>
              {coinLoading ? (
                <Card className="border-border/50">
                  <CardContent className="p-6 lg:p-8 space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ) : coinDetail ? (
                <>
                  <Card className="border-border/50">
                    <CardContent className="p-6 lg:p-8">
                      <div className="flex items-center gap-4 mb-6">
                        {coinDetail.image && <img src={coinDetail.image} alt={coinDetail.symbol} className="w-12 h-12 rounded-full" />}
                        <div>
                          <h3 className="text-xl font-bold">{coinDetail.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs uppercase">{coinDetail.symbol}</Badge>
                            {coinDetail.marketCapRank && (
                              <Badge variant="secondary" className="text-xs">Rank #{coinDetail.marketCapRank}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-2xl lg:text-3xl font-bold font-mono text-white" data-testid="text-coin-price">
                            {formatPrice(coinDetail.currentPrice)}
                          </p>
                          <p className={`text-sm font-mono font-medium ${coinDetail.priceChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {coinDetail.priceChange24h >= 0 ? "+" : ""}{coinDetail.priceChange24h?.toFixed(2)}% (24h)
                          </p>
                        </div>
                      </div>

                      {coinDetail.sparkline7d?.length > 0 && (
                        <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground mb-2">7-Day Price Chart</p>
                          <MiniSparkline
                            data={coinDetail.sparkline7d}
                            width={600}
                            height={80}
                            color={coinDetail.priceChange7d >= 0 ? "#4ade80" : "#f87171"}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">Market Cap</p>
                          <p className="text-sm font-mono font-semibold mt-1">{formatCompact(coinDetail.marketCap)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">24h Volume</p>
                          <p className="text-sm font-mono font-semibold mt-1">{formatCompact(coinDetail.totalVolume)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">24h High</p>
                          <p className="text-sm font-mono font-semibold mt-1 text-green-400">{formatPrice(coinDetail.high24h)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">24h Low</p>
                          <p className="text-sm font-mono font-semibold mt-1 text-red-400">{formatPrice(coinDetail.low24h)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">7d Change</p>
                          <p className={`text-sm font-mono font-semibold mt-1 ${coinDetail.priceChange7d >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {coinDetail.priceChange7d >= 0 ? "+" : ""}{coinDetail.priceChange7d?.toFixed(2)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">30d Change</p>
                          <p className={`text-sm font-mono font-semibold mt-1 ${coinDetail.priceChange30d >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {coinDetail.priceChange30d >= 0 ? "+" : ""}{coinDetail.priceChange30d?.toFixed(2)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-xs text-muted-foreground">ATH</p>
                          <p className="text-sm font-mono font-semibold mt-1">{formatPrice(coinDetail.ath)}</p>
                          <p className="text-[10px] text-red-400 font-mono">{coinDetail.athChangePercentage?.toFixed(1)}%</p>
                        </div>
                      </div>

                      {coinDetail.circulatingSupply > 0 && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                            <p className="text-xs text-muted-foreground">Circulating Supply</p>
                            <p className="text-sm font-mono font-semibold mt-1">{coinDetail.circulatingSupply?.toLocaleString()}</p>
                          </div>
                          {coinDetail.totalSupply > 0 && (
                            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                              <p className="text-xs text-muted-foreground">Total Supply</p>
                              <p className="text-sm font-mono font-semibold mt-1">{coinDetail.totalSupply?.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {coinDetail.lastUpdated && (
                        <p className="text-xs text-muted-foreground/50 mt-4">
                          Last updated: {new Date(coinDetail.lastUpdated).toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </>
          )}

          {selectedDexToken && (
            <>
              {dexLoading ? (
                <Card className="border-border/50">
                  <CardContent className="p-6 lg:p-8 space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ) : dexDetail?.pairs?.length > 0 ? (
                <div className="space-y-4">
                  {dexDetail.pairs.map((pair: any) => (
                    <Card key={pair.pairAddress} className="border-border/50">
                      <CardContent className="p-5 lg:p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            {pair.info?.imageUrl && <img src={pair.info.imageUrl} alt={pair.baseToken.symbol} className="w-8 h-8 rounded-full" />}
                            <div>
                              <h4 className="font-semibold">{pair.baseToken.symbol}/{pair.quoteToken.symbol}</h4>
                              <p className="text-xs text-muted-foreground">{pair.dexId} on {pair.chainId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold font-mono text-white">
                              {pair.priceUsd ? formatPrice(parseFloat(pair.priceUsd)) : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                          {[
                            { label: "5m", val: pair.priceChange5m },
                            { label: "1h", val: pair.priceChange1h },
                            { label: "6h", val: pair.priceChange6h },
                            { label: "24h", val: pair.priceChange24h },
                          ].map((ch) => (
                            <div key={ch.label} className="p-2.5 rounded-lg bg-muted/20 border border-border/30 text-center">
                              <p className="text-xs text-muted-foreground">{ch.label}</p>
                              <p className={`text-sm font-mono font-semibold ${ch.val >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {ch.val >= 0 ? "+" : ""}{ch.val?.toFixed(2)}%
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                            <p className="text-xs text-muted-foreground">Liquidity</p>
                            <p className="text-sm font-mono font-semibold mt-0.5">{formatCompact(pair.liquidity)}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                            <p className="text-xs text-muted-foreground">24h Vol</p>
                            <p className="text-sm font-mono font-semibold mt-0.5">{formatCompact(pair.volume24h)}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                            <p className="text-xs text-muted-foreground">FDV</p>
                            <p className="text-sm font-mono font-semibold mt-0.5">{formatCompact(pair.fdv)}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                            <p className="text-xs text-muted-foreground">24h Txns</p>
                            <p className="text-xs font-mono mt-0.5">
                              <span className="text-green-400">{pair.txns24h.buys} buys</span>
                              {" / "}
                              <span className="text-red-400">{pair.txns24h.sells} sells</span>
                            </p>
                          </div>
                        </div>

                        {pair.url && (
                          <a href={pair.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-xs text-white/50 hover:text-white" data-testid={`link-dex-${pair.pairAddress}`}>
                            <ExternalLink className="w-3 h-3" /> View on DexScreener
                          </a>
                        )}

                        <div className="mt-3 pt-3 border-t border-border/20">
                          <p className="text-xs text-muted-foreground mb-1">Token Address</p>
                          <code className="text-xs font-mono text-muted-foreground/80 break-all">{pair.baseToken.address}</code>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No DEX pairs found for this token</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!selectedCoinId && !selectedDexToken && (
            <Card className="border-border/50">
              <CardContent className="p-12 lg:p-16 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground/15 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Market Data</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Search for any crypto token to view real-time prices, market data, and DEX liquidity. 
                  Use CoinGecko for major tokens or DexScreener for Solana DEX pairs.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ bot, onSave, onDelete, saving }: { bot: any; onSave: (d: any) => void; onDelete: () => void; saving: boolean }) {
  const [name, setName] = useState(bot.botName);
  const [commander, setCommander] = useState(bot.transactionCommanderX);

  return (
    <div className="space-y-5 lg:space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-6 lg:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Settings className="w-5 h-5 text-white/40" />
              </div>
              <h3 className="font-semibold text-lg">General Settings</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Configure your agent's basic settings and intervals</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Agent Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/30 border-border/50"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Transaction Commander 𝕏 Username</Label>
              <Input
                value={commander}
                onChange={(e) => setCommander(e.target.value)}
                className="bg-muted/30 border-border/50"
                data-testid="input-edit-commander"
              />
              <p className="text-xs text-white/50">
                Changing this transfers trade command authority to a new 𝕏 account
              </p>
            </div>
          </div>
          <Button
            className="bg-white text-black font-semibold"
            onClick={() => onSave({
              botName: name,
              transactionCommanderX: commander.replace("@", ""),
            })}
            disabled={saving}
            data-testid="button-save-settings"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="p-6 lg:p-8">
          <h3 className="font-semibold text-destructive text-lg mb-3">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this agent and all associated data including wallet and trade history.
          </p>
          <Button variant="destructive" onClick={onDelete} data-testid="button-delete-bot">
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete Agent
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
