import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { encrypt, decrypt } from "./crypto";
import { log } from "./index";
import { isConfigured as isTwitterApiConfigured, searchMentionsBatch, groupMentionsByBot, type TwitterApiTweet } from "./twitterapi-client";
import type { Bot, BotXAccount, BotWallet } from "@shared/schema";

type ActiveBot = Bot & { xAccount: BotXAccount; wallet: BotWallet };

async function resolveTokenMint(symbol: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const pairs = data.pairs || [];
    const solanaPair = pairs.find((p: any) => p.chainId === "solana" && p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase());
    if (solanaPair?.baseToken?.address) return solanaPair.baseToken.address;
    const anySolana = pairs.find((p: any) => p.chainId === "solana");
    if (anySolana?.baseToken?.address) return anySolana.baseToken.address;
    return null;
  } catch {
    return null;
  }
}

interface PendingTradeCA {
  tradeId: number;
  mentionId: number;
  action: "buy" | "sell";
  amountSol: number;
  tokenSymbol: string;
  commanderTweetId: string;
  createdAt: number;
}
const pendingCARequests = new Map<number, PendingTradeCA>();

let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
let autoPostTimer: ReturnType<typeof setInterval> | null = null;
let mentionPollTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

function getAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}

export async function generateTweetContent(personalityPrompt: string, recentPosts: string[]): Promise<string> {
  const client = getAnthropicClient();

  const recentContext = recentPosts.length > 0
    ? `\n\nYour recent posts (avoid repeating similar content):\n${recentPosts.map(p => `- ${p}`).join("\n")}`
    : "";

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: `${personalityPrompt}${recentContext}\n\nGenerate a single tweet. Rules:\n- Maximum 280 characters\n- No hashtags unless they fit naturally\n- Be original and engaging\n- Stay in character\n- Output ONLY the tweet text, nothing else`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") return "";

  let tweet = content.text.trim();
  tweet = tweet.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  if (tweet.length > 280) tweet = tweet.substring(0, 277) + "...";
  return tweet;
}

async function generateReplyContent(personalityPrompt: string, mentionText: string, authorUsername: string): Promise<string> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: `${personalityPrompt}\n\nSomeone (@${authorUsername}) mentioned you with this tweet:\n"${mentionText}"\n\nGenerate a reply. Rules:\n- Maximum 280 characters\n- Stay in character\n- Be conversational and engaging\n- Don't start with @${authorUsername} (it's added automatically)\n- Output ONLY the reply text, nothing else`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") return "";

  let reply = content.text.trim();
  if (reply.length > 280) reply = reply.substring(0, 277) + "...";
  return reply;
}

export async function postTweet(accessToken: string, text: string): Promise<{ tweetId: string } | null> {
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Post tweet failed (${response.status}):`, errText);
    if (response.status === 401) throw new Error("TOKEN_EXPIRED");
    return null;
  }

  const data = await response.json();
  return { tweetId: data.data?.id || null };
}

async function replyToTweet(accessToken: string, text: string, replyToTweetId: string): Promise<{ tweetId: string } | null> {
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: replyToTweetId },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Reply tweet failed (${response.status}):`, errText);
    if (response.status === 401) throw new Error("TOKEN_EXPIRED");
    return null;
  }

  const data = await response.json();
  return { tweetId: data.data?.id || null };
}

async function refreshTokenForAccount(xAccount: BotXAccount): Promise<boolean> {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  try {
    const refreshToken = decrypt(xAccount.encryptedRefreshToken);

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      console.error(`Token refresh failed for bot ${xAccount.botId}:`, await response.text());
      return false;
    }

    const data = await response.json();
    const { access_token, refresh_token: newRefreshToken, expires_in } = data;

    await storage.upsertBotXAccount({
      botId: xAccount.botId,
      xUserId: xAccount.xUserId || "",
      xUsername: xAccount.xUsername || "",
      xProfileImageUrl: xAccount.xProfileImageUrl || null,
      encryptedAccessToken: encrypt(access_token),
      encryptedRefreshToken: encrypt(newRefreshToken || refreshToken),
      tokenExpiresAt: new Date(Date.now() + (expires_in * 1000)),
    });

    log(`Token refreshed for bot ${xAccount.botId}`, "bot-engine");
    return true;
  } catch (err) {
    console.error(`Token refresh error for bot ${xAccount.botId}:`, err);
    return false;
  }
}

