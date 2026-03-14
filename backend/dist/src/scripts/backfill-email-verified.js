"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const count = await prisma.user.count({
        where: { isVerified: false },
    });
    console.log(`Users to update: ${count}`);
    const result = await prisma.user.updateMany({
        where: { isVerified: false },
        data: { isVerified: true },
    });
    console.log(`Updated users: ${result.count}`);
}
main()
    .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=backfill-email-verified.js.map