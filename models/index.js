'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
try {
  if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  } else {
    sequelize = new Sequelize(config.database, config.username, config.password, {
      ...config,
      logging: console.log,
      retry: {
        max: 3,
        match: [/Deadlock/i, /Connection lost/i, /ECONNREFUSED/],
      }
    });
  }

  // Bağlantıyı test et
  sequelize.authenticate()
    .then(() => {
      console.log('Veritabanı bağlantısı başarılı.');
    })
    .catch(err => {
      console.error('Veritabanı bağlantı hatası:', err);
    });

  // Model dosyalarını yükle
  const Report = require('./Report')(sequelize);
  const User = require('./User')(sequelize);
  const Inventory = require('./Inventory')(sequelize);

  // İlişkileri tanımla
  Report.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Report, { foreignKey: 'userId' });

  // Modelleri dışa aktar
  db.Report = Report;
  db.User = User;
  db.Inventory = Inventory;
  db.sequelize = sequelize;
  db.Sequelize = Sequelize;

} catch (error) {
  console.error('Sequelize başlatma hatası:', error);
}

module.exports = db;
