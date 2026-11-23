import { Prisma, PrismaClient, Role } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();

if (!email || process.argv.length !== 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:promote -- <registered-user-email>');
  process.exitCode = 2;
} else {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.$transaction(
      async (transaction) => {
        const existingAdmins = await transaction.user.count({
          where: { role: Role.ADMIN },
        });

        if (existingAdmins > 0) {
          throw new Error('Initial admin bootstrap is only allowed when no administrators exist.');
        }

        return transaction.user.update({
          where: { email },
          data: { role: Role.ADMIN },
          select: { id: true, email: true, role: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    console.log(`Administrator role granted to ${user.email} (user ${user.id}).`);
  } catch (error) {
    console.error('Failed to promote user. Confirm the email exists and the database is available.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
