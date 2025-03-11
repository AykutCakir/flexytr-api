const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const salesRouter = require('./routes/sales');
const companiesRouter = require('./routes/companies');
const inventoryRouter = require('./routes/inventory');
const { sequelize } = require('./models');
// ... diğer importlar

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/api/sales', salesRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/reports', require('./routes/reports'));
// ... diğer route'lar

// Veritabanını başlat
sequelize.sync().catch(console.error);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Sunucu hatası oluştu' });
});

module.exports = app; 
