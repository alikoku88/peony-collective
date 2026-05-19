# 🌸 Peony Collective — WhatsApp Yönetim Paneli

## Kurulum & Deploy

### 1. GitHub'a Yükle
```bash
git init
git add .
git commit -m "Initial commit - Peony Collective Panel"
git remote add origin https://github.com/KULLANICI_ADI/peony-collective.git
git push -u origin main
```

### 2. Render.com'a Deploy

1. [render.com](https://render.com) → New → Web Service
2. GitHub reposunu bağla
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `node server.js`

#### Environment Variables (Render Dashboard → Environment):
```
MONGODB_URI     = mongodb+srv://peonyadmin:SIFRENIZ@peonycluster.cvh020p.mongodb.net/peonydb?appName=PeonyCluster
JWT_SECRET      = peony_jwt_secret_2026_super_secure
WHATSAPP_TOKEN  = META_PERMANENT_TOKEN_BURAYA
PHONE_NUMBER_ID = 1096711590199347
VERIFY_TOKEN    = peony2026
```

### 3. Panel Giriş Bilgileri
- **Email:** info@peonycollective.com
- **Şifre:** 123456

### 4. WhatsApp Webhook Ayarı (Meta Developer Console)
- Webhook URL: `https://RENDER_URL.onrender.com/webhook`
- Verify Token: `peony2026`
- Subscribe: messages, message_deliveries

## Özellikler
- ✅ Email/şifre girişi
- ✅ Kişi yönetimi (CRUD + CSV import)
- ✅ Grup/liste sistemi
- ✅ Toplu mesaj gönderimi (15-25sn aralıklarla)
- ✅ Canlı ilerleme göstergesi (SSE)
- ✅ Template mesaj gönderimi
- ✅ Zamanlanmış gönderim (cron)
- ✅ Kullanıcı yönetimi
- ✅ Gönderim geçmişi
