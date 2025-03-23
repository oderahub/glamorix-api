import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Address = sequelize.define(
    'Address',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveryAddress: {
            type: DataTypes.STRING,
            allowNull: false
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false
        },
        postCode: {
            type: DataTypes.STRING,
            allowNull: false
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isDefault: { // Optional: Mark an address as default
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    },
    {
        timestamps: true,
        indexes: [
            { name: 'address_user_index', fields: ['userId'] }
        ]
    }
);

export default Address;