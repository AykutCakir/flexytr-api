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
    const dbUrl = process.env[config.use_env_variable];
    console.log('Veritabanı URL:', dbUrl);
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sequelize = new Sequelize(dbUrl, {
      ...config,
      logging: console.log,
      retry: {
        max: 3,
        match: [/Deadlock/i, /Connection lost/i, /ECONNREFUSED/],
      }
    });
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

} catch (error) {
  console.error('Sequelize başlatma hatası:', error);
}

module.exports = db;
