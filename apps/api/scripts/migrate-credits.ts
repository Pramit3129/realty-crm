import mongoose from "mongoose";
import { User } from "../modules/user/user.model";
import { connectDB } from "../shared/config/db";
import "dotenv/config";

async function migrateCredits() {
  try {
    // 1. Connect to DB
    await connectDB();

    console.log("Starting migration: Setting default email credits for existing users...");

    // 2. Update users who don't have the emailCredits field
    const result = await User.updateMany(
      { emailCredits: { $exists: false } },
      { $set: { emailCredits: 200 } }
    );

    console.log(`Migration complete!`);
    console.log(`Matched: ${result.matchedCount} users`);
    console.log(`Modified: ${result.modifiedCount} users`);

    // 3. Close connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateCredits();
