const express = require('express');
const router = express.Router();
const { Inventory } = require('../db');

// Tüm envanter ürünlerini getir
router.get('/', async (req, res) => {
  try {
    const items = await Inventory.findAll({
      order: [['updatedAt', 'DESC']]
    });
    res.json(items);
  } catch (error) {
    console.error('Envanter getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Yeni ürün ekle
router.post('/', async (req, res) => {
  try {
    // Zorunlu alanları kontrol et
    const requiredFields = ['name', 'category', 'unit', 'lastUpdatedBy'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Eksik alanlar mevcut', 
        missingFields: missingFields.map(field => {
          const fieldNames = {
            name: 'Ürün Adı',
            category: 'Kategori',
            unit: 'Birim',
            lastUpdatedBy: 'Güncelleyen Kullanıcı'
          };
          return fieldNames[field];
        })
      });
    }

    // Varsayılan değerleri ayarla
    const itemData = {
      ...req.body,
      quantity: req.body.quantity || 0,
      price: req.body.price || 0,
      status: req.body.status || 'Aktif'
    };

    const item = await Inventory.create(itemData);
    res.status(201).json(item);
  } catch (error) {
    console.error('Ürün ekleme hatası:', error);
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ 
        error: 'Geçersiz veri',
        details: error.errors.map(err => err.message)
      });
    } else {
      res.status(400).json({ error: 'Ürün eklenemedi' });
    }
  }
});

// Ürün güncelle
router.put('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    await item.update(req.body);
    res.json(item);
  } catch (error) {
    console.error('Ürün güncelleme hatası:', error);
    res.status(400).json({ error: 'Ürün güncellenemedi' });
  }
});

// Ürün sil
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    await item.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Ürün silme hatası:', error);
    res.status(400).json({ error: 'Ürün silinemedi' });
  }
});

// Stok güncelle
router.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await Inventory.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    await item.update({ quantity });
    res.json(item);
  } catch (error) {
    console.error('Stok güncelleme hatası:', error);
    res.status(400).json({ error: 'Stok güncellenemedi' });
  }
});

module.exports = router; 