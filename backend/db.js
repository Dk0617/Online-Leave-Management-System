import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import dns from "dns";

// Some Windows/router DNS setups refuse the SRV lookup a mongodb+srv:// URI
// needs (querySrv ECONNREFUSED), so ask public DNS servers directly instead.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "online_leave",
    });
    console.log(`✅ MongoDB Connected to database: "${conn.connection.name}" on host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
