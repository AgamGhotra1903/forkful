import { pipeline } from "@xenova/transformers";

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

/**
 * Embeds a single text string using Xenova/all-MiniLM-L6-v2 model.
 * Returns a 384-dimensional vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
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
    
    const output = await ext(batch, { pooling: "mean", normalize: true });
    const data = Array.from(output.data as Float32Array);
    const dimensions = 384;
    
    for (let j = 0; j < batch.length; j++) {
      const start = j * dimensions;
      const end = start + dimensions;
      results.push(data.slice(start, end));
    }
  }

  return results;
}
