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

    // Sunucuyu başlat
    const PORT = process.env.PORT || 10000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server ${PORT} portunda çalışıyor (${process.env.NODE_ENV} modu)`);
    });

    // Veritabanını başlatmayı dene
    try {
      console.log('Veritabanı başlatılıyor...');
      const db = await initializeDatabase;
      console.log('Veritabanı başlatıldı');

      // Routes
      const usersRouter = require('./routes/users');
      const reportsRouter = require('./routes/reports');
      const tasksRouter = require('./routes/tasks');
      const callsRouter = require('./routes/calls');
      const inventoryRouter = require('./routes/inventory');
      const salesRouter = require('./routes/sales');
      const companiesRouter = require('./routes/companies');

      // Route'ları tanımla
      app.use('/api/users', usersRouter);
      app.use('/api/reports', reportsRouter);
      app.use('/api/tasks', tasksRouter);
      app.use('/api/calls', callsRouter);
      app.use('/api/inventory', inventoryRouter);
      app.use('/api/sales', salesRouter);
      app.use('/api/companies', companiesRouter);
    } catch (dbError) {
      console.error('Veritabanı başlatma hatası:', {
        message: dbError.message,
        stack: dbError.stack,
        details: dbError
      });

      // Veritabanı olmadan çalışacak endpoint'ler
      app.use('/api/users', (req, res) => {
        res.status(503).json({ 
          error: 'Veritabanı bağlantısı kurulamadı',
          message: 'Sistem bakımda, lütfen daha sonra tekrar deneyin'
        });
      });
    }

    // 404 handler
    app.use((req, res, next) => {
      console.log('404 - Route bulunamadı:', {
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query
      });
      res.status(404).json({ 
        error: 'İstenen sayfa bulunamadı',
        path: req.path,
        method: req.method
      });
    });

    // Error handling
    app.use((err, req, res, next) => {
      console.error('Hata detayları:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query
      });
      res.status(err.status || 500).json({ 
        error: 'Sunucu hatası oluştu',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
      server.close(() => {
        console.log('Sunucu kapatıldı');
        process.exit(0);
      });
    });

    return server;

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
