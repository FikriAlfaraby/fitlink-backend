/**
 * Retroactive correction of QRIS fees on old wallet_transactions.
 *
 * Background: before this fix, QRIS income transactions from POS were recorded
 * without any fee deduction (feeAmount = 0, netAmount = full amount). The QRIS fee
 * should be 1% and is borne by the gym owner (deducted from the balance credited to the wallet).
 *
 * This script:
 *  1. Finds every WalletTransaction with wallet.walletType = qris,
 *     transactionType = income, referenceType = pos_transaction, and feeAmount = 0.
 *  2. Recalculates the correct feeAmount (1% of amount) and netAmount.
 *  3. Runs as a DRY RUN by default: it only prints a report of the changes that
 *     would be made and writes NOTHING to the database.
 *  4. Run with --apply to actually apply the correction (transaction +
 *     wallet aggregates: currentBalance, totalIncome, todayIncome, totalFees).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/correct-qris-fee.ts
 *   npx ts-node -r tsconfig-paths/register scripts/correct-qris-fee.ts --apply
 *   npx ts-node -r tsconfig-paths/register scripts/correct-qris-fee.ts --gym-id=<uuid>
 */

import { PrismaClient, WalletType, TransactionType, ReferenceType } from '@prisma/client';

const prisma = new PrismaClient();

const QRIS_FEE_PERCENTAGE = 1; // 1% — must always stay in sync with BUSINESS.WALLET.DEFAULT_QRIS_FEE_PERCENTAGE

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const gymIdArg = args.find(a => a.startsWith('--gym-id='));
  const gymId = gymIdArg ? gymIdArg.split('=')[1] : undefined;

  console.log('='.repeat(70));
  console.log(`QRIS Fee Correction — Mode: ${apply ? '⚠️  APPLY (writes to DB)' : '🔍 DRY RUN (no changes)'}`);
  if (gymId) console.log(`Filter gymId: ${gymId}`);
  console.log('='.repeat(70));

  // Fetch every QRIS income transaction from POS that has no fee deducted yet.
  const transactions = await prisma.walletTransaction.findMany({
    where: {
      transactionType: TransactionType.income,
      referenceType: ReferenceType.pos_transaction,
      feeAmount: 0,
      wallet: {
        walletType: WalletType.qris,
        ...(gymId ? { gymId } : {}),
      },
    },
    include: {
      wallet: {
        include: {
          gym: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { processedAt: 'asc' },
  });

  if (transactions.length === 0) {
    console.log('\n✅ No QRIS transactions need correction.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nFound ${transactions.length} QRIS transactions with no fee deducted.\n`);

  // Group the impact per wallet so wallet aggregates can be corrected once per wallet.
  const walletImpact = new Map<
    string,
    { gymName: string; walletId: string; totalFeeCorrection: number; count: number }
  >();

  let totalFeeCorrection = 0;

  for (const tx of transactions) {
    const grossAmount = tx.amount.toNumber();
    const correctFee = Number((grossAmount * (QRIS_FEE_PERCENTAGE / 100)).toFixed(2));
    const correctNet = Number((grossAmount - correctFee).toFixed(2));

    console.log(
      `- [${tx.processedAt.toISOString().slice(0, 10)}] ${tx.wallet.gym.name} | ` +
        `tx=${tx.id.slice(0, 8)} | gross=${formatIDR(grossAmount)} -> ` +
        `fee=${formatIDR(correctFee)} | net baru=${formatIDR(correctNet)} (net lama=${formatIDR(tx.netAmount.toNumber())})`,
    );

    const key = tx.walletId;
    const existing = walletImpact.get(key) || {
      gymName: tx.wallet.gym.name,
      walletId: tx.walletId,
      totalFeeCorrection: 0,
      count: 0,
    };
    existing.totalFeeCorrection += correctFee;
    existing.count += 1;
    walletImpact.set(key, existing);

    totalFeeCorrection += correctFee;

    if (apply) {
      await prisma.$transaction(async p => {
        await p.walletTransaction.update({
          where: { id: tx.id },
          data: { feeAmount: correctFee, netAmount: correctNet },
        });
        await p.wallet.update({
          where: { id: tx.walletId },
          data: {
            currentBalance: { decrement: correctFee },
            totalIncome: { decrement: correctFee },
            totalFees: { increment: correctFee },
          },
        });
      });
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log('Summary per wallet (gym):');
  for (const impact of walletImpact.values()) {
    console.log(
      `  ${impact.gymName}: ${impact.count} transactions, total fee that should have been deducted = ${formatIDR(impact.totalFeeCorrection)}`,
    );
  }
  console.log('-'.repeat(70));
  console.log(`TOTAL fee ${apply ? 'deducted' : 'to be deducted'} from the gym owner balance: ${formatIDR(totalFeeCorrection)}`);
  console.log(`Total transactions ${apply ? 'corrected' : 'to be corrected'}: ${transactions.length}`);

  if (!apply) {
    console.log('\n⚠️  This was only a DRY RUN. No changes were written to the database.');
    console.log('   Re-run with --apply after confirming the results above to apply the correction.');
  } else {
    console.log('\n✅ Correction successfully applied to the database.');
  }

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('Failed to run the correction:', err);
  await prisma.$disconnect();
  process.exit(1);
});
