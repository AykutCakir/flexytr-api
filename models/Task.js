const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('beklemede', 'devam_ediyor', 'tamamlandi', 'iptal_edildi'),
      defaultValue: 'beklemede'
    },
    priority: {
      type: DataTypes.ENUM('düşük', 'orta', 'yüksek'),
      defaultValue: 'orta'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    assignedUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    assignee: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Tasks',
    timestamps: true,
    paranoid: true
  });

  return Task;
}; 
