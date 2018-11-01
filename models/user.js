module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
  userID:       {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
  name:         DataTypes.STRING,
  email:        DataTypes.STRING,
  isVerified:   {type: DataTypes.INTEGER, primaryKey: false}
});
}
