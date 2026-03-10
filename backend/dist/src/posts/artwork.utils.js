"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueArtworkCode = exports.generateArtworkCode = void 0;
function generateArtworkCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `PA${year}`;
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}-${randomNum}`;
}
exports.generateArtworkCode = generateArtworkCode;
async function generateUniqueArtworkCode(prisma, prefix = `PA${new Date().getFullYear().toString().slice(-2)}`) {
    try {
        const allArtworks = await prisma.post.findMany({
            where: {
                type: 'artwork',
                code: { not: null },
            },
            select: {
                code: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        const matchingArtworks = allArtworks.filter((a) => a.code && a.code.startsWith(prefix));
        let nextNumber = 1;
        if (matchingArtworks.length > 0) {
            const numbers = matchingArtworks
                .map((a) => {
                const match = a.code.match(/-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
                .filter((n) => !isNaN(n));
            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }
        const numberStr = nextNumber.toString().padStart(5, '0');
        return `${prefix}-${numberStr}`;
    }
    catch (error) {
        console.error('[generateUniqueArtworkCode] Error:', error);
        const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        return `${prefix}-${randomNum}`;
    }
}
exports.generateUniqueArtworkCode = generateUniqueArtworkCode;
//# sourceMappingURL=artwork.utils.js.map