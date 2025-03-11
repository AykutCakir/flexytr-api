const express = require('express');
const router = express.Router();
const { Report, User } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Rol hiyerarşisini tanımla
const roleHierarchy = {
  'ADMIN': ['PROJE_YONETICISI', 'TAKIM_LIDERI', 'EKIP_LIDERI', 'YAZILIM', 'SATIS', 'MUSTERI_DESTEK', 'KULLANICI'],
  'PROJE_YONETICISI': ['TAKIM_LIDERI', 'EKIP_LIDERI', 'YAZILIM', 'SATIS', 'MUSTERI_DESTEK', 'KULLANICI'],
  'TAKIM_LIDERI': ['EKIP_LIDERI', 'YAZILIM', 'SATIS', 'MUSTERI_DESTEK', 'KULLANICI'],
  'EKIP_LIDERI': ['YAZILIM', 'SATIS', 'MUSTERI_DESTEK', 'KULLANICI'],
  'YAZILIM': [],
  'SATIS': [],
  'MUSTERI_DESTEK': [],
  'KULLANICI': []
};

// Rol kontrolü için yardımcı fonksiyon
function getNormalizedRole(role) {
  return role.toUpperCase();
}

// Renk tanımlamaları
const colors = {
  primary: '#006d77',    // Koyu turkuaz
  secondary: '#ff9f1c',  // Turuncu
  text: '#2b2d42',       // Koyu gri
  lightText: '#666666',  // Açık gri
  background: '#edf6f9', // Açık turkuaz
  white: '#ffffff'       // Beyaz
};

// Font dosyalarının yolları
const FONTS = {
  regular: path.join(__dirname, '../fonts/Roboto-Regular.ttf'),
  bold: path.join(__dirname, '../fonts/Roboto-Bold.ttf'),
  medium: path.join(__dirname, '../fonts/Roboto-Medium.ttf')
};

// Durum metinlerini Türkçeleştir
const statusMap = {
  'taslak': 'Taslak',
  'gönderildi': 'Gönderildi',
  'incelendi': 'İncelendi',
  'onaylandı': 'Onaylandı',
  'reddedildi': 'Reddedildi'
};

// Türkçe karakter dönüşüm fonksiyonu
function convertTurkishChars(text) {
  const turkishChars = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, match => turkishChars[match] || match);
}

// Raporları getir (Rol bazlı filtreleme ile)
router.get('/', async (req, res) => {
  try {
    const { userId, userRole } = req.query;

    if (!userId || !userRole) {
      return res.status(400).json({ error: 'Kullanıcı bilgileri eksik' });
    }

    let whereClause = {};
    const normalizedRole = getNormalizedRole(userRole);

    // Admin tüm raporları görebilir
    if (normalizedRole !== 'ADMIN') {
      // Kullanıcının görebileceği rolleri al
      const viewableRoles = roleHierarchy[normalizedRole] ? [normalizedRole, ...roleHierarchy[normalizedRole]] : [normalizedRole];
      
      // Kullanıcının kendi raporları ve alt rollerin raporları
      whereClause = {
        userRole: {
          [Op.in]: viewableRoles
        }
      };
    }

    const reports = await Report.findAll({
      where: whereClause,
      order: [['reportDate', 'DESC']],
      include: [{
        model: User,
        attributes: ['ad', 'soyad', 'rol']
      }]
    });

    res.json(reports);
  } catch (error) {
    console.error('Raporları getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Yeni rapor oluştur
router.post('/', async (req, res) => {
  try {
    const { userId, title, content } = req.body;

    // Kullanıcı bilgilerini al
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const report = await Report.create({
      userId,
      title,
      content,
      userRole: user.rol,
      userFullName: `${user.ad} ${user.soyad}`,
      reportDate: new Date()
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Rapor oluşturma hatası:', error);
    res.status(400).json({ error: 'Rapor oluşturulamadı' });
  }
});

// Rapor güncelle
router.put('/:id', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // Sadece rapor sahibi güncelleyebilir
    if (report.userId !== parseInt(req.body.userId)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    await report.update(req.body);
    res.json(report);
  } catch (error) {
    console.error('Rapor güncelleme hatası:', error);
    res.status(400).json({ error: 'Rapor güncellenemedi' });
  }
});

// Rapor sil
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // Sadece rapor sahibi veya Admin silebilir
    const user = await User.findByPk(req.query.userId);
    if (report.userId !== parseInt(req.query.userId) && user.rol !== 'ADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    await report.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Rapor silme hatası:', error);
    res.status(400).json({ error: 'Rapor silinemedi' });
  }
});

// Rapor durumunu güncelle
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, newStatus } = req.body;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // Kullanıcının yetkisini kontrol et
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Kullanıcının üst rolde olup olmadığını kontrol et
    const reportUser = await User.findByPk(report.userId);
    const canUpdate = user.rol === 'ADMIN' || 
                     (roleHierarchy[user.rol] && roleHierarchy[user.rol].includes(reportUser.rol));

    if (!canUpdate) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    await report.update({ status: newStatus });
    res.json(report);
  } catch (error) {
    console.error('Rapor durumu güncelleme hatası:', error);
    res.status(400).json({ error: 'Rapor durumu güncellenemedi' });
  }
});

