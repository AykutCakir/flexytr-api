const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // İlişkiler burada tanımlanacak
    }

    async checkPassword(password) {
      try {
        return await bcrypt.compare(password, this.password);
      } catch (error) {
        console.error('Şifre kontrolü hatası:', error);
        return false;
      }
    }
  }

  User.init({
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ad: {
      type: DataTypes.STRING,
      allowNull: false
    },
    soyad: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rol: {
      type: DataTypes.ENUM('Admin', 'Proje Yöneticisi', 'Takım Lideri', 'Ekip Lideri', 'Yazılım', 'Satış', 'Müşteri Destek', 'Kullanıcı'),
      allowNull: false
    },
    durum: {
      type: DataTypes.ENUM('aktif', 'pasif', 'askida'),
      defaultValue: 'aktif'
    },
    dogumtarihi: DataTypes.DATE,
    songiris: DataTypes.DATE,
    telefon: DataTypes.STRING,
    adres: DataTypes.TEXT,
    profilresmi: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  return User;
}; 
