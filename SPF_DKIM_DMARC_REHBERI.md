# E-posta Spoofing Koruması: SPF, DKIM, DMARC Rehberi

**Durum:** Brand impersonation (marka taklidi) — siteden veya sunucudan veri sızıntısı yok. Marka adı kullanılarak sahte e-postalar gönderilmiş. Site yayında kalacak, kod değişikliği yapılmayacak.

**Amaç:** Domain’inizden gelen sahte e-postaları (spoofing) engellemek veya karşı tarafın (Gmail, Outlook vb.) bu mailleri spam/quarantine’a atmasını sağlamak.

---

## 1. Mail Gönderiminiz Var mı?

| Durum | Ne yapılacak |
|-------|----------------|
| **Domain’den hiç mail göndermiyorsunuz** (örn. @sizinalanadi.com ile e-posta yok) | SPF’de `-all`, DMARC’ta `p=reject` kullanabilirsiniz. En sıkı koruma. |
| **Sadece 3. parti servislerden gönderiyorsunuz** (SendGrid, Mailgun, Resend, AWS SES, vb.) | SPF’de sadece o servisleri tanımlayın; DKIM’i o serviste yapılandırın; DMARC `p=quarantine` veya `p=reject`. |
| **Kendi sunucunuzdan SMTP ile gönderiyorsunuz** | SPF’de kendi sunucu IP’nizi ekleyin; sunucuda DKIM kullanın. |

**Netleştirme:** Feellink uygulamasında kullanıcı girişi / form / veri toplama yok; e-posta gönderimi de yoksa domain’i “mail göndermiyor” kabul edip en sıkı kayıtları ekleyebilirsiniz.

---

## 2. DNS Kayıtları (Domain DNS’inize eklenecek)

DNS yönetimi genelde domain satın aldığınız yerde (GoDaddy, Namecheap, Cloudflare, Google Domains vb.) veya Cloudflare DNS kullanıyorsanız orada yapılır. Aşağıdaki kayıtları **kendi domain adınızla** (örn. `feellink.com`) değiştirerek ekleyin.

---

### SPF (Sender Policy Framework)

**Amaç:** “Bu domain’den mail sadece şu sunuculardan çıkabilir” tanımı. Sahte sunucular listeye dahil olmadığı için başarısız olur.

| Mail gönderimi | Kayıt tipi | Host / Name | Value / Content | TTL |
|----------------|------------|-------------|------------------|-----|
| **Hiç yok** | TXT | `@` veya domain adı | `v=spf1 -all` | 3600 |
| **Var (örn. SendGrid)** | TXT | `@` | `v=spf1 include:sendgrid.net -all` | 3600 |
| **Birden fazla servis** | TXT | `@` | `v=spf1 include:sendgrid.net include:mailgun.org -all` | 3600 |

- **`-all`:** Listede olmayan her kaynak “yetkisiz”, reddedilsin (en sıkı).
- **`~all`:** Yetkisizler “soft fail” (önerilmez, spoofing’e açık).
- **`?all`:** Belirsiz (önerilmez).

**Not:** Bir domain için yalnızca **bir** SPF kaydı olmalı. Birden fazla servis kullanıyorsanız tek TXT’te `include:` ile birleştirin.

---

### DKIM (DomainKeys Identified Mail)

**Amaç:** Gönderen sunucunun, domain adına özel anahtarla imza atması. Alıcı sunucu bu imzayı doğrular; sahte maillerde imza olmadığı için güvenilmez sayılır.

- **Mail göndermiyorsanız:** DKIM kaydı **eklemeniz gerekmez**. SPF + DMARC yeterli.
- **Mail gönderiyorsanız:** Kullandığınız servis (SendGrid, Mailgun, Resend, vb.) size bir “DKIM kaydı” verir (genelde CNAME veya TXT). Sadece onu DNS’e eklersiniz; bu rehberde genel bir “değer” veremeyiz çünkü her servis farklı key üretir.

---

### DMARC (Domain-based Message Authentication, Reporting & Conformance)

**Amaç:** SPF/DKIM uyumsuz maillere ne yapılsın (quarantine / reject) ve raporlar nereye gitsin.

