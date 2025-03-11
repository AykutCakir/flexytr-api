const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Call = sequelize.define('Call', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    callType: {
      type: DataTypes.ENUM('gelen', 'giden'),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('beklemede', 'tamamlandi', 'iptal_edildi'),
      defaultValue: 'beklemede'
    },
    callDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Calls',
    timestamps: true
  });

  return Call;
}; 
