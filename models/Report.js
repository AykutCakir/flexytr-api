const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('taslak', 'gönderildi', 'incelendi', 'onaylandı', 'reddedildi'),
      defaultValue: 'taslak'
    },
    reportDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    userRole: {
      type: DataTypes.STRING
    },
    userFullName: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'Reports',
    timestamps: true
  });

  return Report;
}; 