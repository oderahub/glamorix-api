import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Order = sequelize.define('Order', {
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
    orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'),
        defaultValue: 'pending'
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    shippingCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    shippingAddress: {
        type: DataTypes.JSON,
        allowNull: false
    },
    billingAddress: {
        type: DataTypes.JSON,
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estimatedDeliveryDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    paranoid: true,
    indexes: [
        { name: 'order_number_index', fields: ['orderNumber'], unique: true },
        { name: 'order_user_index', fields: ['userId'] },
        { name: 'order_status_index', fields: ['status'] },
        { name: 'order_payment_status_index', fields: ['paymentStatus'] }
    ]
});

export default Order;