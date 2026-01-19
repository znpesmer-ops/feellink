/**
 * Eser (Artwork) için QR kod ve kod üretimi yardımcı fonksiyonları
 */

/**
 * Eser için otomatik kod üretimi (PA24-00001 formatında)
 * Format: PA{YY}-{5 haneli numara}
 */
export function generateArtworkCode(): string {
  const year = new Date().getFullYear().toString().slice(-2); // 24
  const prefix = `PA${year}`;
  
  // Bu kod, PostsService içinde çağrıldığında mevcut artwork sayısına göre
  // numaralandırılacak şekilde düzenlenecek
  // Şimdilik basit bir random sayı kullanıyoruz
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  return `${prefix}-${randomNum}`;
}

/**
 * Eser için benzersiz kod oluşturma (database'deki son kodu kontrol ederek)
 */
export async function generateUniqueArtworkCode(
  prisma: any,
  prefix: string = `PA${new Date().getFullYear().toString().slice(-2)}`,
): Promise<string> {
  try {
    // Son eseri bul - MongoDB uyumlu query
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

    // Prefix ile başlayanları filtrele (client-side)
    const matchingArtworks = allArtworks.filter(
      (a: any) => a.code && a.code.startsWith(prefix)
    );

    let nextNumber = 1;

    if (matchingArtworks.length > 0) {
      // En büyük numarayı bul
      const numbers = matchingArtworks
        .map((a: any) => {
          const match = a.code.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => !isNaN(n));

      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    // 5 haneli numara formatı
    const numberStr = nextNumber.toString().padStart(5, '0');
    
    return `${prefix}-${numberStr}`;
  } catch (error) {
    console.error('[generateUniqueArtworkCode] Error:', error);
    // Fallback: Random kod
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}-${randomNum}`;
  }
}

