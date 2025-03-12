const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const initializeDatabase = require('./models');

async function startServer() {
  try {
    // Express uygulamasını oluştur
    const app = express();

    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    app.use(express.json());

    // Test endpoint'i
    app.get('/api/test', (req, res) => {
      res.json({ message: 'API bağlantısı başarılı' });
    });

    // Veritabanını başlat
    console.log('Veritabanı başlatılıyor...');
    const db = await initializeDatabase;
    console.log('Veritabanı başlatıldı');

    // Routes
    app.use('/api/users', require('./routes/users'));
    app.use('/api/reports', require('./routes/reports'));
    app.use('/api/tasks', require('./routes/tasks'));
    app.use('/api/calls', require('./routes/calls'));
    app.use('/api/inventory', require('./routes/inventory'));
    app.use('/api/sales', require('./routes/sales'));
    app.use('/api/companies', require('./routes/companies'));

    // Error handling
    app.use((err, req, res, next) => {
      console.error('Hata detayları:', {
        message: err.message,
        stack: err.stack,
        details: err
      });
      res.status(500).json({ 
        error: 'Sunucu hatası oluştu',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    // Sunucuyu başlat
    const PORT = process.env.PORT || 10000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server ${PORT} portunda çalışıyor (${process.env.NODE_ENV} modu)`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
      server.close(() => {
        console.log('Sunucu kapatıldı');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Sunucu başlatma hatası:', {
      message: error.message,
      stack: error.stack,
      details: error
    });
    process.exit(1);
  }
}

// Sunucuyu başlat
startServer().catch(error => {
  console.error('Kritik hata:', error);
  process.exit(1);
}); 
