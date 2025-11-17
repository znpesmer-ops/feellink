import { PrismaClient, UserRole } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function fixUserRoles() {
  try {
    console.log('🔍 Kullanıcı rolleri kontrol ediliyor...')

    // Tüm kullanıcıları al ve roles alanı boş olanları filtrele
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        roles: true,
      },
    })

    const usersWithoutRoles = allUsers.filter(
      (user) => !user.roles || user.roles.length === 0
    )

    console.log(`📝 ${usersWithoutRoles.length} kullanıcı güncellenecek:\n`)

    for (const user of usersWithoutRoles) {
      const roleMap: Record<string, UserRole> = {
        art_lover: UserRole.art_lover,
        user: UserRole.art_lover,
        USER: UserRole.art_lover,
        corporate: UserRole.corporate,
        CORPORATE: UserRole.corporate,
        collector: UserRole.collector,
        COLLECTOR: UserRole.collector,
        artist: UserRole.artist,
        ARTIST: UserRole.artist,
        museum: UserRole.artist,
        MUSEUM: UserRole.artist,
      }

      const normalized = Array.from(
        new Set(
          (user.roles || [])
            .map((r) => roleMap[r] || null)
            .filter((value): value is UserRole => value !== null),
        ),
      )

      const defaultRoles: UserRole[] =
        normalized.length > 0 ? normalized : [UserRole.art_lover]

      await prisma.user.update({
        where: { id: user.id },
        data: { roles: { set: defaultRoles } },
      })

      console.log(
        `✅ ${user.username || user.email} → roles: [${defaultRoles.join(', ')}]`
      )
    }

    console.log('\n🎉 Tüm kullanıcı rolleri güncellendi!')

    // Tüm kullanıcıları kontrol et
    const allUsersCheck = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        roles: true,
      },
    })

    const usersStillWithoutRoles = allUsersCheck.filter(
      (u) => !u.roles || u.roles.length === 0
    )

    if (usersStillWithoutRoles.length > 0) {
      console.log(
        `\n⚠️  Hala ${usersStillWithoutRoles.length} kullanıcıda rol yok. Tekrar güncelleniyor...`
      )

      for (const user of usersStillWithoutRoles) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: { set: [UserRole.art_lover] } },
        })
      }

      console.log('✅ Tüm kullanıcılar varsayılan "art_lover" rolüne atandı.')
    }
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserRoles()
  .then(() => {
    console.log('✅ İşlem tamamlandı')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 İşlem başarısız:', error)
    process.exit(1)
  })

