const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Call', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userFullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  caller: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('Yüksek', 'Normal', 'Düşük'),
    defaultValue: 'Normal'
  },
  status: {
    type: DataTypes.ENUM('Beklemede', 'İşlemde', 'Tamamlandı'),
    defaultValue: 'Beklemede'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Call',
  timestamps: true,
  underscored: false
}); 