| Kayıt tipi | Host / Name | Value / Content | TTL |
|------------|-------------|------------------|-----|
| TXT | `_dmarc` | Aşağıdaki örneklerden biri | 3600 |

**Örnek 1 — Mail göndermiyorsanız (tercih: reject):**

```text
v=DMARC1; p=reject; rua=mailto:dmarc-reports@sizindomain.com; pct=100; adkim=s; aspf=s; fo=1
```

**Örnek 2 — Mail gönderiyorsanız (önce quarantine, sonra reject):**

```text
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@sizindomain.com; pct=100; adkim=s; aspf=s; fo=1
```

**Örnek 3 — Daha yumuşak başlangıç (sadece izle, reddetme):**

```text
v=DMARC1; p=none; rua=mailto:dmarc-reports@sizindomain.com; pct=100; adkim=s; aspf=s; fo=1
```

**Parametreler:**

| Parametre | Anlam | Öneri |
|-----------|--------|--------|
| `p=reject` | Uyumsuz mailler reddedilsin | Mail göndermiyorsanız kullanın. |
| `p=quarantine` | Uyumsuz mailler spam/quarantine’a | Mail gönderiyorsanız ve yanlış pozitif riski varsa. |
| `p=none` | Sadece raporla, reddetme | İlk kurulumda test için. |
| `rua=mailto:...` | Özet raporların gideceği adres | Kendi kullandığınız bir e-posta. |
| `pct=100` | Politikayı maillerin %100’üne uygula | 100 önerilir. |
| `adkim=s` | DKIM hizalama “strict” | s (strict) önerilir. |
| `aspf=s` | SPF hizalama “strict” | s (strict) önerilir. |
| `fo=1` | SPF veya DKIM fail olduğunda raporla | 1 önerilir. |

**Netleştirme:** Mail gönderiminiz yoksa **p=reject** kullanın. Varsa önce **p=quarantine** ile test edip sorun yoksa **p=reject**’e geçebilirsiniz.

---

## 3. Minimum Güvenlik Özeti

| Önlem | Eylem |
|-------|--------|
| **SPF** | Mutlaka ekleyin. Mail göndermiyorsanız: `v=spf1 -all`. |
| **DKIM** | Mail göndermiyorsanız atlayın; gönderiyorsanız mail sağlayıcınızın verdiği kaydı ekleyin. |
| **DMARC** | Mutlaka ekleyin. Tercihen `p=quarantine`, mümkünse `p=reject`. |
| **Raporlama** | `rua=mailto:...` ile en az bir rapor adresi verin; sahte kullanımı izleyin. |
| **Subdomain** | Ana domain’e ek olarak `_dmarc` kaydı tek başına yeterli; subdomain’ler için ayrı politika isterseniz aynı şablonda `_dmarc.altdomain` için de ekleyebilirsiniz. |

---

## 4. Kontrol ve Doğrulama

- **SPF:** [MXToolbox SPF Check](https://mxtoolbox.com/spf.aspx) — domain’inizi yazıp SPF’in geçerli ve tek kayıt olduğunu kontrol edin.
- **DMARC:** [MXToolbox DMARC Check](https://mxtoolbox.com/dmarc.aspx) — `_dmarc` kaydının göründüğünü ve politikayı doğrulayın.
- **Genel:** [Mail-tester.com](https://www.mail-tester.com) — Kendi domain’inizden test maili gönderip skor alabilirsiniz (mail gönderiyorsanız).

---

## 5. Özet Checklist

- [ ] Mail gönderimi var mı netleştirildi.
- [ ] SPF TXT kaydı eklendi (`v=spf1 -all` veya include’lar ile).
- [ ] Gerekirse DKIM (mail sağlayıcıdan alınan) eklendi.
- [ ] DMARC `_dmarc` TXT kaydı eklendi (`p=quarantine` veya `p=reject`).
- [ ] `rua` rapor adresi kullanılabilir bir e-posta olarak ayarlandı.
- [ ] MXToolbox (veya benzeri) ile SPF ve DMARC doğrulandı.

Bu ayarlar, marka adınızla yapılan e-posta spoofing’i engellemek veya büyük sağlayıcılar tarafından işaretlenmek için yeterli minimum güvenlik seviyesidir. Bu bir security breach değil, brand impersonation’a karşı domain tabanlı korumadır.
