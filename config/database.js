const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('\nVeritabanı Bağlantı Bilgileri:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mssql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        },
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    }
  }
);

// Bağlantıyı test et
sequelize.authenticate()
  .then(() => {
    console.log('MSSQL bağlantısı başarılı.');
  })
  .catch(err => {
    console.error('MSSQL bağlantı hatası:', err);
  });

module.exports = sequelize; 