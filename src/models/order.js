
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { ORDER_STATUS, PAYMENT_STATUS, SHIPPING_METHODS, PAYMENT_METHODS } from '../constants/constant.js';

const Order = sequelize.define(
    'Order',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true, // Allow null for guest orders
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
            allowNull: false
        },
        tax: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.0
        },
        deliveryFee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.0
        },
        discount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.0
        },
        // Shipping information
        firstName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        deliveryAddress: {
            type: DataTypes.STRING,
            allowNull: true
        },
        city: {
            type: DataTypes.STRING,
            allowNull: true
        },
        postCode: {
            type: DataTypes.STRING,
            allowNull: true
        },
        country: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Email for order confirmations
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: true
            }
        },
        // Added shipping method enum
        shippingMethod: {
            type: DataTypes.ENUM(...Object.values(SHIPPING_METHODS)),
            allowNull: true,
            defaultValue: SHIPPING_METHODS.STANDARD
        },
        // PayPal related fields
        paymentMethod: {
            type: DataTypes.ENUM(...Object.values(PAYMENT_METHODS)),
            allowNull: false,
            defaultValue: PAYMENT_METHODS.PAYPAL
        },
        paymentStatus: {
            type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
            defaultValue: PAYMENT_STATUS.PENDING
        },
        paypalOrderId: { // PayPal Order ID
            type: DataTypes.STRING,
            allowNull: true
        },
        paypalPaymentId: { // PayPal Payment ID (after capturing the order)
            type: DataTypes.STRING,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        estimatedDeliveryDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        // Added tracking information
        trackingNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        trackingUrl: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Status timestamps
        processedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        shippedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancelReason: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        timestamps: true,
        paranoid: true,
        indexes: [
            { name: 'order_number_index', fields: ['orderNumber'], unique: true },
            { name: 'order_user_index', fields: ['userId'] },
            { name: 'order_status_index', fields: ['status'] },
            { name: 'order_payment_status_index', fields: ['paymentStatus'] },
            { name: 'order_tracking_index', fields: ['trackingNumber'] },
            { name: 'order_paypal_order_id', fields: ['paypalOrderId'] } // Updated index
        ]
    }
);

export default Order;