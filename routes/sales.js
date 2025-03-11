const express = require('express');
const router = express.Router();
const { Sale, Inventory, User, Company } = require('../db');
const { sequelize } = require('../db');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');

// Tüm satışları getir
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.findAll({
      include: [
        {
          model: Inventory,
          attributes: ['name', 'category']
        }
      ],
      order: [['saleDate', 'DESC']]
    });
    res.json(sales);
  } catch (error) {
    console.error('Satışlar getirilirken hata:', error);
    res.status(500).json({ message: 'Satışlar getirilirken bir hata oluştu' });
  }
});

// Yeni satış ekle
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { inventoryId, userId, companyName, quantity, unitPrice, description } = req.body;

    // Kullanıcı bilgilerini al
    const user = await User.findByPk(userId);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Envanter kontrolü
    const inventory = await Inventory.findByPk(inventoryId);
    if (!inventory) {
      await t.rollback();
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Stok kontrolü
    if (inventory.quantity < quantity) {
      await t.rollback();
      return res.status(400).json({ error: 'Yetersiz stok' });
    }

    // Toplam fiyat hesapla
    const totalPrice = quantity * unitPrice;

    // Satış kaydı oluştur
    const sale = await Sale.create({
      inventoryId,
      userId,
      userFullName: `${user.ad} ${user.soyad}`,
      companyName,
      quantity,
      unitPrice,
      totalPrice,
      description,
      saleDate: new Date()
    }, { transaction: t });

    // Stok miktarını güncelle
    await inventory.update({
      quantity: inventory.quantity - quantity
    }, { transaction: t });

    await t.commit();
    res.status(201).json(sale);
  } catch (error) {
    await t.rollback();
    console.error('Satış oluşturma hatası:', error);
    res.status(400).json({ error: 'Satış oluşturulamadı' });
  }
});

// Satış detayını getir
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        {
          model: Inventory,
          attributes: ['name', 'category']
        },
        {
          model: User,
          attributes: ['ad', 'soyad']
        }
      ]
    });
    if (!sale) {
      return res.status(404).json({ error: 'Satış kaydı bulunamadı' });
    }
    res.json(sale);
  } catch (error) {
    console.error('Satış detayı getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Satış istatistiklerini getir
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Sale.findAll({
      attributes: [
        [sequelize.fn('sum', sequelize.col('totalPrice')), 'totalSales'],
        [sequelize.fn('count', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('sum', sequelize.col('quantity')), 'totalQuantity']
      ]
    });
    res.json(stats[0]);
  } catch (error) {
    console.error('Satış istatistikleri getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Toplu satış yap
router.post('/bulk', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { companyId, items, userId, paymentMethod } = req.body;

    // Kullanıcı bilgilerini al
    const user = await User.findByPk(userId);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Firma bilgilerini al
    const company = await Company.findByPk(companyId);
    if (!company) {
      await t.rollback();
      return res.status(404).json({ error: 'Firma bulunamadı' });
    }

    const sales = [];
    
    // Her ürün için satış kaydı oluştur
    for (const item of items) {
      // Envanter kontrolü
      const inventory = await Inventory.findByPk(item.inventoryId);
      if (!inventory) {
        await t.rollback();
        return res.status(404).json({ error: `Ürün bulunamadı: ${item.inventoryId}` });
      }

      // Stok kontrolü
      if (inventory.quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          error: `Yetersiz stok: ${inventory.name} (Mevcut: ${inventory.quantity}, İstenen: ${item.quantity})`
        });
      }

      // Toplam fiyat hesapla
      const totalPrice = item.quantity * item.unitPrice;

      try {
        // Satış kaydı oluştur
        const saleData = {
          inventoryId: item.inventoryId,
          userId: userId,
          companyId: parseInt(companyId),
          userFullName: `${user.ad} ${user.soyad}`,
          companyName: company.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: totalPrice,
          totalPrice: totalPrice,
          status: 'Beklemede',
          paymentMethod: paymentMethod,
          saleDate: new Date()
        };

        console.log('Oluşturulacak satış verisi:', saleData);

        const sale = await Sale.create(saleData, { 
          transaction: t,
          returning: true
        });

        // Stok miktarını güncelle
        await inventory.update({
          quantity: inventory.quantity - item.quantity
        }, { transaction: t });

        sales.push(sale);
      } catch (error) {
        console.error('Satış kaydı oluşturma hatası:', error);
        await t.rollback();
        return res.status(400).json({ error: 'Satış kaydı oluşturulamadı: ' + error.message });
      }
    }

    await t.commit();
    res.status(201).json(sales);
  } catch (error) {
    await t.rollback();
    console.error('Toplu satış hatası:', error);
    res.status(400).json({ error: 'Satış kaydedilirken bir hata oluştu' });
  }
});

