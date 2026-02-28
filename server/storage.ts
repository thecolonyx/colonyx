import { db } from "./db";
import { eq, desc, inArray, and, lte, sql } from "drizzle-orm";
import {
  users, bots, botXAccounts, botWallets, trades, withdrawals,
  botPosts, botMentions, auditLogs,
  type InsertUser, type User, type InsertBot, type Bot,
  type BotWallet, type BotXAccount, type Trade, type Withdrawal,
  type BotPost, type BotMention, type AuditLog,
  type InsertTrade, type InsertWithdrawal, type InsertAuditLog,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, passwordHash: string): Promise<void>;
  deleteUser(id: number): Promise<void>;

  createBot(data: InsertBot): Promise<Bot>;
  getBotsByUser(userId: number): Promise<Bot[]>;
  getBotsByUserWithDetails(userId: number): Promise<(Bot & { walletAddress: string | null; xUsername: string | null; xProfileImageUrl: string | null; solBalance: string })[]>;
  getBot(id: number): Promise<Bot | undefined>;
  getBotByName(botName: string): Promise<Bot | undefined>;
  updateBot(id: number, data: Partial<Bot>): Promise<Bot | undefined>;
  deleteBot(id: number): Promise<void>;

  getBotWallet(botId: number): Promise<BotWallet | undefined>;
  createBotWallet(data: { botId: number; publicAddress: string; encryptedPrivateKey: string }): Promise<BotWallet>;

  getBotXAccount(botId: number): Promise<BotXAccount | undefined>;
  upsertBotXAccount(data: {
    botId: number;
    xUserId: string;
    xUsername: string;
    xProfileImageUrl: string | null;
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tokenExpiresAt: Date;
  }): Promise<BotXAccount>;
  deleteBotXAccount(botId: number): Promise<void>;

  getTradesByBot(botId: number): Promise<Trade[]>;
  createTrade(data: InsertTrade): Promise<Trade>;
  updateTrade(id: number, data: Partial<Trade>): Promise<void>;

  getWithdrawalsByBot(botId: number): Promise<Withdrawal[]>;
  createWithdrawal(data: InsertWithdrawal): Promise<Withdrawal>;
  updateWithdrawal(id: number, data: Partial<Withdrawal>): Promise<void>;

  getPostsByBot(botId: number): Promise<BotPost[]>;
  createBotPost(data: Partial<BotPost> & { botId: number; content: string }): Promise<BotPost>;
  updateBotPost(id: number, data: Partial<BotPost>): Promise<void>;
  getMentionsByBot(botId: number): Promise<BotMention[]>;
  getMentionByTweetId(botId: number, mentionTweetId: string): Promise<BotMention | null>;
  createBotMention(data: Partial<BotMention> & { botId: number; mentionTweetId: string; authorXId: string; authorXUsername: string; mentionText: string }): Promise<BotMention>;
  updateBotMention(id: number, data: Partial<BotMention>): Promise<void>;

  getActiveBots(): Promise<(Bot & { xAccount: BotXAccount; wallet: BotWallet })[]>;
  getBotsNeedingTokenRefresh(): Promise<(BotXAccount & { bot: Bot })[]>;

  getAuditLogsByBot(botId: number): Promise<AuditLog[]>;
  getRecentActivityByUser(userId: number, limit?: number): Promise<(AuditLog & { botName?: string })[]>;
  getAllBots(limit?: number): Promise<(Bot & { ownerUsername?: string; walletAddress?: string | null; xUsername?: string | null; xProfileImageUrl?: string | null })[]>;
  getGlobalActivity(limit?: number): Promise<(AuditLog & { botName?: string; ownerUsername?: string })[]>;
  getCombinedActivity(limit?: number): Promise<CombinedActivityItem[]>;
  getBotCombinedActivity(botId: number, limit?: number): Promise<CombinedActivityItem[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
}

export interface CombinedActivityItem {
  id: string;
  type: "tweet" | "trade" | "system";
  action: string;
  botId: number;
  botName: string;
  ownerUsername: string;
  botProfileImageUrl: string | null;
  details: any;
  createdAt: Date | null;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createBot(data: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(data).returning();
    return bot;
  }

  async getBotsByUser(userId: number): Promise<Bot[]> {
    return db.select().from(bots).where(eq(bots.userId, userId)).orderBy(desc(bots.createdAt));
  }