// Rapor indir
router.get('/:id/download', async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Rapor bulunamadı' });
    }

    // PDF oluştur
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    // Fontları kaydet
    doc.registerFont('Regular', FONTS.regular);
    doc.registerFont('Bold', FONTS.bold);
    doc.registerFont('Medium', FONTS.medium);

    // Response headerlarını ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapor-${report.id}.pdf`);

    // PDF'i response stream'e yönlendir
    doc.pipe(res);

    // Sayfa kenarlığı
    doc.rect(20, 20, 555, 800)
       .lineWidth(2)
       .stroke(colors.primary);

    // Üst başlık alanı
    doc.rect(20, 20, 555, 100)
       .fill(colors.primary);

    // Logo veya başlık
    doc.font('Bold')
       .fontSize(28)
       .fillColor(colors.white)
       .text('FlexyTR', 50, 45);

    doc.font('Regular')
       .fontSize(14)
       .fillColor(colors.white)
       .text('Rapor Detayı', 50, 85);

    // Tarih
    const formattedDate = new Date(report.reportDate).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.font('Regular')
       .fontSize(10)
       .fillColor(colors.white)
       .text(formattedDate, 400, 85);

    // Meta bilgiler için arka plan
    doc.rect(50, 150, 495, 130)
       .fill(colors.background);

    // Turuncu ayraç çizgisi
    doc.rect(50, 150, 5, 130)
       .fill(colors.secondary);

    // Meta bilgiler
    const metaData = [
      { label: 'Başlık', value: report.title },
      { label: 'Oluşturan', value: report.userFullName },
      { label: 'Rol', value: report.userRole },
      { label: 'Durum', value: statusMap[report.status] || report.status }
    ];

    let yPos = 170;
    metaData.forEach(item => {
      // Etiket
      doc.font('Medium')
         .fontSize(11)
         .fillColor(colors.primary)
         .text(item.label + ':', 70, yPos);

      // Değer
      doc.font('Regular')
         .fontSize(11)
         .fillColor(colors.text)
         .text(item.value, 200, yPos);

      yPos += 25;
    });

    // İçerik başlığı için turuncu çizgi
    doc.rect(50, 310, 100, 3)
       .fill(colors.secondary);

    // İçerik başlığı
    doc.font('Medium')
       .fontSize(16)
       .fillColor(colors.primary)
       .text('İçerik', 50, 330);

    // İçerik alanı için arka plan
    doc.rect(50, 360, 495, 350)
       .fill(colors.background);

    // İçerik metni
    doc.font('Regular')
       .fontSize(11)
       .fillColor(colors.text)
       .text(report.content, 60, 370, {
         width: 475,
         align: 'justify',
         lineGap: 5
       });

    // Alt bilgi alanı
    doc.rect(20, 740, 555, 80)
       .fill(colors.primary);

    // Alt bilgi metni
    doc.font('Regular')
       .fontSize(9)
       .fillColor(colors.white)
       .text('Bu rapor FlexyTR sisteminde otomatik olarak oluşturulmuştur.', 50, 760, { 
         align: 'center',
         width: 495
       });

    // Sayfa numarası
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.font('Regular')
         .fontSize(9)
         .fillColor(colors.white)
         .text(
           `Sayfa ${i + 1} / ${pages.count}`,
           50,
           780,
           { align: 'right', width: 495 }
         );
    }

    // PDF'i sonlandır
    doc.end();

  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    res.status(500).json({ error: 'PDF oluşturulurken bir hata oluştu' });
  }
});

module.exports = router; 
