import { getRedis } from "./redis";

const DEFAULT_TTL_SECONDS = 60; // Adjust if needed

export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (e) {
    console.warn("Redis get failed:", e);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  try {
    const redis = getRedis();
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, payload, "EX", ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
  } catch (e) {
    console.warn("Redis set failed:", e);
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (e) {
    console.warn("Redis del failed:", e);
  }
}

export async function delByPattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    if (keys.length) {
      await redis.del(...keys);
    }
  } catch (e) {
    console.warn("Redis delByPattern failed:", e);
  }
}