  async getBotsByUserWithDetails(userId: number): Promise<(Bot & { walletAddress: string | null; xUsername: string | null; xProfileImageUrl: string | null; solBalance: string })[]> {
    const userBots = await db.select().from(bots).where(eq(bots.userId, userId)).orderBy(desc(bots.createdAt));
    if (userBots.length === 0) return [];

    const botIds = userBots.map(b => b.id);
    const wallets = await db.select({ botId: botWallets.botId, publicAddress: botWallets.publicAddress }).from(botWallets).where(inArray(botWallets.botId, botIds));
    const walletMap = Object.fromEntries(wallets.map(w => [w.botId, w.publicAddress]));
    const xAccounts = await db.select({ botId: botXAccounts.botId, xUsername: botXAccounts.xUsername, xProfileImageUrl: botXAccounts.xProfileImageUrl }).from(botXAccounts).where(inArray(botXAccounts.botId, botIds));
    const xMap = Object.fromEntries(xAccounts.map(x => [x.botId, { xUsername: x.xUsername, xProfileImageUrl: x.xProfileImageUrl }]));

    return userBots.map(bot => ({
      ...bot,
      walletAddress: walletMap[bot.id] || null,
      xUsername: xMap[bot.id]?.xUsername || null,
      xProfileImageUrl: xMap[bot.id]?.xProfileImageUrl || null,
      solBalance: "0.000000000",
    }));
  }

