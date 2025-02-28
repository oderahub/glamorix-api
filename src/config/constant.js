module.exports = {
    INTERNAL_SERVER_ERROR: 'Internal server error',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    USER_NOT_FOUND: 'User not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden access',
    INVALID_TOKEN: 'Invalid token',
    EXPIRED_TOKEN: 'Expired token',
    INVALID_OTP: 'Invalid or expired OTP',
    RESOURCE_NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    ORDER_NOT_FOUND: 'Order not found',
    PRODUCT_NOT_FOUND: 'Product not found',
    CATEGORY_NOT_FOUND: 'Category not found',
    ALREADY_REVIEWED: 'You have already reviewed this product',
    ORDER_ALREADY_SHIPPED: 'Order already shipped and cannot be canceled'
};


export const ROLES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    SELLER: 'seller'
};




export const USER_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted'
};