async function runTokenRefresh(): Promise<void> {
  try {
    const accountsToRefresh = await storage.getBotsNeedingTokenRefresh();
    if (accountsToRefresh.length === 0) {
      log("Token refresh check: no tokens expiring soon", "bot-engine");
      return;
    }

    log(`Refreshing tokens for ${accountsToRefresh.length} bot(s)`, "bot-engine");

    for (const account of accountsToRefresh) {
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        success = await refreshTokenForAccount(account);
        if (success) break;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }

      if (!success) {
        log(`Token refresh failed 3x for bot ${account.botId}, setting to disconnected`, "bot-engine");
        await storage.updateBot(account.botId, { status: "paused" } as any);
        await storage.createAuditLog({
          userId: account.bot.userId,
          botId: account.botId,
          action: "token_refresh_failed",
          details: { reason: "3 consecutive refresh failures" },
          source: "engine",
        });
      }
    }
  } catch (err) {
    console.error("Token refresh cycle error:", err);
  }
}

const nextPostTimes = new Map<number, number>();
const dailyPostCounts = new Map<string, number>();
const MAX_POSTS_PER_DAY = 8;
const MIN_INTERVAL_MS = 60 * 60 * 1000;
const MAX_INTERVAL_MS = 3 * 60 * 60 * 1000;

function getRandomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

function getDailyKey(botId: number): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${botId}-${today}`;
}

async function runAutoPosting(): Promise<void> {
  try {
    const activeBots = await storage.getActiveBots();
    if (activeBots.length === 0) {
      log("Auto-post check: no active bots with X + wallet connected", "bot-engine");
      return;
    }
    log(`Auto-post check: ${activeBots.length} active bot(s) found`, "bot-engine");

    const now = Date.now();

    for (const bot of activeBots) {
      try {
        const dailyKey = getDailyKey(bot.id);
        const todayCount = dailyPostCounts.get(dailyKey) || 0;
        if (todayCount >= MAX_POSTS_PER_DAY) continue;

        const lastPost = bot.lastPostAt ? new Date(bot.lastPostAt).getTime() : 0;
        let nextTime = nextPostTimes.get(bot.id);
        if (!nextTime) {
          nextTime = lastPost > 0 ? lastPost + getRandomInterval() : 0;
          nextPostTimes.set(bot.id, nextTime);
        }

        if (now < nextTime) {
          const minsLeft = Math.round((nextTime - now) / 60000);
          log(`Bot ${bot.id} (${bot.botName}) next tweet in ${minsLeft}min`, "bot-engine");
          continue;
        }

        log(`Bot ${bot.id} time to post! Generating tweet...`, "bot-engine");
        const recentPosts = await storage.getPostsByBot(bot.id);
        const recentTexts = recentPosts.slice(0, 5).map(p => p.content);

        const tweetContent = await generateTweetContent(bot.personalityPrompt, recentTexts);
        if (!tweetContent) {
          log(`AI generation returned empty for bot ${bot.id}`, "bot-engine");
          nextPostTimes.set(bot.id, Date.now() + 10 * 60 * 1000);
          continue;
        }
        log(`Bot ${bot.id} generated: "${tweetContent.substring(0, 60)}..."`, "bot-engine");

        const post = await storage.createBotPost({
          botId: bot.id,
          content: tweetContent,
          postType: "auto",
          status: "pending",
        });

        const accessToken = decrypt(bot.xAccount.encryptedAccessToken);
        let result: { tweetId: string } | null = null;

        try {
          result = await postTweet(accessToken, tweetContent);
        } catch (err: any) {
          if (err.message === "TOKEN_EXPIRED") {
            const refreshed = await refreshTokenForAccount(bot.xAccount);
            if (refreshed) {
              const updatedAccount = await storage.getBotXAccount(bot.id);
              if (updatedAccount) {
                const newToken = decrypt(updatedAccount.encryptedAccessToken);
                result = await postTweet(newToken, tweetContent);
              }
            }
          }
        }

        if (result?.tweetId) {
          await storage.updateBotPost(post.id, {
            tweetId: result.tweetId,
            status: "posted",
            postedAt: new Date(),
          } as any);
          await storage.updateBot(bot.id, { lastPostAt: new Date() } as any);
          await storage.createAuditLog({
            userId: bot.userId,
            botId: bot.id,
            action: "tweet_posted",
            details: { tweetId: result.tweetId, content: tweetContent.substring(0, 100) },
            source: "engine",
          });
          dailyPostCounts.set(dailyKey, todayCount + 1);
          nextPostTimes.set(bot.id, Date.now() + getRandomInterval());
          log(`Posted tweet for bot ${bot.id} (${todayCount + 1}/${MAX_POSTS_PER_DAY} today, next in ${Math.round((nextPostTimes.get(bot.id)! - Date.now()) / 60000)}min): ${tweetContent.substring(0, 50)}...`, "bot-engine");
        } else {
          log(`Bot ${bot.id} tweet FAILED to post to X API`, "bot-engine");
          await storage.updateBotPost(post.id, {
            status: "failed",
            errorMessage: "Failed to post to X API",
          } as any);
          nextPostTimes.set(bot.id, Date.now() + 10 * 60 * 1000);
        }
      } catch (err) {
        console.error(`Auto-post error for bot ${bot.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Auto-posting cycle error:", err);
  }
}

