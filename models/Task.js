const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Task', {
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
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('Yüksek', 'Orta', 'Düşük'),
    defaultValue: 'Orta'
  },
  assignee: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('backlog', 'inProgress', 'review', 'done'),
    defaultValue: 'backlog'
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'Task',
  timestamps: true,
  underscored: false,
  defaultScope: {
    where: {
      isDeleted: false
    }
  }
}); 