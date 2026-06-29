import MenuItems from "../models/MenuItems.js";
import { getChannel } from "./rabbitmq.js";
import { embedText } from "../services/embeddings.js";

/**
 * Starts consuming from the "menuitem.embed" queue.
 * Fetches the menu item name + description, generates embedding, and updates the database record.
 */
export const startMenuItemEmbeddingConsumer = async () => {
  const channel = getChannel();

  console.log("Starting to consume from menuitem.embed queue...");

  channel.consume("menuitem.embed", async (msg) => {
    if (!msg) return;

    let itemId: string | null = null;
    try {
      const content = JSON.parse(msg.content.toString());
      itemId = content.itemId;

      if (!itemId) {
        console.error("[MenuItem Consumer] Missing itemId in queue message");
        channel.ack(msg);
        return;
      }

      console.log(`[MenuItem Consumer] Processing menu item: ${itemId}`);
      const item = await MenuItems.findById(itemId);

      if (!item) {
        console.error(`[MenuItem Consumer] Menu item not found for ID: ${itemId}`);
        channel.ack(msg);
        return;
      }

      // Generate embedding text: name + " " + description (or fallback to name only if description is empty)
      const embeddingText = item.description 
        ? `${item.name} ${item.description}` 
        : item.name;

      console.log(`[MenuItem Consumer] Generating embedding for text: "${embeddingText.substring(0, 50)}..."`);
      const embedding = await embedText(embeddingText);

      // Save embedding to DB
      item.embedding = embedding;
      item.embeddingStatus = "done";
      await item.save();

      console.log(`[MenuItem Consumer] Embedding updated successfully for menu item: ${itemId}`);
      channel.ack(msg);
    } catch (error) {
      console.error(`[MenuItem Consumer] Error processing embedding for menu item ID ${itemId}:`, error);
      
      // If we have an item ID, set the status to failed in DB
      if (itemId) {
        try {
          await MenuItems.findByIdAndUpdate(itemId, {
            $set: { embeddingStatus: "failed" }
          });
        } catch (dbError) {
          console.error(`[MenuItem Consumer] Failed to set error status in DB for menu item: ${itemId}`, dbError);
        }
      }

      // Acknowledge the message anyway to avoid jamming the queue
      channel.ack(msg);
    }
  });
};
