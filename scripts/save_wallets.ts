import { Redis } from '@upstash/redis';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

async function saveWallets() {
  console.log('Fetching users from Redis...');
  try {
    const keys = await redis.smembers('users:index');
    if (keys.length === 0) {
      console.log('No users found.');
      return;
    }

    const users = [];
    for (const key of keys) {
      const user = await redis.get(key);
      if (user) {
        users.push(user);
      }
    }

    // Extract wallet addresses and some basic stats
    const walletData = users.map((u: any) => ({
      walletAddress: u.walletAddress,
      telegramId: u.telegramId,
      level: u.level,
      xp: u.xp,
      registeredAt: u.registeredAt
    }));

    const outputPath = path.join(__dirname, '../registered_wallets.json');
    fs.writeFileSync(outputPath, JSON.stringify(walletData, null, 2));
    
    console.log(`Successfully saved ${walletData.length} wallets to registered_wallets.json`);
  } catch (error) {
    console.error('Error fetching or saving wallets:', error);
  }
}

saveWallets();