function extractCA(text: string): string | null {
  const match = text.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);
  if (!match) return null;
  const candidate = match[1];
  if (/^\d+$/.test(candidate)) return null;
  if (candidate.length < 32 || candidate.length > 44) return null;
  return candidate;
}

function parseTradeCommand(text: string): { action: "buy" | "sell"; amountSol?: number; tokenSymbol?: string } | null {
  const normalized = text.toLowerCase().trim();

  const buyMatch = normalized.match(/\b(buy|long)\s+(\d+(?:\.\d+)?)\s*sol\s+\$?([a-zA-Z0-9]+)/i);
  if (buyMatch) {
    return { action: "buy", amountSol: parseFloat(buyMatch[2]), tokenSymbol: buyMatch[3].toUpperCase() };
  }

  const sellMatch = normalized.match(/\b(sell|short|dump)\s+(\d+(?:\.\d+)?)\s*sol\s+\$?([a-zA-Z0-9]+)/i);
  if (sellMatch) {
    return { action: "sell", amountSol: parseFloat(sellMatch[2]), tokenSymbol: sellMatch[3].toUpperCase() };
  }

  const simpleBuy = normalized.match(/\b(buy|long)\s+\$?([a-zA-Z0-9]+)/i);
  if (simpleBuy) {
    return { action: "buy", tokenSymbol: simpleBuy[2].toUpperCase() };
  }

  const simpleSell = normalized.match(/\b(sell|short|dump)\s+\$?([a-zA-Z0-9]+)/i);
  if (simpleSell) {
    return { action: "sell", tokenSymbol: simpleSell[2].toUpperCase() };
  }

  return null;
}

const nextMentionCheckTimes = new Map<number, number>();
const mentionBackoffUntil = new Map<number, number>();
const MENTION_MIN_INTERVAL_MS = 5 * 60 * 1000;
const MENTION_MAX_INTERVAL_MS = 10 * 60 * 1000;
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;
const BOT_STAGGER_MS = 30 * 1000;
let twitterApiFailCount = 0;
const TWITTERAPI_MAX_FAILS = 3;
const TWITTERAPI_COOLDOWN_MS = 5 * 60 * 1000;
let twitterApiCooldownUntil = 0;

function getRandomMentionInterval(): number {
  return MENTION_MIN_INTERVAL_MS + Math.random() * (MENTION_MAX_INTERVAL_MS - MENTION_MIN_INTERVAL_MS);
}

async function runMentionPolling(): Promise<void> {
  try {
    const activeBots = await storage.getActiveBots();
    if (activeBots.length === 0) return;

    const now = Date.now();
    const useTwitterApi = isTwitterApiConfigured() && twitterApiFailCount < TWITTERAPI_MAX_FAILS && now > twitterApiCooldownUntil;

    if (useTwitterApi) {
      await runMentionPollingViaTwitterApi(activeBots);
    } else {
      await runMentionPollingViaOfficialApi(activeBots);
    }
  } catch (err) {
    console.error("Mention polling cycle error:", err);
  }
}

