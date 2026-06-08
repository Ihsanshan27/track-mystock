import { verifyRequiredTables } from './lib.mjs';

async function main() {
  const { missingTables, requiredTables } = await verifyRequiredTables();

  if (missingTables.length > 0) {
    console.error('Masih ada object database yang belum siap:');
    for (const entry of missingTables) {
      console.error(`- ${entry.tableName}: ${entry.error}`);
    }
    process.exit(1);
  }

  console.log(`Semua table siap: ${requiredTables.join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
