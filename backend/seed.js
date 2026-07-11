import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import Admin from "./model/Admin/Admin.js";

dotenv.config();

// One-time reset for the new data model (Intake/Student/Troop/Leave shapes
// all changed — old documents from the previous schema are incompatible).
// Everyone except Admin is now created through the Admin UI, so this script
// only ever seeds the single bootstrap admin account.
const COLLECTIONS_TO_DROP = [
  "students",
  "hods",
  "troops",
  "squadrans",
  "sdds",
  "gates",
  "leaves",
  "movements",
  "notifications",
  "auditentries",
  "intakes",
];

const run = async () => {
  await connectDB();

  for (const name of COLLECTIONS_TO_DROP) {
    try {
      await mongoose.connection.db.collection(name).drop();
      console.log(`Dropped collection: ${name}`);
    } catch (err) {
      if (err.codeName === "NamespaceNotFound") {
        console.log(`Skipped (doesn't exist): ${name}`);
      } else {
        console.error(`Failed to drop ${name}:`, err.message);
      }
    }
  }

  const existing = await Admin.findOne({ username: "admin" });
  if (existing) {
    console.log("Skipped (already exists): admin");
  } else {
    await Admin.create({
      username: "admin",
      password: "admin123",
      name: "System Administrator",
    });
    console.log("Created: admin");
  }

  await mongoose.disconnect();
  console.log("Seeding complete.");
};

run();
