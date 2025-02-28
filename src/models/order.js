import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/order.js';

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
        type: DataTypes.ENUM(...Object.values(ORDER_STATUS)),
        defaultValue: ORDER_STATUS.PENDING
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    tax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    shippingCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    shippingAddress: {
        type: DataTypes.JSON,
        allowNull: true
    },
    billingEmail: {
        type: DataTypes.JSON,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'email'
        }
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
        defaultValue: PAYMENT_STATUS.PENDING
    },
    // notes: {
    //     type: DataTypes.TEXT,
    //     allowNull: true
    // },
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