async function runMentionPollingViaTwitterApi(activeBots: ActiveBot[]): Promise<void> {
  const botUsernameMap = new Map<string, number>();
  const botMap = new Map<number, ActiveBot>();
  const usernames: string[] = [];

  for (const bot of activeBots) {
    const username = bot.xAccount.xUsername;
    if (!username) continue;
    botUsernameMap.set(username.toLowerCase(), bot.id);
    botMap.set(bot.id, bot);
    usernames.push(username);
  }

  if (usernames.length === 0) return;

  let globalSinceId: string | null = null;
  for (const bot of activeBots) {
    if (bot.lastMentionId) {
      if (!globalSinceId || BigInt(bot.lastMentionId) < BigInt(globalSinceId)) {
        globalSinceId = bot.lastMentionId;
      }
    }
  }

  let allTweets: TwitterApiTweet[];
  try {
    allTweets = await searchMentionsBatch(usernames, globalSinceId);
    twitterApiFailCount = 0;
    log(`TwitterAPI.io: found ${allTweets.length} mention(s) for ${usernames.length} bot(s)`, "bot-engine");
  } catch (err: any) {
    twitterApiFailCount++;
    log(`TwitterAPI.io failed (${twitterApiFailCount}/${TWITTERAPI_MAX_FAILS}): ${err.message}, falling back to official X API`, "bot-engine");
    if (twitterApiFailCount >= TWITTERAPI_MAX_FAILS) {
      twitterApiCooldownUntil = Date.now() + TWITTERAPI_COOLDOWN_MS;
      log(`TwitterAPI.io disabled for 5 min cooldown`, "bot-engine");
      twitterApiFailCount = 0;
    }
    await runMentionPollingViaOfficialApi(activeBots);
    return;
  }

  const seenIds = new Set<string>();
  allTweets = allTweets.filter(t => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  if (allTweets.length === 0) return;

  const grouped = groupMentionsByBot(allTweets, botUsernameMap);

  for (const [botId, tweets] of grouped) {
    const bot = botMap.get(botId);
    if (!bot) continue;

    const filteredTweets = tweets
      .filter(t => !bot.lastMentionId || BigInt(t.id) > BigInt(bot.lastMentionId))
      .filter(t => t.authorUsername.toLowerCase() !== bot.xAccount.xUsername?.toLowerCase())
      .sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));

    if (filteredTweets.length === 0) continue;

    const accessToken = decrypt(bot.xAccount.encryptedAccessToken);
    let newestId = bot.lastMentionId;
    let hasRepliedToMention = false;

    for (const tweet of filteredTweets) {
      try {
        await processMentionTweet(bot, tweet.id, tweet.authorId, tweet.authorUsername, tweet.text, accessToken, hasRepliedToMention);
        if (!hasRepliedToMention) {
          const authorLower = tweet.authorUsername.toLowerCase();
          const commanderLower = (bot.transactionCommanderX || "").toLowerCase();
          const isCommander = authorLower === commanderLower;
          const tradeCommand = isCommander ? parseTradeCommand(tweet.text) : null;
          const caFromCommander = isCommander ? extractCA(tweet.text) : null;
          if (!tradeCommand && !caFromCommander) hasRepliedToMention = true;
        }

        if (!newestId || BigInt(tweet.id) > BigInt(newestId)) {
          newestId = tweet.id;
        }
      } catch (err) {
        console.error(`Error processing mention tweet ${tweet.id} for bot ${botId}:`, err);
      }
    }

    if (newestId && newestId !== bot.lastMentionId) {
      await storage.updateBot(botId, { lastMentionId: newestId } as any);
    }
  }
}

