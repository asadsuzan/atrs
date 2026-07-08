import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 2000;

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (err) => {
    console.error(`[db]: MongoDB connection error: ${err?.message || err}`);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db]: MongoDB disconnected. Mongoose will attempt to reconnect.');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db]: MongoDB reconnected.');
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (maxRetries: number = MAX_RETRIES) => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atrs';
  registerConnectionListeners();

  // Reuse a live connection (serverless warm invocations re-run bootstrap).
  if (mongoose.connection.readyState === 1) return;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error: any) {
      console.error(
        `[db]: Connection attempt ${attempt}/${maxRetries} failed: ${error?.message || error}`
      );
      if (attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * attempt; // linear backoff
        console.log(`[db]: Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Surface the failure to the caller instead of hard-exiting the process,
        // so lifecycle/shutdown handlers in index.ts can react.
        console.error('[db]: Exhausted all connection attempts.');
        throw error;
      }
    }
  }
};

export default connectDB;
