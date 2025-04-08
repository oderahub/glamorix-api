import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Customer = sequelize.define(
  'Customer',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        // This regex allows for:
        // - Numbers starting with 0 (like 080...)
        // - Numbers starting with country code (like +44...)
        // - Can contain spaces, hyphens or parentheses for formatting
        is: /^(\+\d{1,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,5}[\s.-]?\d{1,9}$/,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    indexes: [
      { name: 'user_index', fields: ['userId'], unique: true },
      { name: 'name_index', fields: ['firstName', 'lastName'] },
    ],
  },
);

export default Customer;
