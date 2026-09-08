export type LegalSection = {
  title: string
  paragraphs?: string[]
  items?: string[]
}

export const legalUpdatedAt = '21 Mayıs 2026'

export const legalContactEmail = 'destek@feellink.io'

export const legalQuickSummary = [
  'Feellink; sanat, kültürel üretim, sosyal etkileşim, mesajlaşma, koleksiyon, etkinlik ve ilan akışları için kullanılan dijital bir platformdur.',
  'Kullanıcı, hesabı ve kendi paylaştığı içeriklerin hukuka, telif haklarına, kişilik haklarına ve topluluk düzenine uygun olmasından sorumludur.',
  'Feellink; güvenlik, hukuki uyum ve topluluk kalitesi için içerikleri inceleyebilir, görünürlüğü sınırlayabilir, kaldırabilir veya hesabı askıya alabilir.',
  'KVKK Aydınlatma Metni; hangi verilerin, hangi amaçlarla, hangi hukuki sebeplerle işlendiğini ve kullanıcının haklarını açıklar.',
]

export const termsSections: LegalSection[] = [
  {
    title: '1. Taraflar, Kapsam ve Kabul',
    paragraphs: [
      'Bu Kullanıcı Sözleşmesi, Feellink platformuna üye olan veya platform hizmetlerinden yararlanan kullanıcı ile Feellink platform işletmecisi arasındaki kullanım koşullarını düzenler.',
      'Kullanıcı; hesap oluşturarak, platformu kullanarak veya ilgili onay kutucuğunu işaretleyerek bu sözleşmeyi okuduğunu, anladığını ve kendisi açısından bağlayıcı olduğunu kabul eder. KVKK Aydınlatma Metni ayrı bir bilgilendirme metnidir; açık rıza gerektiren hallerde kullanıcıdan ayrıca ve açık biçimde onay alınır.',
    ],
  },
  {
    title: '2. Hizmetin Niteliği',
    paragraphs: [
      'Feellink; eser, gönderi, yazı, profil, sergi, koleksiyon, takip, beğeni, yorum, mesajlaşma, etkinlik, bilet/kayıt ve ilan gibi özellikleri bir araya getiren sanat ve kültür odaklı bir dijital platformdur.',
      'Platform, kullanıcıların kendi içeriklerini sergileyebileceği ve diğer kullanıcılarla etkileşime geçebileceği bir aracı hizmet niteliğindedir. Kullanıcılar arasında doğan bağımsız ilişki, anlaşma, etkinlik katılımı, ilan başvurusu veya ticari süreçlerden ilgili kullanıcılar sorumludur.',
    ],
  },
  {
    title: '3. Hesap, Yaş ve Güvenlik',
    items: [
      'Kullanıcı kayıt sırasında doğru, güncel ve kendisine ait bilgiler vermelidir.',
      'Hesap bilgileri, şifre ve doğrulama kodlarının gizliliği kullanıcının sorumluluğundadır.',
      '13 yaşından küçük kişiler platformu kullanamaz. 18 yaşından küçük kullanıcılar, platformu veli veya yasal temsilci bilgisi ve sorumluluğu altında kullanmalıdır.',
      'Hesapta şüpheli işlem, yetkisiz erişim veya güvenlik riski fark edilirse Feellink destek kanalları üzerinden gecikmeden bildirim yapılmalıdır.',
    ],
  },
  {
    title: '4. Kullanıcı İçerikleri ve Fikri Haklar',
    paragraphs: [
      'Kullanıcı, platforma yüklediği veya platformda paylaştığı eser, fotoğraf, görsel, metin, yorum, mesaj ve diğer içeriklerin hak sahibi olduğunu ya da bunları kullanmak için gerekli izinlere sahip olduğunu beyan eder.',
      'İçeriklerin mülkiyeti kullanıcıda kalır. Feellink, kullanıcı adına eser yükleyen veya eser üzerinde sahiplik iddia eden taraf değildir; yalnızca kullanıcının platforma kendi iradesiyle yüklediği içeriği barındırmak, göstermek, teknik olarak boyutlandırmak, güvenli biçimde sunmak ve Feellink içinde keşfedilebilir hale getirmek için zorunlu, sınırlı ve gayri münhasır bir teknik kullanım iznine ihtiyaç duyar.',
      'Kullanıcı bir içeriği sildiğinde, Feellink bu içeriğin aktif yayınını kaldırmak için makul teknik süreçleri uygular. Yedekler, loglar, hukuki yükümlülükler ve uyuşmazlık kayıtları sebebiyle sınırlı saklama süreleri devam edebilir.',
    ],
  },
  {
    title: '5. Yasaklı Kullanımlar',
    items: [
      'Telif hakkı, marka hakkı, kişilik hakkı, özel hayat, KVKK veya diğer mevzuata aykırı içerik paylaşmak.',
      'Nefret söylemi, taciz, tehdit, şiddet, cinsel istismar, dolandırıcılık, spam, kimlik taklidi veya yanıltıcı faaliyetlerde bulunmak.',
      'Platformun güvenliğini, çalışmasını veya diğer kullanıcıların deneyimini bozacak otomasyon, bot, scraping, tersine mühendislik, zararlı yazılım veya yetkisiz erişim girişimlerinde bulunmak.',
      'Başka kullanıcıların verilerini izinsiz toplamak, ifşa etmek veya platform dışı amaçlarla kullanmak.',
    ],
  },
  {
    title: '6. Moderasyon ve Hesap Tedbirleri',
    paragraphs: [
      'Feellink; hukuka aykırılık, güvenlik riski, topluluk düzeninin bozulması, hak ihlali iddiası veya platform kurallarına aykırılık halinde içeriği inceleyebilir, görünürlüğünü sınırlayabilir, kaldırabilir, hesabı geçici veya kalıcı olarak kısıtlayabilir.',
      'Gerekli hallerde yetkili resmi makam talepleri, mahkeme kararları veya mevzuattan doğan yükümlülükler kapsamında bilgi ve kayıtlar ilgili makamlarla paylaşılabilir.',
    ],
  },
  {
    title: '7. Mesajlaşma, Etkinlikler ve İlanlar',
    paragraphs: [
      'Mesajlaşma ve kullanıcılar arası iletişimlerde, kullanıcıların kendi beyan, teklif, söz ve davranışlarından kendileri sorumludur. Feellink, kullanıcılar arasında açıkça taraf olmadığı süreçlerde garanti, temsilcilik veya taahhüt üstlenmez.',
      'Etkinlik, bilet, başvuru veya ilan akışları için ek şartlar ilgili sayfada ayrıca bildirilebilir. Bu ek şartlar, ilgili işlem için bu sözleşmenin tamamlayıcı parçası olur.',
    ],
  },
  {
    title: '8. Hizmet Sürekliliği ve Değişiklikler',
    paragraphs: [
      'Feellink, platformun güvenli ve sürekli çalışması için makul teknik ve idari tedbirleri alır. Bununla birlikte bakım, güncelleme, altyapı, üçüncü taraf servis, internet kesintisi veya mücbir sebep kaynaklı geçici aksaklıklar yaşanabilir.',
      'Platform özellikleri, tasarımı, teknik altyapısı ve kuralları zaman içinde güncellenebilir. Esaslı değişiklikler uygun yöntemlerle kullanıcılara duyurulur.',
    ],
  },
  {
    title: '9. Sorumluluk Sınırları',
    paragraphs: [
      'Feellink, uygulanabilir emredici hukuk kuralları saklı kalmak kaydıyla, kullanıcı kaynaklı içerikler, kullanıcılar arası ilişkiler, üçüncü taraf servisler ve kullanıcının platformu sözleşmeye aykırı kullanması nedeniyle doğan dolaylı zararlardan sorumlu tutulamaz.',
      'Bu madde; tüketici mevzuatı, KVKK, fikri haklar ve diğer emredici hükümlerden doğan hakları ortadan kaldıracak şekilde yorumlanamaz.',
    ],
  },
  {
    title: '10. Fesih, Hesap Silme ve Saklama',
    paragraphs: [
      'Kullanıcı, hesabını platformdaki ayarlar veya destek kanalları aracılığıyla kapatma talebinde bulunabilir. Hesap kapatma sonrasında aktif profil görünürlüğü kaldırılır; ancak mevzuat, güvenlik, uyuşmazlık ve yedekleme gereklilikleri kapsamında bazı kayıtlar sınırlı süreyle saklanabilir.',
      'Feellink, ciddi veya tekrarlanan ihlallerde hesabı askıya alabilir ya da sonlandırabilir.',
    ],
  },
  {
    title: '11. Uygulanacak Hukuk ve Başvuru',
    paragraphs: [
      'Bu sözleşme Türkiye Cumhuriyeti hukukuna tabidir. Kullanıcıların tüketici mevzuatı ve emredici hukuk kurallarından doğan başvuru hakları saklıdır.',
      `Sorular, destek talepleri ve hukuki bildirimler için ${legalContactEmail} adresi üzerinden Feellink ile iletişime geçilebilir.`,
    ],
  },
]

