import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // ⛔️ Middleware SADECE route erişimini kısıtlar
  // Auth kararı client tarafında backend doğrulamasıyla verilir
  // Token kontrolü YAPILMAYACAK
  // Redirect YAPILMAYACAK
  
  return NextResponse.next()
}

export const config = {
  // ⛔️ Middleware devre dışı - auth kontrolü client-side yapılıyor
  matcher: [],
}