// PDF raporu oluştur
router.post('/report', async (req, res) => {
  try {
    const { companyName, timeFilter, startDate, endDate } = req.body;
    console.log('Gelen istek:', req.body);

    // Sorgu koşullarını oluştur
    let where = {
      companyName: companyName
    };

    // Tarih filtresi
    if (timeFilter !== 'all') {
      const now = new Date();
      let startDateTime, endDateTime;

      switch (timeFilter) {
        case 'last30days':
          startDateTime = new Date(now.setDate(now.getDate() - 30));
          endDateTime = new Date();
          where.saleDate = {
            [Op.gte]: startDateTime,
            [Op.lte]: endDateTime
          };
          break;
        case 'lastYear':
          startDateTime = new Date(now.setFullYear(now.getFullYear() - 1));
          endDateTime = new Date();
          where.saleDate = {
            [Op.gte]: startDateTime,
            [Op.lte]: endDateTime
          };
          break;
        case 'custom':
          if (startDate && endDate) {
            // Başlangıç tarihini günün başına ayarla (00:00:00)
            startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);

            // Bitiş tarihini günün sonuna ayarla (23:59:59)
            endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            where.saleDate = {
              [Op.gte]: startDateTime,
              [Op.lte]: endDateTime
            };
          }
          break;
      }

      console.log('Tarih Aralığı:', {
        startDateTime,
        endDateTime,
        timeFilter,
        startDate,
        endDate
      });
    }

    console.log('Sorgu koşulları:', where);

    // Satışları getir
    const sales = await Sale.findAll({
      where,
      include: [
        {
          model: Inventory,
          attributes: ['name', 'category']
        }
      ],
      order: [['saleDate', 'DESC']]
    });

    console.log(`${sales.length} adet satış bulundu`);

    // PDF oluştur
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `${companyName} Satis Raporu`,
        Author: 'Satis Takip Sistemi'
      }
    });

    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(pdfData),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=satis-raporu-${companyName.replace(/[ğĞüÜşŞıİöÖçÇ]/g, '')}.pdf`
      }).end(pdfData);
    });

    // Üst bilgi
    doc.fillColor('#444444')
       .fontSize(20)
       .text('Satis Raporu', 50, 57)
       .fontSize(10)
       .text(`Olusturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 200, 65, { align: 'right' })
       .moveDown();

    // Firma Bilgileri
    doc.fillColor('#444444')
       .fontSize(14)
       .text('Firma Bilgileri', 50, 120)
       .fontSize(10)
       .text(`Firma Adi: ${companyName}`, 50, 140)
       .text(`Rapor Donemi: ${
         timeFilter === 'last30days' ? 'Son 30 Gun' :
         timeFilter === 'lastYear' ? 'Son 1 Yil' :
         timeFilter === 'custom' ? 
         `${new Date(startDate).toLocaleDateString('tr-TR')} - ${new Date(endDate).toLocaleDateString('tr-TR')}` :
         'Tum Zamanlar'
       }`, 50, 155)
       .moveDown();

    // Tablo Başlıkları
    let yPos = 200;
    const tableTop = yPos;
    doc.font('Helvetica-Bold');

    // Tablo başlık arkaplanı
    doc.fillColor('#2563eb')
       .rect(50, yPos, 495, 20)
       .fill();

    // Tablo başlık metinleri
    doc.fillColor('#FFFFFF')
       .text('Tarih', 60, yPos + 5)
       .text('Urun', 150, yPos + 5)
       .text('Miktar', 280, yPos + 5)
       .text('Birim Fiyat', 350, yPos + 5)
       .text('Toplam', 450, yPos + 5);

    // Tablo içeriği
    doc.font('Helvetica');
    yPos = tableTop + 30;
    let totalAmount = 0;
    let alternateRow = false;

    sales.forEach(sale => {
      // Satır arkaplanı
      if (alternateRow) {
        doc.fillColor('#f3f4f6')
           .rect(50, yPos - 5, 495, 20)
           .fill();
      }

      doc.fillColor('#444444')
         .text(new Date(sale.saleDate).toLocaleDateString('tr-TR'), 60, yPos)
         .text(sale.Inventory?.name || 'Silinmis Urun', 150, yPos)
         .text(sale.quantity.toString(), 280, yPos)
         .text(`${parseFloat(sale.unitPrice).toFixed(2)} TL`, 350, yPos)
         .text(`${parseFloat(sale.totalAmount).toFixed(2)} TL`, 450, yPos);

      totalAmount += parseFloat(sale.totalAmount);
      yPos += 20;
      alternateRow = !alternateRow;

      // Sayfa kontrolü
      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
      }
    });

    // Toplam tutar
    doc.font('Helvetica-Bold')
       .fillColor('#2563eb')
       .fontSize(12)
       .text('Toplam:', 350, yPos + 20)
       .text(`${totalAmount.toFixed(2)} TL`, 450, yPos + 20);

    // Alt bilgi
    doc.fontSize(8)
       .fillColor('#666666')
       .text(
         'Bu rapor otomatik olarak olusturulmustur.',
         50,
         doc.page.height - 50,
         { align: 'center' }
       );

    doc.end();

  } catch (error) {
    console.error('PDF olusturma hatasi:', error);
    res.status(500).json({ message: 'PDF olusturulurken bir hata olustu' });
  }
});

module.exports = router; 