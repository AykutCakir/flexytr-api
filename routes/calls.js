const express = require('express');
const router = express.Router();
const { Call, User } = require('../models');

// Tüm çağrıları getir
router.get('/', async (req, res) => {
  try {
    const calls = await Call.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        attributes: ['ad', 'soyad', 'rol']
      }]
    });
    res.json(calls);
  } catch (error) {
    console.error('Çağrıları getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Yeni çağrı oluştur
router.post('/', async (req, res) => {
  try {
    const call = await Call.create(req.body);
    res.status(201).json(call);
  } catch (error) {
    console.error('Çağrı oluşturma hatası:', error);
    res.status(400).json({ error: 'Çağrı oluşturulamadı' });
  }
});

// Çağrı güncelle
router.put('/:id', async (req, res) => {
  try {
    const call = await Call.findByPk(req.params.id);
    if (!call) {
      return res.status(404).json({ error: 'Çağrı bulunamadı' });
    }

    // Sadece çağrıyı oluşturan kişi güncelleyebilir
    if (parseInt(call.userId) !== parseInt(req.body.userId)) {
      return res.status(403).json({ error: 'Sadece çağrıyı oluşturan kişi bu kaydı güncelleyebilir' });
    }

    await call.update(req.body);
    res.json(call);
  } catch (error) {
    console.error('Çağrı güncelleme hatası:', error);
    res.status(400).json({ error: 'Çağrı güncellenemedi' });
  }
});

// Çağrı sil
router.delete('/:id', async (req, res) => {
  try {
    const call = await Call.findByPk(req.params.id);
    if (!call) {
      return res.status(404).json({ error: 'Çağrı bulunamadı' });
    }

    // Sadece çağrıyı oluşturan kişi silebilir
    const userId = req.query.userId;
    if (parseInt(call.userId) !== parseInt(userId)) {
      return res.status(403).json({ error: 'Sadece çağrıyı oluşturan kişi bu kaydı silebilir' });
    }

    await call.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Çağrı silme hatası:', error);
    res.status(400).json({ error: 'Çağrı silinemedi' });
  }
});

module.exports = router; 
