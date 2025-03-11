const express = require('express');
const router = express.Router();
const { Company } = require('../models');

// Tüm firmaları getir
router.get('/', async (req, res) => {
  try {
    const companies = await Company.findAll({
      order: [['name', 'ASC']]
    });
    res.json(companies);
  } catch (error) {
    console.error('Firmaları getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Yeni firma ekle
router.post('/', async (req, res) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (error) {
    console.error('Firma ekleme hatası:', error);
    res.status(400).json({ error: 'Firma eklenemedi' });
  }
});

// Firma güncelle
router.put('/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Firma bulunamadı' });
    }

    await company.update(req.body);
    res.json(company);
  } catch (error) {
    console.error('Firma güncelleme hatası:', error);
    res.status(400).json({ error: 'Firma güncellenemedi' });
  }
});

// Firma sil
router.delete('/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Firma bulunamadı' });
    }

    await company.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Firma silme hatası:', error);
    res.status(400).json({ error: 'Firma silinemedi' });
  }
});

module.exports = router; 
