import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/auth";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Copy, Bot, Activity, MessageSquare, ArrowUpRight, ArrowDownRight,
  ExternalLink, Zap, Link2, PauseCircle, PlayCircle, Users,
  Calendar, Wallet, ArrowLeft,
} from "lucide-react";

interface PublicBot {
  id: number;
  botName: string;
  status: string;
  personalityPreset?: string;
  createdAt: string | null;
  walletAddress: string | null;
  xUsername: string | null;
  xProfileImageUrl: string | null;
  xFollowerCount: number;
  ownerUsername: string;
}

interface CombinedActivityItem {
  id: string;
  type: "tweet" | "trade" | "system";
  action: string;
  botId: number;
  botName: string;
  ownerUsername: string;
  botProfileImageUrl: string | null;
  details: any;
  createdAt: string | null;
}

interface BotPost {
  id: number;
  botId: number;
  content: string | null;
  tweetId: string | null;
  postType: string | null;
  status: string | null;
  createdAt: string | null;
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function actionToSentence(item: CombinedActivityItem): string {
  const { action, botName, details } = item;
  switch (action) {
    case "tweet_posted":
      return `${botName} posted a tweet`;
    case "reply_posted":
      return `${botName} replied to a mention`;
    case "token_bought":
      return `${botName} bought ${details?.tokenSymbol ? `$${details.tokenSymbol}` : "a token"}${details?.amountSol ? ` for ${details.amountSol} SOL` : ""}`;
    case "token_sold":
      return `${botName} sold ${details?.tokenSymbol ? `$${details.tokenSymbol}` : "a token"}`;
    case "trade_command_received":
      return `${botName} received a trade command`;
    case "trade_buy_failed":
    case "trade_sell_failed":
      return `${botName} trade failed`;
    case "bot_created":
      return `${details?.botName || botName} was created`;
    case "x_account_connected":
      return `${botName} connected to 𝕏`;
    case "x_account_disconnected":
      return `${botName} disconnected from 𝕏`;
    case "bot_paused":
      return `${botName} was paused`;
    case "bot_resumed":
      return `${botName} was resumed`;
    case "withdrawal_completed":
      return `${botName} withdrew ${details?.amountSol ? `${details.amountSol} SOL` : "funds"}`;
    default:
      return `${botName} — ${action.replace(/_/g, " ")}`;
  }
}

function activityDotColor(type: string, action: string): string {
  if (type === "tweet") return "bg-blue-500/15";
  if (type === "trade") {
    if (action.includes("bought") || action.includes("buy")) return "bg-green-500/15";
    if (action.includes("sold") || action.includes("sell")) return "bg-red-500/15";
    return "bg-yellow-500/15";
  }
  return "bg-white/[0.06]";
}

function activityIcon(type: string, action: string) {
  if (type === "tweet") return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
  if (type === "trade") {
    if (action.includes("bought") || action.includes("buy")) return <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />;
    return <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />;
  }
  if (action === "x_account_connected") return <Link2 className="w-3.5 h-3.5 text-white/50" />;
  if (action === "bot_paused") return <PauseCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  if (action === "bot_resumed") return <PlayCircle className="w-3.5 h-3.5 text-green-400" />;
  return <Zap className="w-3.5 h-3.5 text-white/50" />;
}

export default function BotPublicPage({ bot }: { bot: PublicBot }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("activity");
  const [showCount, setShowCount] = useState(15);

  const botName = bot.botName;

  const { data: activityData, isLoading: activityLoading } = useQuery<{ items: CombinedActivityItem[] }>({
    queryKey: ["/api/bots/by-name", botName, "activity"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/by-name/${encodeURIComponent(botName)}/activity`);
      return res.json();
    },
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: BotPost[] }>({
    queryKey: ["/api/bots/by-name", botName, "posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bots/by-name/${encodeURIComponent(botName)}/posts`);
      return res.json();
    },
  });

  const activityItems = activityData?.items || [];
  const posts = postsData?.posts || [];
  const visibleActivity = activityItems.slice(0, showCount);

