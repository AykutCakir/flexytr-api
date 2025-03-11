const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TaskHistory = sequelize.define('TaskHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tasks',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user: {
      type: DataTypes.STRING,
      allowNull: false
    },
    creatorName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    previousValue: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'TaskHistories',
    timestamps: true
  });

  return TaskHistory;
}; 
