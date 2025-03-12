const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

console.log('Veritabanı bağlantısı başlatılıyor...', {
  env,
  username: config.username,
  database: config.database,
  port: config.port,
  host: config.host,
});

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      ...config,
      define: {
        schema: 'dbo',
        freezeTableName: true
      },
      dialectOptions: {
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          requestTimeout: 300000,
          connectTimeout: 300000
        }
      }
    }
  );
}

// Model tanımlamalarını yükle
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Modeller arası ilişkileri kur
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

const initializeDatabase = async () => {
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount < maxRetries) {
    try {
      console.log('Veritabanı başlatılıyor...');
      await sequelize.authenticate();
      console.log('Veritabanı bağlantısı başarılı.');
      
      console.log('Tablolar senkronize ediliyor...');
      await sequelize.sync({ force: false });
      console.log('Veritabanı tabloları senkronize edildi.');
      
      return db;
    } catch (error) {
      retryCount++;
      console.error('Veritabanı başlatma hatası:', {
        error: error.message,
        stack: error.stack,
        retryCount,
        config: {
          env,
          username: config.username,
          database: config.database,
          port: config.port,
          host: config.host,
        }
      });

      if (retryCount < maxRetries) {
        console.log(`Yeniden deneme ${retryCount}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw error;
      }
    }
  }
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = { db, initializeDatabase, DataTypes }; 