  const copyAddress = () => {
    if (bot.walletAddress) {
      navigator.clipboard.writeText(bot.walletAddress);
      toast({ title: "Copied!" });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <Link href="/all-agents">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6" data-testid="link-back-sub-agents">
            <ArrowLeft className="w-4 h-4" />
            Back to Colony
          </button>
        </Link>

        <div className="rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent p-6 lg:p-8 border border-white/[0.06] mb-6">
          <div className="flex items-start gap-5 lg:gap-7">
            {bot.xProfileImageUrl ? (
              <img
                src={bot.xProfileImageUrl}
                alt={bot.botName}
                className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover shrink-0 ring-2 ring-white/10"
                data-testid="img-bot-pfp"
              />
            ) : (
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                <Bot className="w-7 h-7 lg:w-9 lg:h-9 text-white/40" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl lg:text-3xl font-bold tracking-tight" data-testid="text-bot-name">{bot.botName}</h1>
                <Badge
                  variant={bot.status === "active" ? "default" : "secondary"}
                  className={bot.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                  data-testid="badge-bot-status"
                >
                  {bot.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-muted-foreground">
                {bot.xUsername && (
                  <a
                    href={`https://x.com/${bot.xUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/60 hover:text-white font-mono text-xs transition-colors"
                    data-testid="link-x-profile"
                  >
                    @{bot.xUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {bot.xFollowerCount > 0 && (
                  <span className="flex items-center gap-1 text-xs" data-testid="text-followers">
                    <Users className="w-3 h-3" />
                    {formatFollowers(bot.xFollowerCount)} followers
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground/60">
                <span data-testid="text-owner">by @{bot.ownerUsername}</span>
                {bot.createdAt && (
                  <span className="flex items-center gap-1" data-testid="text-created">
                    <Calendar className="w-3 h-3" />
                    {new Date(bot.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {bot.walletAddress && (
          <Card className="border-white/[0.06] mb-6" data-testid="card-wallet-address">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Wallet Address</p>
                  <code className="text-xs font-mono truncate block" data-testid="text-wallet-address">{bot.walletAddress}</code>
                </div>
                <Button variant="ghost" size="icon" onClick={copyAddress} className="shrink-0" data-testid="button-copy-address">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/[0.03] border border-white/[0.06] mb-6 lg:mb-8 p-1.5 rounded-xl">
            <TabsTrigger value="activity" className="gap-2 px-5 lg:px-6 py-2 lg:py-2.5 text-xs lg:text-sm" data-testid="tab-activity">
              <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Activity
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2 px-5 lg:px-6 py-2 lg:py-2.5 text-xs lg:text-sm" data-testid="tab-posts">
              <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4" />Posts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="py-16 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="relative" data-testid="feed-bot-activity">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.06]" />
                <div className="space-y-0">
                  {visibleActivity.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-4 py-3" data-testid={`activity-item-${item.id}`}>
                      <div
                        className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 ${activityDotColor(item.type, item.action)}`}
                        style={{ boxShadow: "0 0 0 4px hsl(var(--background))" }}
                      >
                        {activityIcon(item.type, item.action)}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm leading-relaxed">{actionToSentence(item)}</p>
                        {item.type === "tweet" && item.details?.content && (
                          <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1 italic">"{item.details.content}"</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {item.details?.tweetId && (
                            <a href={`https://x.com/i/status/${item.details.tweetId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300" data-testid={`link-tweet-${item.id}`}>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {item.details?.txHash && (
                            <a href={`https://orbmarkets.io/tx/${item.details.txHash}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300" data-testid={`link-tx-${item.id}`}>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground/40 shrink-0 pt-1">{formatTimeAgo(item.createdAt)}</span>
                    </div>
                  ))}
                </div>
                {activityItems.length > showCount && (
                  <div className="text-center pt-4">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShowCount(s => s + 15)} data-testid="button-load-more-activity">
                      Load more
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts">
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-2" data-testid="list-bot-posts">
                {posts.filter(p => p.status === "posted").map((post) => (
                  <div key={post.id} className="p-4 rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-colors" data-testid={`post-item-${post.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {post.postType === "reply" ? "Reply" : "Auto"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground/40">{formatTimeAgo(post.createdAt)}</span>
                          {post.tweetId && (
                            <a
                              href={`https://x.com/i/status/${post.tweetId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                              data-testid={`link-post-tweet-${post.id}`}
                            >
                              View on 𝕏 <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