async function runMentionPollingViaOfficialApi(activeBots: ActiveBot[]): Promise<void> {
  log(`Mention poll (official X API): checking ${activeBots.length} active bot(s)`, "bot-engine");

  const now = Date.now();
  let staggerDelay = 0;

  for (const bot of activeBots) {
    try {
      const backoff = mentionBackoffUntil.get(bot.id);
      if (backoff && now < backoff) continue;

      const nextCheck = nextMentionCheckTimes.get(bot.id);
      if (nextCheck && now < nextCheck) continue;

      if (staggerDelay > 0) {
        await new Promise(r => setTimeout(r, staggerDelay));
      }
      staggerDelay += BOT_STAGGER_MS;

      const xUserId = bot.xAccount.xUserId;
      if (!xUserId) continue;

      const accessToken = decrypt(bot.xAccount.encryptedAccessToken);

      let url = `https://api.twitter.com/2/users/${xUserId}/mentions?tweet.fields=author_id,created_at,text&expansions=author_id&user.fields=username&max_results=10`;
      if (bot.lastMentionId) {
        url += `&since_id=${bot.lastMentionId}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 429) {
          log(`Rate limited on mentions for bot ${bot.id}, backing off 15min`, "bot-engine");
          mentionBackoffUntil.set(bot.id, now + RATE_LIMIT_BACKOFF_MS);
          continue;
        }
        if (response.status === 401) {
          await refreshTokenForAccount(bot.xAccount);
          nextMentionCheckTimes.set(bot.id, now + getRandomMentionInterval());
          continue;
        }
        nextMentionCheckTimes.set(bot.id, now + getRandomMentionInterval());
        continue;
      }

      nextMentionCheckTimes.set(bot.id, now + getRandomMentionInterval());

      const data = await response.json();
      const tweets = data.data || [];
      const includes = data.includes?.users || [];

      if (tweets.length === 0) continue;

      const userMap: Record<string, string> = {};
      for (const u of includes) userMap[u.id] = u.username;

      let newestId = bot.lastMentionId;
      const sortedTweets = [...tweets].sort((a: any, b: any) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
      let hasRepliedToMention = false;

      for (const tweet of sortedTweets) {
        const authorUsername = userMap[tweet.author_id] || "unknown";
        try {
          await processMentionTweet(bot, tweet.id, tweet.author_id, authorUsername, tweet.text, accessToken, hasRepliedToMention);
          if (!hasRepliedToMention) {
            const isCommander = authorUsername.toLowerCase() === (bot.transactionCommanderX || "").toLowerCase();
            const tradeCommand = isCommander ? parseTradeCommand(tweet.text) : null;
            const caFromCommander = isCommander ? extractCA(tweet.text) : null;
            if (!tradeCommand && !caFromCommander) hasRepliedToMention = true;
          }

          if (!newestId || BigInt(tweet.id) > BigInt(newestId)) {
            newestId = tweet.id;
          }
        } catch (err) {
          console.error(`Error processing mention tweet ${tweet.id} for bot ${bot.id}:`, err);
        }
      }

      if (newestId && newestId !== bot.lastMentionId) {
        await storage.updateBot(bot.id, { lastMentionId: newestId } as any);
      }
    } catch (err) {
      console.error(`Mention poll error for bot ${bot.id}:`, err);
    }
  }
}

async function processMentionTweet(
  bot: ActiveBot,
  tweetId: string,
  authorId: string,
  authorUsername: string,
  tweetText: string,
  accessToken: string,
  hasRepliedToMention: boolean,
): Promise<void> {
  const existing = await storage.getMentionByTweetId(bot.id, tweetId);
  if (existing) return;

  const isCommander = authorUsername.toLowerCase() === (bot.transactionCommanderX || "").toLowerCase();
  const tradeCommand = isCommander ? parseTradeCommand(tweetText) : null;

  const mention = await storage.createBotMention({
    botId: bot.id,
    mentionTweetId: tweetId,
    authorXId: authorId,
    authorXUsername: authorUsername,
    mentionText: tweetText,
    isCommand: !!tradeCommand,
    commandType: tradeCommand?.action || null,
    commandParsed: tradeCommand || null,
    replyStatus: "pending",
  });

  const caFromCommander = isCommander ? extractCA(tweetText) : null;
  const pending = pendingCARequests.get(bot.id);

  if (caFromCommander && pending && isCommander && (Date.now() - pending.createdAt < 30 * 60 * 1000)) {
    log(`Received CA from commander for bot ${bot.id}: ${caFromCommander}`, "bot-engine");

    await storage.updateBotMention(mention.id, {
      isCommand: true,
      commandType: pending.action,
      commandParsed: { ...pending, tokenMint: caFromCommander },
      replyStatus: "pending",
    } as any);

    try {
      const { executeBuyToken, executeSellToken, getTokenDecimals } = await import("./solana");
      const tokenMint = caFromCommander;

      await storage.updateTrade(pending.tradeId, { tokenMint } as any);

      if (pending.action === "buy") {
        const result = await executeBuyToken(bot.wallet.encryptedPrivateKey, tokenMint, pending.amountSol);
        await storage.updateTrade(pending.tradeId, { txHash: result.txHash, status: "completed" } as any);
        await storage.createAuditLog({
          userId: bot.userId, botId: bot.id, action: "token_bought",
          details: { tokenMint, tokenSymbol: pending.tokenSymbol, amountSol: pending.amountSol, txHash: result.txHash },
          source: "engine",
        });
        const successReply = `Swap complete! Bought $${pending.tokenSymbol} with ${pending.amountSol} SOL.\n\nCA: ${tokenMint}\nTX: orbmarkets.io/tx/${result.txHash.slice(0, 8)}...`;
        try { await replyToTweet(accessToken, successReply, tweetId); } catch {}
      } else if (pending.action === "sell") {
        const decimals = await getTokenDecimals(tokenMint);
        const result = await executeSellToken(bot.wallet.encryptedPrivateKey, tokenMint, pending.amountSol.toString(), decimals);
        await storage.updateTrade(pending.tradeId, { txHash: result.txHash, status: "completed" } as any);
        await storage.createAuditLog({
          userId: bot.userId, botId: bot.id, action: "token_sold",
          details: { tokenMint, tokenSymbol: pending.tokenSymbol, txHash: result.txHash, solReceived: result.solReceived },
          source: "engine",
        });
        const successReply = `Swap complete! Sold $${pending.tokenSymbol}. Received ${result.solReceived} SOL.\n\nCA: ${tokenMint}\nTX: orbmarkets.io/tx/${result.txHash.slice(0, 8)}...`;
        try { await replyToTweet(accessToken, successReply, tweetId); } catch {}
      }

      pendingCARequests.delete(bot.id);
    } catch (tradeErr: any) {
      console.error(`Trade execution failed for bot ${bot.id}: ${tradeErr.message}`);
      await storage.updateTrade(pending.tradeId, { status: "failed", errorMessage: tradeErr.message } as any);
      await storage.createAuditLog({
        userId: bot.userId, botId: bot.id, action: `trade_${pending.action}_failed`,
        details: { tokenSymbol: pending.tokenSymbol, error: tradeErr.message },
        source: "engine",
      });
      const failReply = `Trade failed: ${tradeErr.message.slice(0, 100)}`;
      try { await replyToTweet(accessToken, failReply, tweetId); } catch {}
      pendingCARequests.delete(bot.id);
    }
  } else if (tradeCommand) {
    const trade = await storage.createTrade({
      botId: bot.id,
      tradeType: tradeCommand.action,
      tokenMint: "awaiting_ca",
      tokenSymbol: tradeCommand.tokenSymbol || null,
      amountSol: tradeCommand.amountSol?.toString() || null,
      triggeredBy: "commander",
    });

    await storage.createAuditLog({
      userId: bot.userId,
      botId: bot.id,
      action: "trade_command_received",
      details: { command: tradeCommand, from: authorUsername, tweetId },
      source: "engine",
    });

    if (tradeCommand.amountSol && tradeCommand.tokenSymbol) {
      pendingCARequests.set(bot.id, {
        tradeId: trade.id,
        mentionId: mention.id,
        action: tradeCommand.action,
        amountSol: tradeCommand.amountSol,
        tokenSymbol: tradeCommand.tokenSymbol,
        commanderTweetId: tweetId,
        createdAt: Date.now(),
      });
    }

    const replyText = `${tradeCommand.action.toUpperCase()} ${tradeCommand.amountSol ? tradeCommand.amountSol + " SOL" : ""} $${tradeCommand.tokenSymbol || "?"} received.\n\nPlease reply with the contract address (CA) to execute the swap.`;
    try {
      const replyResult = await replyToTweet(accessToken, replyText, tweetId);
      if (replyResult) {
        await storage.updateBotMention(mention.id, {
          replyTweetId: replyResult.tweetId,
          replyText,
          replyStatus: "posted",
          processedAt: new Date(),
        } as any);
      }
    } catch {
      console.error(`Failed to reply to trade command for bot ${bot.id}`);
    }
  } else {
    if (!hasRepliedToMention) {
      try {
        const replyContent = await generateReplyContent(bot.personalityPrompt, tweetText, authorUsername);
        if (replyContent) {
          const replyResult = await replyToTweet(accessToken, replyContent, tweetId);
          if (replyResult) {
            await storage.updateBotMention(mention.id, {
              replyTweetId: replyResult.tweetId,
              replyText: replyContent,
              replyStatus: "posted",
              processedAt: new Date(),
            } as any);

            await storage.createBotPost({
              botId: bot.id,
              content: replyContent,
              tweetId: replyResult.tweetId,
              postType: "reply",
              status: "posted",
              postedAt: new Date(),
            });
          }
        }
      } catch {
        console.error(`Failed to generate/post reply for bot ${bot.id}`);
      }
    } else {
      await storage.updateBotMention(mention.id, {
        replyStatus: "skipped",
        processedAt: new Date(),
      } as any);
    }
  }
}

const MENTION_POLL_INTERVAL_TWITTERAPI = 60 * 1000;
const MENTION_POLL_INTERVAL_OFFICIAL = 60 * 1000;

const COLONY_INTERACTION_INTERVAL_MS = 8 * 60 * 1000;
const COLONY_MAX_INTERACTIONS_PER_BOT_PER_HOUR = 1;
const colonyInteractionCounts = new Map<string, number>();
const lastColonyPairs = new Set<string>();
let colonyInteractionTimer: ReturnType<typeof setInterval> | null = null;

const COLONY_INTERACTION_TYPES = [
  { type: "roast", instruction: "Roast this tweet. Be witty and sharp but keep it playful. No personal attacks." },
  { type: "agree", instruction: "Agree with this take and add your own perspective. Build on their point." },
  { type: "counter", instruction: "Push back on this take. Disagree respectfully and explain why you see it differently." },
  { type: "pnl_flex", instruction: "React to this tweet by casually mentioning your own trading wins or market reads. Keep it natural, not forced." },
  { type: "question", instruction: "Ask a genuine follow up question about this. Be curious, not interrogative." },
  { type: "insight", instruction: "Share a related insight or observation that adds to the conversation." },
] as const;

function getColonyHourKey(botId: number): string {
  const hour = new Date().toISOString().slice(0, 13);
  return `${botId}-${hour}`;
}

function getPairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

async function generateColonyReply(
  responderPersonality: string,
  originalTweet: string,
  originalAuthor: string,
  interactionType: string,
  instruction: string,
): Promise<string> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: `${responderPersonality}\n\nAnother AI agent (@${originalAuthor}) just posted this:\n"${originalTweet}"\n\n${instruction}\n\nRules:\n- Maximum 280 characters\n- Stay in character based on your personality\n- Don't start with @${originalAuthor} (threading handles it)\n- Sound natural, like a real person responding\n- Output ONLY the reply text, nothing else`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") return "";
  let reply = content.text.trim();
  if (reply.length > 280) reply = reply.substring(0, 277) + "...";
  return reply;
}

async function runColonyInteractions(): Promise<void> {
  try {
    const activeBots = await storage.getActiveBots();
    if (activeBots.length < 2) {
      log("Colony interactions: need at least 2 active bots", "bot-engine");
      return;
    }

    const eligibleBots = activeBots.filter(bot => {
      const hourKey = getColonyHourKey(bot.id);
      const count = colonyInteractionCounts.get(hourKey) || 0;
      return count < COLONY_MAX_INTERACTIONS_PER_BOT_PER_HOUR;
    });

    if (eligibleBots.length < 2) {
      log("Colony interactions: no eligible bot pairs (hourly limit reached)", "bot-engine");
      return;
    }

    let botA: ActiveBot | null = null;
    let botB: ActiveBot | null = null;
    const shuffled = [...eligibleBots].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length && !botA; i++) {
      for (let j = i + 1; j < shuffled.length && !botB; j++) {
        const pairKey = getPairKey(shuffled[i].id, shuffled[j].id);
        if (!lastColonyPairs.has(pairKey)) {
          botA = shuffled[i];
          botB = shuffled[j];
        }
      }
    }

    if (!botA || !botB) {
      lastColonyPairs.clear();
      botA = shuffled[0];
      botB = shuffled[1];
    }

    const recentPosts = await storage.getPostsByBot(botA.id);
    const latestPost = recentPosts.find(p => p.status === "posted" && p.tweetId);

    if (!latestPost || !latestPost.tweetId) {
      log(`Colony interaction: ${botA.botName} has no posted tweets to interact with`, "bot-engine");
      return;
    }

    const interaction = COLONY_INTERACTION_TYPES[Math.floor(Math.random() * COLONY_INTERACTION_TYPES.length)];
    log(`Colony interaction: ${botB.botName} → ${botA.botName} (${interaction.type}) on tweet "${latestPost.content.substring(0, 40)}..."`, "bot-engine");

    const replyContent = await generateColonyReply(
      botB.personalityPrompt,
      latestPost.content,
      botA.xAccount.xUsername || botA.botName,
      interaction.type,
      interaction.instruction,
    );

    if (!replyContent) {
      log(`Colony interaction: AI generated empty reply`, "bot-engine");
      return;
    }

    const accessToken = decrypt(botB.xAccount.encryptedAccessToken);
    let result: { tweetId: string } | null = null;

    try {
      result = await replyToTweet(accessToken, replyContent, latestPost.tweetId);
    } catch (err: any) {
      if (err.message === "TOKEN_EXPIRED") {
        const refreshed = await refreshTokenForAccount(botB.xAccount);
        if (refreshed) {
          const updatedAccount = await storage.getBotXAccount(botB.id);
          if (updatedAccount) {
            const newToken = decrypt(updatedAccount.encryptedAccessToken);
            result = await replyToTweet(newToken, replyContent, latestPost.tweetId);
          }
        }
      }
    }

    if (result?.tweetId) {
      await storage.createBotPost({
        botId: botB.id,
        content: replyContent,
        tweetId: result.tweetId,
        postType: "colony_reply",
        status: "posted",
        postedAt: new Date(),
      });

      await storage.createAuditLog({
        userId: botB.userId,
        botId: botB.id,
        action: "colony_interaction",
        details: {
          interactionType: interaction.type,
          targetBotId: botA.id,
          targetBotName: botA.botName,
          targetTweetId: latestPost.tweetId,
          replyTweetId: result.tweetId,
          replyContent: replyContent.substring(0, 100),
        },
        source: "engine",
      });

      const pairKey = getPairKey(botA.id, botB.id);
      lastColonyPairs.add(pairKey);
      if (lastColonyPairs.size > 20) lastColonyPairs.clear();

      const hourKeyB = getColonyHourKey(botB.id);
      colonyInteractionCounts.set(hourKeyB, (colonyInteractionCounts.get(hourKeyB) || 0) + 1);

      log(`Colony interaction posted: ${botB.botName} replied to ${botA.botName} (${interaction.type}): "${replyContent.substring(0, 60)}..."`, "bot-engine");
    } else {
      log(`Colony interaction failed: could not post reply from ${botB.botName}`, "bot-engine");
    }
  } catch (err) {
    console.error("Colony interaction cycle error:", err);
  }
}

function safeRun(fn: () => Promise<void>, label: string): () => void {
  return () => {
    fn().catch((err) => {
      console.error(`[bot-engine] ${label} crashed:`, err);
    });
  };
}

export function startEngine(): void {
  if (isRunning) return;
  isRunning = true;

  const mentionProvider = isTwitterApiConfigured() ? "TwitterAPI.io (~60s)" : "official X API (5-10min)";
  log("Bot engine starting...", "bot-engine");

  tokenRefreshTimer = setInterval(safeRun(runTokenRefresh, "tokenRefresh"), 90 * 60 * 1000);
  setTimeout(safeRun(runTokenRefresh, "tokenRefresh"), 10 * 1000);

  autoPostTimer = setInterval(safeRun(runAutoPosting, "autoPost"), 60 * 1000);
  setTimeout(safeRun(runAutoPosting, "autoPost"), 30 * 1000);

  const mentionInterval = isTwitterApiConfigured() ? MENTION_POLL_INTERVAL_TWITTERAPI : MENTION_POLL_INTERVAL_OFFICIAL;
  mentionPollTimer = setInterval(safeRun(runMentionPolling, "mentionPoll"), mentionInterval);
  setTimeout(safeRun(runMentionPolling, "mentionPoll"), 45 * 1000);

  colonyInteractionTimer = setInterval(safeRun(runColonyInteractions, "colonyInteractions"), COLONY_INTERACTION_INTERVAL_MS);
  setTimeout(safeRun(runColonyInteractions, "colonyInteractions"), 2 * 60 * 1000);

  log(`Bot engine started (token refresh: 90min, auto-post: 60s check, mentions: ${mentionProvider}, colony: ~8min, max 8 posts/day)`, "bot-engine");
}

export function stopEngine(): void {
  if (!isRunning) return;
  isRunning = false;

  if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
  if (autoPostTimer) clearInterval(autoPostTimer);
  if (mentionPollTimer) clearInterval(mentionPollTimer);
  if (colonyInteractionTimer) clearInterval(colonyInteractionTimer);

  tokenRefreshTimer = null;
  autoPostTimer = null;
  mentionPollTimer = null;
  colonyInteractionTimer = null;

  log("Bot engine stopped", "bot-engine");
}

export { refreshTokenForAccount };
