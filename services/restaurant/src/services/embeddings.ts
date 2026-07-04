import { pipeline } from "@xenova/transformers";

let extractor: any = null;
const embeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 1000;

async function getExtractor() {
  if (!extractor) {
    try {
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (err) {
      console.error("[Embeddings] Failed to load Xenova extractor pipeline:", err);
      throw err;
    }
  }
  return extractor;
}

/**
 * Embeds a single text string using Xenova/all-MiniLM-L6-v2 model.
 * Returns a 384-dimensional vector. Uses a cache to avoid redundant computation.
 */
export async function embedText(text: string): Promise<number[]> {
  const cacheKey = text.trim().toLowerCase();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  try {
    const ext = await getExtractor();
    const output = await ext(text, { pooling: "mean", normalize: true });
    const vector = Array.from(output.data as Float32Array);
    
    // Maintain cache size
    if (embeddingCache.size >= MAX_CACHE_SIZE) {
      const firstKey = embeddingCache.keys().next().value;
      if (firstKey !== undefined) {
        embeddingCache.delete(firstKey);
      }
    }
    embeddingCache.set(cacheKey, vector);
    return vector;
  } catch (err) {
    console.error(`[Embeddings] Error embedding text "${text}", returning zero fallback vector:`, err);
    return Array(384).fill(0);
  }
}

/**
 * Embeds an array of text strings in batches of size 32.
 * Logs progress for each batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const ext = await getExtractor();
  const results: number[][] = [];
  const batchSize = 32;
  const total = texts.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`[Embeddings] Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(total / batchSize)} (batch size: ${batch.length})`);
    
    try {
      const output = await ext(batch, { pooling: "mean", normalize: true });
      const data = Array.from(output.data as Float32Array);
      const dimensions = 384;
      
      for (let j = 0; j < batch.length; j++) {
        const start = j * dimensions;
        const end = start + dimensions;
        results.push(data.slice(start, end));
      }
    } catch (batchErr) {
      console.error("[Embeddings] Batch embedding error, inserting fallback zero vectors for batch:", batchErr);
      for (let j = 0; j < batch.length; j++) {
        results.push(Array(384).fill(0));
      }
    }
  }

  return results;
}
