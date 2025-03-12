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
let retryCount = 0;
const maxRetries = 5;

async function initializeDatabase() {
  try {
    console.log('Veritabanı bağlantısı başlatılıyor...', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      env: env
    });
    
    sequelize = new Sequelize(config.database, config.username, config.password, {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      dialectOptions: config.dialectOptions,
      pool: config.pool,
      logging: (msg) => console.log('Sequelize Log:', msg)
    });

    // Bağlantıyı test et
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı başarılı.');

    // Model dosyalarını yükle
    const Report = require('./Report')(sequelize);
    const User = require('./User')(sequelize);
    const Inventory = require('./Inventory')(sequelize);
    const Task = require('./Task')(sequelize);
    const TaskHistory = require('./TaskHistory')(sequelize);
    const Call = require('./Call')(sequelize);

    // İlişkileri tanımla
    Report.belongsTo(User, { foreignKey: 'userId' });
    User.hasMany(Report, { foreignKey: 'userId' });

    Task.belongsTo(User, { as: 'assignedUser', foreignKey: 'assignedUserId' });
    Task.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
    User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assignedUserId' });
    User.hasMany(Task, { as: 'createdTasks', foreignKey: 'creatorId' });
    Task.hasMany(TaskHistory, { foreignKey: 'taskId' });
    TaskHistory.belongsTo(Task, { foreignKey: 'taskId' });

    Call.belongsTo(User, { foreignKey: 'userId' });
    User.hasMany(Call, { foreignKey: 'userId' });

    // Modelleri dışa aktar
    db.Report = Report;
    db.User = User;
    db.Inventory = Inventory;
    db.Task = Task;
    db.TaskHistory = TaskHistory;
    db.Call = Call;
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

    // Tabloları senkronize et
    console.log('Tablolar senkronize ediliyor...');
    await db.sequelize.sync();
    console.log('Veritabanı tabloları senkronize edildi.');

    return db;
  } catch (error) {
    console.error('Veritabanı başlatma hatası:', {
      error: error.message,
      stack: error.stack,
      retryCount,
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        env: env
      }
    });

    if (retryCount < maxRetries) {
      retryCount++;
      console.log(`Yeniden deneme ${retryCount}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 saniye bekle
      return initializeDatabase();
    }

    throw error;
  }
}

// Promise olarak dışa aktar
const databasePromise = initializeDatabase().catch(error => {
  console.error('Veritabanı başlatma hatası:', error);
  process.exit(1);
});

module.exports = databasePromise;
