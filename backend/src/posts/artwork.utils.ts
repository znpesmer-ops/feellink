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
  // Son eseri bul - code field'ı null olmayan ve prefix ile başlayan
  const lastArtwork = await prisma.post.findFirst({
    where: {
      type: 'artwork',
      code: {
        not: null,
        startsWith: prefix,
      },
    },
    orderBy: {
      code: 'desc',
    },
  });

  let nextNumber = 1;

  if (lastArtwork && lastArtwork.code) {
    // Son kodun numarasını çıkar (PA24-00001 -> 1)
    const match = lastArtwork.code.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // 5 haneli numara formatı
  const numberStr = nextNumber.toString().padStart(5, '0');
  
  return `${prefix}-${numberStr}`;
}

