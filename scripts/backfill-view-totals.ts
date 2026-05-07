import { Redis } from "@upstash/redis";

async function main() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  const dates = (await redis.smembers("views:dates")) as string[];
  const paths = (await redis.smembers("views:paths")) as string[];

  console.log(`Found ${dates.length} dates, ${paths.length} paths`);

  if (paths.length === 0 || dates.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  // For each path, sum all daily counts
  let updated = 0;
  for (const p of paths) {
    const pipeline = redis.pipeline();
    for (const d of dates) {
      pipeline.get(`views:${d}:${p}`);
    }
    const results = await pipeline.exec();
    const total = results.reduce(
      (sum: number, val) => sum + ((val as number) || 0),
      0,
    );

    if (total > 0) {
      await redis.set(`views:total:${p}`, total);
      console.log(`  ${p}: ${total} views`);
      updated++;
    }
  }

  console.log(`\nBackfill complete. Updated ${updated} paths.`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