  async getBot(id: number): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot;
  }

  async getBotByName(botName: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.botName, botName));
    return bot;
  }

  async updateBot(id: number, data: Partial<Bot>): Promise<Bot | undefined> {
    const [bot] = await db.update(bots).set(data).where(eq(bots.id, id)).returning();
    return bot;
  }

  async deleteBot(id: number): Promise<void> {
    await db.delete(bots).where(eq(bots.id, id));
  }

  async getBotWallet(botId: number): Promise<BotWallet | undefined> {
    const [wallet] = await db.select().from(botWallets).where(eq(botWallets.botId, botId));
    return wallet;
  }

  async createBotWallet(data: { botId: number; publicAddress: string; encryptedPrivateKey: string }): Promise<BotWallet> {
    const [wallet] = await db.insert(botWallets).values(data).returning();
    return wallet;
  }

  async getBotXAccount(botId: number): Promise<BotXAccount | undefined> {
    const [account] = await db.select().from(botXAccounts).where(eq(botXAccounts.botId, botId));
    return account;
  }

  async upsertBotXAccount(data: {
    botId: number;
    xUserId: string;
    xUsername: string;
    xProfileImageUrl: string | null;
    xFollowerCount?: number;
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tokenExpiresAt: Date;
  }): Promise<BotXAccount> {
    const existing = await this.getBotXAccount(data.botId);
    if (existing) {
      const [updated] = await db.update(botXAccounts).set({
        xUserId: data.xUserId,
        xUsername: data.xUsername,
        xProfileImageUrl: data.xProfileImageUrl,
        xFollowerCount: data.xFollowerCount ?? existing.xFollowerCount,
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
      }).where(eq(botXAccounts.botId, data.botId)).returning();
      return updated;
    }
    const [account] = await db.insert(botXAccounts).values(data).returning();
    return account;
  }

  async deleteBotXAccount(botId: number): Promise<void> {
    await db.delete(botXAccounts).where(eq(botXAccounts.botId, botId));
  }

  async getTradesByBot(botId: number): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.botId, botId)).orderBy(desc(trades.createdAt));
  }

  async createTrade(data: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(data).returning();
    return trade;
  }

  async updateTrade(id: number, data: Partial<Trade>): Promise<void> {
    await db.update(trades).set(data).where(eq(trades.id, id));
  }

  async getWithdrawalsByBot(botId: number): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.botId, botId)).orderBy(desc(withdrawals.createdAt));
  }

  async createWithdrawal(data: InsertWithdrawal): Promise<Withdrawal> {
    const [withdrawal] = await db.insert(withdrawals).values(data).returning();
    return withdrawal;
  }

  async updateWithdrawal(id: number, data: Partial<Withdrawal>): Promise<void> {
    await db.update(withdrawals).set(data).where(eq(withdrawals.id, id));
  }

  async getPostsByBot(botId: number): Promise<BotPost[]> {
    return db.select().from(botPosts).where(eq(botPosts.botId, botId)).orderBy(desc(botPosts.createdAt));
  }

  async createBotPost(data: Partial<BotPost> & { botId: number; content: string }): Promise<BotPost> {
    const [post] = await db.insert(botPosts).values(data as any).returning();
    return post;
  }

  async updateBotPost(id: number, data: Partial<BotPost>): Promise<void> {
    await db.update(botPosts).set(data as any).where(eq(botPosts.id, id));
  }

  async getMentionsByBot(botId: number): Promise<BotMention[]> {
    return db.select().from(botMentions).where(eq(botMentions.botId, botId)).orderBy(desc(botMentions.createdAt));
  }

  async getMentionByTweetId(botId: number, mentionTweetId: string): Promise<BotMention | null> {
    const [mention] = await db.select().from(botMentions)
      .where(and(eq(botMentions.botId, botId), eq(botMentions.mentionTweetId, mentionTweetId)))
      .limit(1);
    return mention || null;
  }

  async createBotMention(data: Partial<BotMention> & { botId: number; mentionTweetId: string; authorXId: string; authorXUsername: string; mentionText: string }): Promise<BotMention> {
    const [mention] = await db.insert(botMentions).values(data as any).returning();
    return mention;
  }

  async updateBotMention(id: number, data: Partial<BotMention>): Promise<void> {
    await db.update(botMentions).set(data as any).where(eq(botMentions.id, id));
  }

  async getActiveBots(): Promise<(Bot & { xAccount: BotXAccount; wallet: BotWallet })[]> {
    const activeBots = await db.select().from(bots).where(eq(bots.status, "active"));
    if (activeBots.length === 0) return [];

    const botIds = activeBots.map(b => b.id);
    const xAccounts = await db.select().from(botXAccounts).where(inArray(botXAccounts.botId, botIds));
    const wallets = await db.select().from(botWallets).where(inArray(botWallets.botId, botIds));

    const xMap = Object.fromEntries(xAccounts.map(x => [x.botId, x]));
    const walletMap = Object.fromEntries(wallets.map(w => [w.botId, w]));

    return activeBots
      .filter(b => xMap[b.id] && walletMap[b.id])
      .map(b => ({ ...b, xAccount: xMap[b.id], wallet: walletMap[b.id] }));
  }

  async getBotsNeedingTokenRefresh(): Promise<(BotXAccount & { bot: Bot })[]> {
    const threshold = new Date(Date.now() + 30 * 60 * 1000);
    const accounts = await db.select().from(botXAccounts).where(
      lte(botXAccounts.tokenExpiresAt, threshold)
    );
    if (accounts.length === 0) return [];

    const botIds = accounts.map(a => a.botId);
    const botsList = await db.select().from(bots).where(inArray(bots.id, botIds));
    const botMap = Object.fromEntries(botsList.map(b => [b.id, b]));

    return accounts
      .filter(a => botMap[a.botId])
      .map(a => ({ ...a, bot: botMap[a.botId] }));
  }

  async getAuditLogsByBot(botId: number): Promise<AuditLog[]> {
    return db.select().from(auditLogs).where(eq(auditLogs.botId, botId)).orderBy(desc(auditLogs.createdAt));
  }

  async getRecentActivityByUser(userId: number, limit = 20): Promise<(AuditLog & { botName?: string })[]> {
    const userBots = await db.select({ id: bots.id, botName: bots.botName }).from(bots).where(eq(bots.userId, userId));
    if (userBots.length === 0) return [];
    const botIds = userBots.map(b => b.id);
    const botNameMap: Record<number, string> = {};
    for (const b of userBots) botNameMap[b.id] = b.botName;
    const logs = await db.select().from(auditLogs).where(inArray(auditLogs.botId, botIds)).orderBy(desc(auditLogs.createdAt)).limit(limit);
    return logs.map(log => ({ ...log, botName: log.botId ? botNameMap[log.botId] || "Unknown" : "Unknown" }));
  }

  async getAllBots(limit = 50): Promise<(Bot & { ownerUsername?: string; walletAddress?: string | null; xUsername?: string | null; xProfileImageUrl?: string | null; xFollowerCount?: number })[]> {
    const allBotsList = await db.select().from(bots).orderBy(desc(bots.createdAt)).limit(limit);
    if (allBotsList.length === 0) return [];

    const userIds = Array.from(new Set(allBotsList.map(b => b.userId)));
    const allUsers = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, userIds));
    const userMap: Record<number, string> = {};
    for (const u of allUsers) userMap[u.id] = u.username;

    const botIds = allBotsList.map(b => b.id);
    const wallets = await db.select({ botId: botWallets.botId, publicAddress: botWallets.publicAddress }).from(botWallets).where(inArray(botWallets.botId, botIds));
    const walletMap: Record<number, string> = {};
    for (const w of wallets) walletMap[w.botId] = w.publicAddress;

    const xAccounts = await db.select({ botId: botXAccounts.botId, xUsername: botXAccounts.xUsername, xProfileImageUrl: botXAccounts.xProfileImageUrl, xFollowerCount: botXAccounts.xFollowerCount }).from(botXAccounts).where(inArray(botXAccounts.botId, botIds));
    const xMap: Record<number, { xUsername: string | null; xProfileImageUrl: string | null; xFollowerCount: number }> = {};
    for (const x of xAccounts) xMap[x.botId] = { xUsername: x.xUsername, xProfileImageUrl: x.xProfileImageUrl, xFollowerCount: x.xFollowerCount || 0 };

    const result = allBotsList.map(bot => ({
      ...bot,
      ownerUsername: userMap[bot.userId] || "Unknown",
      walletAddress: walletMap[bot.id] || null,
      xUsername: xMap[bot.id]?.xUsername || null,
      xProfileImageUrl: xMap[bot.id]?.xProfileImageUrl || null,
      xFollowerCount: xMap[bot.id]?.xFollowerCount || 0,
    }));

    result.sort((a, b) => (b.xFollowerCount || 0) - (a.xFollowerCount || 0));
    return result;
  }

  async getGlobalActivity(limit = 30): Promise<(AuditLog & { botName?: string; ownerUsername?: string })[]> {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    if (logs.length === 0) return [];

    const botIds = Array.from(new Set(logs.map(l => l.botId).filter((id): id is number => id !== null)));
    const userIds = Array.from(new Set(logs.map(l => l.userId).filter((id): id is number => id !== null)));

    const allBotsList = botIds.length > 0 ? await db.select({ id: bots.id, botName: bots.botName }).from(bots).where(inArray(bots.id, botIds)) : [];
    const allUsers = userIds.length > 0 ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, userIds)) : [];

    const botNameMap: Record<number, string> = {};
    for (const b of allBotsList) botNameMap[b.id] = b.botName;
    const userMap: Record<number, string> = {};
    for (const u of allUsers) userMap[u.id] = u.username;

    return logs.map(log => ({
      ...log,
      botName: log.botId ? botNameMap[log.botId] || "Unknown" : "System",
      ownerUsername: log.userId ? userMap[log.userId] || "Unknown" : "System",
    }));
  }

  async getCombinedActivity(limit = 30): Promise<CombinedActivityItem[]> {
    const [recentPosts, recentTrades, recentLogs] = await Promise.all([
      db.select().from(botPosts).orderBy(desc(botPosts.createdAt)).limit(limit),
      db.select().from(trades).orderBy(desc(trades.createdAt)).limit(limit),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit),
    ]);

    const allBotIds = Array.from(new Set([
      ...recentPosts.map(p => p.botId),
      ...recentTrades.map(t => t.botId),
      ...recentLogs.map(l => l.botId).filter((id): id is number => id !== null),
    ]));

    if (allBotIds.length === 0) return [];

    const allBotsList = await db.select({
      id: bots.id,
      botName: bots.botName,
      userId: bots.userId,
    }).from(bots).where(inArray(bots.id, allBotIds));

    const botMap: Record<number, { botName: string; userId: number }> = {};
    for (const b of allBotsList) botMap[b.id] = { botName: b.botName, userId: b.userId };

    const userIds = Array.from(new Set(Object.values(botMap).map(b => b.userId)));
    const allUsers = userIds.length > 0
      ? await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, userIds))
      : [];
    const userMap: Record<number, string> = {};
    for (const u of allUsers) userMap[u.id] = u.username;

    const xAccounts = allBotIds.length > 0
      ? await db.select({ botId: botXAccounts.botId, xProfileImageUrl: botXAccounts.xProfileImageUrl }).from(botXAccounts).where(inArray(botXAccounts.botId, allBotIds))
      : [];
    const pfpMap: Record<number, string | null> = {};
    for (const x of xAccounts) pfpMap[x.botId] = x.xProfileImageUrl;

    const items: CombinedActivityItem[] = [];

    for (const post of recentPosts) {
      const bot = botMap[post.botId];
      items.push({
        id: `tweet-${post.id}`,
        type: "tweet",
        action: post.postType === "reply" ? "reply_posted" : "tweet_posted",
        botId: post.botId,
        botName: bot?.botName || "Unknown",
        ownerUsername: bot ? (userMap[bot.userId] || "Unknown") : "Unknown",
        botProfileImageUrl: pfpMap[post.botId] || null,
        details: { content: post.content?.slice(0, 120), tweetId: post.tweetId, postType: post.postType, status: post.status },
        createdAt: post.createdAt,
      });
    }

    for (const trade of recentTrades) {
      const bot = botMap[trade.botId];
      items.push({
        id: `trade-${trade.id}`,
        type: "trade",
        action: trade.tradeType === "buy" ? "token_bought" : "token_sold",
        botId: trade.botId,
        botName: bot?.botName || "Unknown",
        ownerUsername: bot ? (userMap[bot.userId] || "Unknown") : "Unknown",
        botProfileImageUrl: pfpMap[trade.botId] || null,
        details: { tokenMint: trade.tokenMint, tokenSymbol: trade.tokenSymbol, amountSol: trade.amountSol, amountTokens: trade.amountTokens, txHash: trade.txHash, status: trade.status, tradeType: trade.tradeType },
        createdAt: trade.createdAt,
      });
    }

    for (const log of recentLogs) {
      const bot = log.botId ? botMap[log.botId] : null;
      items.push({
        id: `log-${log.id}`,
        type: "system",
        action: log.action,
        botId: log.botId || 0,
        botName: bot?.botName || "System",
        ownerUsername: bot ? (userMap[bot.userId] || "Unknown") : (log.userId ? (userMap[log.userId] || "Unknown") : "System"),
        botProfileImageUrl: log.botId ? (pfpMap[log.botId] || null) : null,
        details: log.details,
        createdAt: log.createdAt,
      });
    }

    items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return items.slice(0, limit);
  }

  async getBotCombinedActivity(botId: number, limit = 30): Promise<CombinedActivityItem[]> {
    const [recentPosts, recentTrades, recentLogs] = await Promise.all([
      db.select().from(botPosts).where(eq(botPosts.botId, botId)).orderBy(desc(botPosts.createdAt)).limit(limit),
      db.select().from(trades).where(eq(trades.botId, botId)).orderBy(desc(trades.createdAt)).limit(limit),
      db.select().from(auditLogs).where(eq(auditLogs.botId, botId)).orderBy(desc(auditLogs.createdAt)).limit(limit),
    ]);

    const [botRecord] = await db.select({ id: bots.id, botName: bots.botName, userId: bots.userId }).from(bots).where(eq(bots.id, botId));
    if (!botRecord) return [];

    const [owner] = await db.select({ username: users.username }).from(users).where(eq(users.id, botRecord.userId));
    const ownerUsername = owner?.username || "Unknown";

    const xAccounts = await db.select({ xProfileImageUrl: botXAccounts.xProfileImageUrl }).from(botXAccounts).where(eq(botXAccounts.botId, botId));
    const pfp = xAccounts.length > 0 ? xAccounts[0].xProfileImageUrl : null;

    const items: CombinedActivityItem[] = [];

    for (const post of recentPosts) {
      items.push({
        id: `tweet-${post.id}`,
        type: "tweet",
        action: post.postType === "reply" ? "reply_posted" : "tweet_posted",
        botId: post.botId,
        botName: botRecord.botName,
        ownerUsername,
        botProfileImageUrl: pfp,
        details: { content: post.content?.slice(0, 120), tweetId: post.tweetId, postType: post.postType, status: post.status },
        createdAt: post.createdAt,
      });
    }

    for (const trade of recentTrades) {
      items.push({
        id: `trade-${trade.id}`,
        type: "trade",
        action: trade.tradeType === "buy" ? "token_bought" : "token_sold",
        botId: trade.botId,
        botName: botRecord.botName,
        ownerUsername,
        botProfileImageUrl: pfp,
        details: { tokenMint: trade.tokenMint, tokenSymbol: trade.tokenSymbol, amountSol: trade.amountSol, amountTokens: trade.amountTokens, txHash: trade.txHash, status: trade.status, tradeType: trade.tradeType },
        createdAt: trade.createdAt,
      });
    }

    for (const log of recentLogs) {
      items.push({
        id: `log-${log.id}`,
        type: "system",
        action: log.action,
        botId: botId,
        botName: botRecord.botName,
        ownerUsername,
        botProfileImageUrl: pfp,
        details: log.details,
        createdAt: log.createdAt,
      });
    }

    items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return items.slice(0, limit);
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
