import Review from "../models/Review.js";
import { getChannel } from "./rabbitmq.js";
import { embedText } from "../services/embeddings.js";

/**
 * Starts consuming from the "review.created" queue.
 * Fetches the review text, generates embedding, and updates the database record.
 */
export const startReviewEmbeddingConsumer = async () => {
  const channel = getChannel();

  console.log("Starting to consume from review.created queue...");

  channel.consume("review.created", async (msg) => {
    if (!msg) return;

    let reviewId: string | null = null;
    try {
      const content = JSON.parse(msg.content.toString());
      reviewId = content.reviewId;

      if (!reviewId) {
        console.error("[Review Consumer] Missing reviewId in queue message");
        channel.ack(msg);
        return;
      }

      console.log(`[Review Consumer] Processing review: ${reviewId}`);
      const review = await Review.findById(reviewId);

      if (!review) {
        console.error(`[Review Consumer] Review not found for ID: ${reviewId}`);
        channel.ack(msg);
        return;
      }

      // Generate embedding
      console.log(`[Review Consumer] Generating embedding for text: "${review.text.substring(0, 50)}..."`);
      const embedding = await embedText(review.text);

      // Save embedding to DB
      review.embedding = embedding;
      review.embeddingStatus = "done";
      await review.save();

      console.log(`[Review Consumer] Embedding updated successfully for review: ${reviewId}`);
      channel.ack(msg);
    } catch (error) {
      console.error(`[Review Consumer] Error processing embedding for review ID ${reviewId}:`, error);
      
      // If we have a review ID, set the status to failed in DB
      if (reviewId) {
        try {
          await Review.findByIdAndUpdate(reviewId, {
            $set: { embeddingStatus: "failed" }
          });
        } catch (dbError) {
          console.error(`[Review Consumer] Failed to set error status in DB for review: ${reviewId}`, dbError);
        }
      }

      // Acknowledge the message anyway to avoid jamming the queue
      channel.ack(msg);
    }
  });
};
