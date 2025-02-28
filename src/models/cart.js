import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'converted', 'abandoned'),
        defaultValue: 'active'
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        { name: 'cart_user_index', fields: ['userId'] },
        { name: 'cart_session_index', fields: ['sessionId'] }
    ]
});

export default Cart;