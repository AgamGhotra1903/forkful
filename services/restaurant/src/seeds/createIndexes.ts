import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in the environment");
  process.exit(1);
}

async function run() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI!, { dbName: "Zomato_Clone" });
  console.log("Connected successfully.\n");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database object is undefined");
    process.exit(1);
  }

  // 1. Create review_vector_index on 'reviews'
  try {
    console.log("Creating review_vector_index on 'reviews' collection...");
    const reviewsCol = db.collection("reviews");
    
    // Check if index already exists
    const indexes = await reviewsCol.listSearchIndexes().toArray();
    const exists = indexes.some(idx => idx.name === "review_vector_index");

    if (exists) {
      console.log("review_vector_index already exists. Skipping.");
    } else {
      await reviewsCol.createSearchIndex({
        name: "review_vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 384,
              similarity: "cosine"
            },
            {
              type: "filter",
              path: "restaurantId"
            },
            {
              type: "filter",
              path: "embeddingStatus"
            }
          ]
        }
      });
      console.log("review_vector_index creation request submitted successfully!");
    }
  } catch (err: any) {
    console.error("Failed to create review_vector_index programmatically:", err.message);
    console.log("Please make sure you are connecting to an Atlas Cluster (Vector Search is not supported on local instances).");
  }

  // 2. Create menuitem_vector_index on 'menuitems'
  try {
    console.log("\nCreating menuitem_vector_index on 'menuitems' collection...");
    const menuitemsCol = db.collection("menuitems");
    
    // Check if index already exists
    const indexes = await menuitemsCol.listSearchIndexes().toArray();
    const exists = indexes.some(idx => idx.name === "menuitem_vector_index");

    if (exists) {
      console.log("menuitem_vector_index already exists. Skipping.");
    } else {
      await menuitemsCol.createSearchIndex({
        name: "menuitem_vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 384,
              similarity: "cosine"
            },
            {
              type: "filter",
              path: "restaurantId"
            },
            {
              type: "filter",
              path: "isAvailable"
            },
            {
              type: "filter",
              path: "embeddingStatus"
            },
            {
              type: "filter",
              path: "price"
            }
          ]
        }
      });
      console.log("menuitem_vector_index creation request submitted successfully!");
    }
  } catch (err: any) {
    console.error("Failed to create menuitem_vector_index programmatically:", err.message);
  }

  console.log("\nClosing connection...");
  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

run().catch(err => {
  console.error("Index creation runner failed:", err);
  process.exit(1);
});