export const kvkkSections: LegalSection[] = [
  {
    title: '1. Veri Sorumlusu ve Kapsam',
    paragraphs: [
      'Bu KVKK Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Feellink platformunun kullanımı sırasında işlenen kişisel verilere ilişkin bilgilendirme amacıyla hazırlanmıştır.',
      `Veri işleme süreçlerine ilişkin sorular ve başvurular için ${legalContactEmail} adresi kullanılabilir. Feellink'in ticari unvan, adres ve resmi veri sorumlusu bilgileri, platform işletmecisi tarafından kullanıcıya sunulan resmi kayıtlarla birlikte değerlendirilir.`,
    ],
  },
  {
    title: '2. İşlenen Kişisel Veri Kategorileri',
    items: [
      'Kimlik ve iletişim verileri: ad, soyad, kullanıcı adı, e-posta adresi, profil bilgileri ve rol bilgisi.',
      'Hesap ve güvenlik verileri: şifrenin hashlenmiş hali, doğrulama kayıtları, oturum bilgileri, IP adresi, cihaz/tarayıcı bilgileri, son aktiflik ve işlem logları.',
      'İçerik ve etkileşim verileri: gönderiler, eserler, görseller, açıklamalar, yazılar, yorumlar, beğeniler, kaydetmeler, koleksiyonlar, takip ilişkileri, bildirimler ve mesajlaşma kayıtları.',
      'Etkinlik, ilan ve başvuru verileri: etkinlik kaydı, bilet/işlem bilgileri, ilan başvuruları ve ilgili tercih bilgileri.',
      'Destek ve talep verileri: kullanıcının destek, şikayet, hak ihlali veya KVKK başvurusu sırasında ilettiği bilgiler.',
      'Analitik ve tercih verileri: platform içindeki kullanım hareketleri, görüntülenme, etkileşim, renk/içerik analizleri ve bildirim tercihleri.',
    ],
  },
  {
    title: '3. İşleme Amaçları',
    items: [
      'Üyelik oluşturma, kimlik doğrulama, oturum açma, e-posta doğrulama ve hesap güvenliğini sağlama.',
      'Profil, eser, sergi, gönderi, yazı, koleksiyon, takip, yorum, beğeni, mesajlaşma, bildirim, etkinlik ve ilan özelliklerini çalıştırma.',
      'İçerik moderasyonu, hak ihlali incelemesi, kötüye kullanımla mücadele, dolandırıcılık ve güvenlik risklerinin önlenmesi.',
      'Kullanıcı deneyimini, performansı, erişilebilirliği ve ürün kalitesini iyileştirme.',
      'Destek taleplerini yanıtlama, uyuşmazlıkları yönetme ve yasal yükümlülükleri yerine getirme.',
      'Kullanıcının ayrıca izin verdiği hallerde duyuru, etkinlik veya pazarlama iletişimleri gönderme.',
    ],
  },
  {
    title: '4. Hukuki Sebepler',
    paragraphs: [
      'Kişisel veriler; sözleşmenin kurulması veya ifası, veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi, bir hakkın tesisi, kullanılması veya korunması, ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat ve gerekli hallerde açık rıza hukuki sebeplerine dayanılarak işlenir.',
      'Açık rıza gerektiren süreçler, üye olma veya kullanıcı sözleşmesini kabul etme kutucuğundan ayrıdır. Bu nedenle KVKK Aydınlatma Metni’nin okunması, tek başına tüm veri işleme faaliyetleri için açık rıza verildiği anlamına gelmez.',
    ],
  },
  {
    title: '5. Toplama Yöntemleri',
    paragraphs: [
      'Veriler; kayıt ve profil formları, içerik yükleme alanları, mesajlaşma ve etkileşim özellikleri, destek talepleri, cihaz/tarayıcı logları, çerezler ve platformun teknik altyapısı aracılığıyla elektronik ortamda toplanır.',
    ],
  },
  {
    title: '6. Aktarımlar ve Hizmet Sağlayıcılar',
    paragraphs: [
      'Kişisel veriler; barındırma, veri tabanı, dosya depolama, e-posta gönderimi, bildirim, güvenlik, hata izleme, analiz, ödeme/bilet ve destek hizmetleri için gerekli ölçüde hizmet sağlayıcılarla paylaşılabilir.',
      'Yetkili kamu kurumları, mahkemeler, icra mercileri veya mevzuat gereği talepte bulunan resmi makamlarla, yalnızca hukuki zorunluluk kapsamında veri paylaşılabilir.',
      'Yurt dışı altyapı veya hizmet sağlayıcılarının kullanıldığı durumlarda aktarımlar, KVKK’nın yurt dışına aktarıma ilişkin hükümleri ve ilgili ikincil düzenlemelerde öngörülen şartlar çerçevesinde yürütülür.',
    ],
  },
  {
    title: '7. Saklama Süreleri',
    paragraphs: [
      'Veriler, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen zaman aşımı, yedekleme, muhasebe, güvenlik, uyuşmazlık ve hukuki yükümlülük süreleriyle sınırlı olarak saklanır.',
      'Hesap kapatma veya içerik silme taleplerinde aktif görünürlük kaldırılır; ancak log, yedek, güvenlik ve hukuki saklama gereklilikleri nedeniyle bazı kayıtlar sınırlı süreyle muhafaza edilebilir. İşleme amacı ortadan kalktığında veriler silinir, yok edilir veya anonim hale getirilir.',
    ],
  },
  {
    title: '8. İlgili Kişi Hakları',
    items: [
      'Kişisel verilerinin işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme.',
      'İşleme amacını ve verilerin amacına uygun kullanılıp kullanılmadığını öğrenme.',
      'Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme.',
      'Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme.',
      'KVKK’da öngörülen şartlar çerçevesinde verilerin silinmesini veya yok edilmesini isteme.',
      'Düzeltme, silme veya yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
      'Münhasıran otomatik sistemlerle analiz edilmesi nedeniyle aleyhe bir sonucun ortaya çıkmasına itiraz etme.',
      'Kanuna aykırı işleme nedeniyle zarara uğraması halinde zararın giderilmesini talep etme.',
    ],
  },
  {
    title: '9. Başvuru Yöntemi',
    paragraphs: [
      `Kullanıcılar KVKK kapsamındaki taleplerini ${legalContactEmail} adresine iletebilir. Başvurunun güvenli şekilde sonuçlandırılabilmesi için Feellink, talep sahibinin kimliğini doğrulamaya yönelik ek bilgi isteyebilir.`,
      'Başvurular, niteliğine göre en kısa sürede ve en geç otuz gün içinde sonuçlandırılır. İşlem ayrıca bir maliyet gerektirirse mevzuatta belirlenen tarifeye uygun ücret talep edilebilir.',
    ],
  },
  {
    title: '10. Çerezler, Güvenlik ve Güncellemeler',
    paragraphs: [
      'Feellink, oturumun güvenli sürdürülmesi, tercihlerin hatırlanması, performans ölçümü ve kötüye kullanımla mücadele için zorunlu veya tercihe bağlı çerezler ve benzeri teknolojiler kullanabilir.',
      'Bu metin, platformdaki teknik, hukuki veya operasyonel değişikliklere göre güncellenebilir. Güncel metin platformda yayımlandığı tarihten itibaren geçerlidir.',
    ],
  },
]
