import { log } from "./index";

export interface TwitterApiTweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  inReplyToId: string | null;
  mentionedUsernames: string[];
}

interface RawTweet {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; userName: string };
  isReply: boolean;
  inReplyToId: string | null;
  entities?: { user_mentions?: { username: string }[] };
}

interface SearchResponse {
  tweets: RawTweet[];
  has_next_page: boolean;
  next_cursor: string | null;
}

const MAX_QUERY_LENGTH = 480;
const REQUEST_TIMEOUT_MS = 15000;

export function isConfigured(): boolean {
  return !!process.env.TWITTERAPI_IO_KEY;
}

function buildBatchQueries(usernames: string[]): string[] {
  const queries: string[] = [];
  let current = "";

  for (const username of usernames) {
    const mention = `@${username}`;
    const addition = current ? ` OR ${mention}` : mention;

    if ((current + addition).length > MAX_QUERY_LENGTH) {
      if (current) queries.push(current);
      current = mention;
    } else {
      current += addition;
    }
  }

  if (current) queries.push(current);
  return queries;
}

function normalizeTweet(raw: RawTweet): TwitterApiTweet {
  const mentionedUsernames = (raw.entities?.user_mentions || [])
    .map((m: { username: string }) => m.username.toLowerCase());

  return {
    id: raw.id,
    text: raw.text,
    createdAt: raw.createdAt,
    authorId: raw.author?.id || "",
    authorUsername: raw.author?.userName || "unknown",
    inReplyToId: raw.inReplyToId || null,
    mentionedUsernames,
  };
}

export async function searchMentionsBatch(
  botUsernames: string[],
  sinceId?: string | null,
): Promise<TwitterApiTweet[]> {
  const apiKey = process.env.TWITTERAPI_IO_KEY;
  if (!apiKey) throw new Error("TWITTERAPI_IO_KEY not configured");

  if (botUsernames.length === 0) return [];

  const queries = buildBatchQueries(botUsernames);
  const allTweets: TwitterApiTweet[] = [];

  for (const query of queries) {
    try {
      const tweets = await executeSearch(apiKey, query, sinceId);
      allTweets.push(...tweets);
    } catch (err: any) {
      log(`TwitterAPI.io search error for query "${query.substring(0, 50)}...": ${err.message}`, "twitterapi");
      throw err;
    }
  }

  return allTweets;
}

async function executeSearch(
  apiKey: string,
  query: string,
  sinceId?: string | null,
): Promise<TwitterApiTweet[]> {
  const tweets: TwitterApiTweet[] = [];
  let cursor: string | null = null;
  let pages = 0;
  const maxPages = 3;

  do {
    const params = new URLSearchParams({
      query,
      queryType: "Latest",
    });
    if (cursor) params.set("cursor", cursor);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?${params.toString()}`;
      const response = await fetch(url, {
        headers: { "X-API-Key": apiKey },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`TwitterAPI.io ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data: SearchResponse = await response.json();
      const rawTweets = data.tweets || [];

      for (const raw of rawTweets) {
        if (sinceId && BigInt(raw.id) <= BigInt(sinceId)) {
          return tweets;
        }
        tweets.push(normalizeTweet(raw));
      }

      cursor = data.has_next_page ? data.next_cursor : null;
      pages++;
    } finally {
      clearTimeout(timeout);
    }
  } while (cursor && pages < maxPages);

  return tweets;
}

export function groupMentionsByBot(
  tweets: TwitterApiTweet[],
  botUsernameMap: Map<string, number>,
): Map<number, TwitterApiTweet[]> {
  const grouped = new Map<number, TwitterApiTweet[]>();

  for (const tweet of tweets) {
    const matchedBots = new Set<number>();

    for (const mentioned of tweet.mentionedUsernames) {
      const botId = botUsernameMap.get(mentioned.toLowerCase());
      if (botId !== undefined) matchedBots.add(botId);
    }

    if (matchedBots.size === 0) {
      for (const [username, botId] of botUsernameMap) {
        if (tweet.text.toLowerCase().includes(`@${username}`)) {
          matchedBots.add(botId);
        }
      }
    }

    for (const botId of matchedBots) {
      const list = grouped.get(botId) || [];
      list.push(tweet);
      grouped.set(botId, list);
    }
  }

  return grouped;
}
