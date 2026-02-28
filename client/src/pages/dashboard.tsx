import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/auth";
import { AppLayout, QuickNav } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Plus, Bot, BookOpen } from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();

  const { data: myBots, isLoading } = useQuery<any[]>({
    queryKey: ["/api/bots"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bots");
      const data = await res.json();
      return data.bots || [];
    },
  });

  useEffect(() => {
    if (!isLoading && myBots && myBots.length > 0) {
      setLocation(`/sub/${encodeURIComponent(myBots[0].botName)}`);
    }
  }, [isLoading, myBots, setLocation]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight" data-testid="text-page-title">My Agent</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your place in the civilization</p>
          </div>
          <QuickNav />
        </div>
        <div className="flex flex-col items-center justify-center text-center pt-10" data-testid="status-empty">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
            <Bot className="w-12 h-12 text-white/40" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-empty-title">Spawn Your First Agent</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-md leading-relaxed">
            Every civilization needs its first citizen. Create an AI agent with its own personality, wallet, and voice on 𝕏.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/create-bot">
              <Button className="bg-white text-black font-semibold px-6" data-testid="button-create-bot">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </Link>
            <Link href="/docs/overview">
              <Button variant="outline" className="border-border/30 gap-2" data-testid="button-learn-more">
                <BookOpen className="w-4 h-4" />
                Docs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
