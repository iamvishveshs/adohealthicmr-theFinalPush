/**
 * No-op: Data is loaded from data/app-data.json at runtime (in-memory store).
 * Run: npx tsx src/scripts/migrate-data.ts
 */

import { getModules, getQuestions } from '../lib/store';

async function migrateData() {
  try {
    console.log('📂 Loading store (data/app-data.json)...');
    const modules = getModules();
    const questions = getQuestions();
    console.log(`✅ Loaded ${modules.length} modules and ${questions.length} questions from file.`);
    console.log('   No migration needed — app uses in-memory store with file backup.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to load data:', error);
    process.exit(1);
  }
}

migrateData();
