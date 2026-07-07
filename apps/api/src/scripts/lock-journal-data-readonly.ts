import 'dotenv/config';
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../prisma/prisma-client.factory';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

async function main() {
  const journalDataRelation = await prisma.$queryRawUnsafe<Array<{ relation_name: string | null }>>(
    "select to_regclass('public.journal_data')::text as relation_name",
  );

  if (!journalDataRelation[0]?.relation_name) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: 'journal_data table not found in current database',
          hint: 'Import legacy journal_data export first if you want to lock writes on it.',
        },
        null,
        2,
      ),
    );
    return;
  }

  await prisma.$executeRawUnsafe(`
    create or replace function public.block_journal_data_writes()
    returns trigger
    language plpgsql
    as $$
    begin
      raise exception 'journal_data is read-only during migration validation';
    end;
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    drop trigger if exists journal_data_readonly_trigger on public.journal_data;
  `);

  await prisma.$executeRawUnsafe(`
    create trigger journal_data_readonly_trigger
    before insert or update or delete on public.journal_data
    for each row
    execute function public.block_journal_data_writes();
  `);

  console.log(
    JSON.stringify(
      {
        ok: true,
        locked: true,
        table: 'public.journal_data',
        trigger: 'journal_data_readonly_trigger',
        function: 'public.block_journal_data_writes',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
