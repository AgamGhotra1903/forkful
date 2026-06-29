// One-time data migration: rename the legacy typo'd field `isAvailble`
// (from an old schema alias) to the correct `isAvailable` on any rider
// documents still carrying it.
//
// This used to run on every single server boot inside connectDB(), which is
// wasteful and masks the real fix (the alias has now been removed from the
// Rider schema/model and controller code, so no new documents can be
// written with the typo'd key going forward).
//
// Run once, manually, after deploying the schema fix:
//   npx tsx src/scripts/migrate-isAvailble.ts
import "dotenv/config";
import mongoose from "mongoose";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string, {
    dbName: "Zomato_Clone",
  });

  const ridersCol = mongoose.connection.collection("riders");
  const result = await ridersCol.updateMany(
    { isAvailble: { $exists: true } },
    { $rename: { isAvailble: "isAvailable" } }
  );

  console.log(`Migrated ${result.modifiedCount} rider document(s): isAvailble -> isAvailable`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
