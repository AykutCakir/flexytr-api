const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Yeni kullanıcı oluşturma
router.post('/', async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error);
    res.status(400).json({ error: 'Kullanıcı oluşturulamadı' });
  }
});

// Kullanıcı güncelleme
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Şifre boş gönderildiyse güncelleme yapma
    if (!req.body.password) {
      delete req.body.password;
    }

    await user.update(req.body);
    res.json(user);
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    res.status(400).json({ error: 'Kullanıcı güncellenemedi' });
  }
});

// Kullanıcı silme
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    await user.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(400).json({ error: 'Kullanıcı silinemedi' });
  }
});

// Tüm kullanıcıları getir
router.get('/', async (req, res) => {
  try {
    console.log('Tüm kullanıcılar istendi');
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    console.log(`${users.length} kullanıcı bulundu`);
    res.json(users);
  } catch (error) {
    console.error('Kullanıcıları getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası', details: error.message });
  }
});

// Login endpoint'i
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login denemesi başladı:', { email, body: req.body });

    if (!email || !password) {
      console.log('Email veya şifre eksik:', { email, passwordExists: !!password });
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'password', 'ad', 'soyad', 'rol', 'durum']
    });

    console.log('Kullanıcı arama sonucu:', { 
      bulundu: !!user, 
      email,
      userDetails: user ? {
        id: user.id,
        email: user.email,
        rol: user.rol,
        durum: user.durum,
        passwordExists: !!user.password
      } : null
    });

    if (!user) {
      console.log('Kullanıcı bulunamadı:', email);
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    // Şifre kontrolü
    console.log('Şifre kontrolü başlıyor...');
    try {
      const isValidPassword = await user.checkPassword(password);
      console.log('Şifre kontrolü sonucu:', { isValidPassword });

      if (!isValidPassword) {
        console.log('Şifre hatalı:', email);
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }
    } catch (passwordError) {
      console.error('Şifre kontrolü sırasında hata:', passwordError);
      return res.status(500).json({ 
        error: 'Şifre kontrolü sırasında hata oluştu',
        details: process.env.NODE_ENV === 'development' ? passwordError.message : undefined
      });
    }

    // Kullanıcı durumunu kontrol et
    if (user.durum !== 'aktif') {
      console.log('Hesap aktif değil:', { email, durum: user.durum });
      return res.status(401).json({ error: 'Hesabınız aktif değil' });
    }

    // Son giriş zamanını güncelle
    console.log('Son giriş zamanı güncelleniyor...');
    try {
      await user.update({ songiris: new Date() });
    } catch (updateError) {
      console.error('Son giriş zamanı güncellenirken hata:', updateError);
      // Bu hatayı görmezden gelebiliriz, login işlemine devam edebiliriz
    }

    // JWT token oluştur
    console.log('JWT token oluşturuluyor...');
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        rol: user.rol
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('Login başarılı:', {
      email,
      userId: user.id,
      rol: user.rol
    });

    // Kullanıcı bilgilerini ve token'ı gönder
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        ad: user.ad,
        soyad: user.soyad,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error('Login hatası detayları:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Sunucu hatası',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Şifre değiştirme endpoint'i
router.put('/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Mevcut şifreyi kontrol et
    if (currentPassword !== user.password) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı' });
    }

    // Yeni şifreyi güncelle
    await user.update({ password: newPassword });
    res.json({ message: 'Şifre başarıyla güncellendi' });
  } catch (error) {
    console.error('Şifre güncelleme hatası:', error);
    res.status(400).json({ error: 'Şifre güncellenemedi' });
  }
});

module.exports = router; 
