/**
 * Koreksi retroaktif fee QRIS pada wallet_transactions lama.
 *
 * Latar belakang: sebelum fix ini, transaksi income QRIS dari POS dicatat
 * tanpa potongan fee (feeAmount = 0, netAmount = amount penuh). Fee QRIS
 * seharusnya 1% dan ditanggung gym owner (dipotong dari saldo yang masuk wallet).
 *
 * Script ini:
 *  1. Mencari semua WalletTransaction dengan wallet.walletType = qris,
 *     transactionType = income, referenceType = pos_transaction, dan feeAmount = 0.
 *  2. Menghitung ulang feeAmount (1% dari amount) dan netAmount yang seharusnya.
 *  3. Secara default berjalan DRY RUN: hanya mencetak laporan perubahan yang akan
 *     dilakukan, TIDAK menulis apa pun ke database.
 *  4. Jalankan dengan --apply untuk benar-benar menerapkan koreksi (transaksi +
 *     agregat wallet: currentBalance, totalIncome, todayIncome, totalFees).
 *
 * Cara pakai:
 *   npx ts-node -r tsconfig-paths/register scripts/correct-qris-fee.ts
 *   npx ts-node -r tsconfig-paths/register scripts/correct-qris-fee.ts --apply
 *   npx ts-node -r tsconfig-paths/register scripts/correct-qris-fee.ts --gym-id=<uuid>
 */

import { PrismaClient, WalletType, TransactionType, ReferenceType } from '@prisma/client';

const prisma = new PrismaClient();

const QRIS_FEE_PERCENTAGE = 1; // 1% — harus selalu sinkron dengan BUSINESS.WALLET.DEFAULT_QRIS_FEE_PERCENTAGE

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const gymIdArg = args.find(a => a.startsWith('--gym-id='));
  const gymId = gymIdArg ? gymIdArg.split('=')[1] : undefined;

  console.log('='.repeat(70));
  console.log(`Koreksi Fee QRIS — Mode: ${apply ? '⚠️  APPLY (menulis ke DB)' : '🔍 DRY RUN (tidak ada perubahan)'}`);
  if (gymId) console.log(`Filter gymId: ${gymId}`);
  console.log('='.repeat(70));

  // Ambil semua transaksi income QRIS dari POS yang belum ada potongan fee.
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
    console.log('\n✅ Tidak ada transaksi QRIS yang perlu dikoreksi.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nDitemukan ${transactions.length} transaksi QRIS tanpa potongan fee.\n`);

  // Kelompokkan dampak per wallet supaya agregat wallet bisa dikoreksi sekali per wallet.
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
  console.log('Ringkasan per wallet (gym):');
  for (const impact of walletImpact.values()) {
    console.log(
      `  ${impact.gymName}: ${impact.count} transaksi, total fee yang seharusnya dipotong = ${formatIDR(impact.totalFeeCorrection)}`,
    );
  }
  console.log('-'.repeat(70));
  console.log(`TOTAL fee yang ${apply ? 'sudah dipotong' : 'akan dipotong'} dari saldo gym owner: ${formatIDR(totalFeeCorrection)}`);
  console.log(`Total transaksi ${apply ? 'dikoreksi' : 'akan dikoreksi'}: ${transactions.length}`);

  if (!apply) {
    console.log('\n⚠️  Ini baru DRY RUN. Tidak ada perubahan yang ditulis ke database.');
    console.log('   Jalankan ulang dengan --apply setelah hasil di atas dikonfirmasi untuk menerapkan koreksi.');
  } else {
    console.log('\n✅ Koreksi selesai diterapkan ke database.');
  }

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('Gagal menjalankan koreksi:', err);
  await prisma.$disconnect();
  process.exit(1);
});
