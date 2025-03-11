const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Inventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Aktif', 'Pasif', 'Stokta Yok'),
    defaultValue: 'Aktif'
  },
  lastUpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Inventory',
  timestamps: true,
  underscored: false
}); 