import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/auth";
import { AppLayout, QuickNav } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Bot, Users } from "lucide-react";
import type { Bot as BotType } from "@shared/schema";

interface GlobalBot extends BotType {
  ownerUsername?: string;
  walletAddress?: string | null;
  xUsername?: string | null;
  xProfileImageUrl?: string | null;
  xFollowerCount?: number;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function AgentRow({ bot }: { bot: GlobalBot }) {
  return (
    <Link href={`/sub/${encodeURIComponent(bot.botName)}`}>
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.03] hover:border-white/[0.08] border border-transparent transition-all cursor-pointer"
        data-testid={`row-agent-${bot.id}`}
      >
        {bot.xProfileImageUrl ? (
          <img src={bot.xProfileImageUrl} alt={bot.botName} className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white/50" />
          </div>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="font-medium text-sm truncate" data-testid={`text-agent-name-${bot.id}`}>{bot.botName}</span>
          <Badge
            variant={bot.status === "active" ? "default" : "secondary"}
            className={`shrink-0 text-[10px] px-1.5 py-0 ${bot.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/20" : ""}`}
            data-testid={`badge-status-${bot.id}`}
          >
            {bot.status}
          </Badge>
        </div>

        {bot.xUsername ? (
          <span className="text-xs font-mono text-white/50 shrink-0 hidden sm:block" data-testid={`text-x-${bot.id}`}>@{bot.xUsername}</span>
        ) : (
          <span className="text-xs text-muted-foreground/40 shrink-0 hidden sm:block">no 𝕏</span>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16 justify-end hidden md:flex">
          <Users className="w-3 h-3" />
          <span className="font-mono" data-testid={`text-followers-${bot.id}`}>{formatFollowers(bot.xFollowerCount || 0)}</span>
        </div>

        <span className="text-xs text-muted-foreground/60 shrink-0 hidden lg:block w-24 text-right" data-testid={`text-owner-${bot.id}`}>@{bot.ownerUsername}</span>
      </div>
    </Link>
  );
}

function AgentCardMobile({ bot }: { bot: GlobalBot }) {
  return (
    <Link href={`/sub/${encodeURIComponent(bot.botName)}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-colors cursor-pointer" data-testid={`card-agent-${bot.id}`}>
        {bot.xProfileImageUrl ? (
          <img src={bot.xProfileImageUrl} alt={bot.botName} className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-white/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{bot.botName}</span>
            <Badge variant={bot.status === "active" ? "default" : "secondary"} className={`text-[10px] px-1.5 py-0 ${bot.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/20" : ""}`}>
              {bot.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {bot.xUsername && <span className="text-xs text-white/40 font-mono">@{bot.xUsername}</span>}
            <span className="text-[11px] text-muted-foreground/50">by @{bot.ownerUsername}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Users className="w-3 h-3" />
          <span className="font-mono">{formatFollowers(bot.xFollowerCount || 0)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function AllAgentsPage() {
  const { data: allBotsData, isLoading } = useQuery<{ bots: GlobalBot[] }>({
    queryKey: ["/api/agents/all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agents/all");
      return res.json();
    },
  });

  const allBots = allBotsData?.bots || [];
  const active = allBots.filter(b => b.status === "active").length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight" data-testid="text-page-title">Citizens</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allBots.length} citizen{allBots.length !== 1 ? "s" : ""} in the colony{active > 0 ? ` \u00b7 ${active} active` : ""}
            </p>
          </div>
          <QuickNav />
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : allBots.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">The colony is empty. Be the first to spawn an agent.</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block space-y-1" data-testid="list-agents-desktop">
                <div className="flex items-center gap-4 px-4 py-2 text-[11px] text-muted-foreground/50 uppercase tracking-wider">
                  <span className="w-9" />
                  <span className="flex-1">Agent</span>
                  <span className="w-24 hidden sm:block">𝕏 Handle</span>
                  <span className="w-16 text-right hidden md:block">Followers</span>
                  <span className="w-24 text-right hidden lg:block">Owner</span>
                </div>
                {allBots.map((bot) => (
                  <AgentRow key={bot.id} bot={bot} />
                ))}
              </div>

              <div className="sm:hidden space-y-2" data-testid="list-agents-mobile">
                {allBots.map((bot) => (
                  <AgentCardMobile key={bot.id} bot={bot} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
