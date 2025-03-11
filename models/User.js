const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
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
      type: DataTypes.ENUM(
        'Admin',
        'Proje Yöneticisi',
        'Takım Lideri',
        'Ekip Lideri',
        'Yazılım',
        'Satış',
        'Müşteri Destek',
        'Kullanıcı'
      ),
      defaultValue: 'Kullanıcı'
    },
    durum: {
      type: DataTypes.ENUM('aktif', 'pasif', 'askida'),
      defaultValue: 'aktif'
    },
    dogumtarihi: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    songiris: {
      type: DataTypes.DATE,
      allowNull: true
    },
    telefon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    adres: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    profilresmi: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'User',
    timestamps: true,
    underscored: false,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
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

  // Instance method to check password
  User.prototype.checkPassword = async function(password) {
    try {
      console.log('Şifre karşılaştırması başlıyor...');
      
      if (!this.password) {
        console.error('Kullanıcının şifresi yok!', {
          userId: this.id,
          email: this.email
        });
        return false;
      }

      if (!password) {
        console.error('Gönderilen şifre boş!');
        return false;
      }

      console.log('bcrypt.compare çağrılıyor...');
      const result = await bcrypt.compare(password, this.password);
      console.log('bcrypt.compare sonucu:', result);
      return result;
    } catch (error) {
      console.error('Şifre karşılaştırma hatası:', {
        error: error.message,
        stack: error.stack,
        userId: this.id,
        email: this.email
      });
      throw new Error('Şifre karşılaştırma işlemi başarısız: ' + error.message);
    }
  };

  return User;
}; 
