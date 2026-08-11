import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Vector extension enabled successfully!');
  } finally {
    await client.end();
  }
}

main().catch(console.error);
