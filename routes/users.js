const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../models');

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login denemesi başladı:', {
      email: req.body.email,
      body: req.body
    });

    const User = db.User;
    if (!User) {
      console.error('User modeli bulunamadı');
      return res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }

    const user = await User.findOne({
      where: { email: req.body.email }
    });

    if (!user) {
      console.log('Kullanıcı bulunamadı:', req.body.email);
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    const isValidPassword = await user.checkPassword(req.body.password);
    
    if (!isValidPassword) {
      console.log('Geçersiz şifre:', req.body.email);
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    // Son giriş tarihini güncelle
    await user.update({ songiris: new Date() });

    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        rol: user.rol,
        ad: user.ad,
        soyad: user.soyad
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login başarılı:', user.email);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        ad: user.ad,
        soyad: user.soyad,
        rol: user.rol,
        durum: user.durum
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
    
    res.status(500).json({ error: 'Sunucu hatası oluştu' });
  }
});

module.exports = router; 
