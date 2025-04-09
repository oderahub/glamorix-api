import sequelize from '../config/database.js';
import {
  Cart,
  CartItem,
  Product,
  ProductVariant,
  Order,
  OrderItem as OrderOrderItem,
  User,
  OrderItem,
} from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  ORDER_STATUS,
  CART_STATUS,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
  PAYMENT_STATUS,
  SHIPPING_FEES,
} from '../constants/constant.js';
import { sendOrderConfirmationEmail } from '../services/emailService.js';

export const getCart = async (req, res, next) => {
  try {
    let cart;
    const cartIdFromParam = req.params.cartId;

    if (req.user && req.user.id) {
      console.log('GetCart - Authenticated user:', req.user.id);
      if (cartIdFromParam) {
        cart = await Cart.findOne({
          where: { id: cartIdFromParam, userId: req.user.id, status: CART_STATUS.ACTIVE },
        });
        if (!cart) {
          throw new Error('Cart not found or inactive');
        }
        console.log('GetCart - Using explicit cartId from param:', cartIdFromParam);
      } else {
        const activeCarts = await Cart.findAll({
          where: { userId: req.user.id, status: CART_STATUS.ACTIVE },
          order: [['createdAt', 'ASC']],
        });
        console.log(
          'GetCart - All active carts for user:',
          req.user.id,
          activeCarts.map((c) => c.id),
        );

        cart = activeCarts.length
          ? activeCarts[0]
          : await Cart.create({
              userId: req.user.id,
              sessionId: null,
              status: CART_STATUS.ACTIVE,
              expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });
        console.log('GetCart - Selected/Created cart for user:', req.user.id, 'CartId:', cart.id);
      }
    } else {
      console.log('GetCart - Guest user detected');
      const sessionId = req.session?.id || 'guest-session';
      console.log('GetCart - Session ID:', sessionId);
      if (cartIdFromParam) {
        cart = await Cart.findOne({
          where: { id: cartIdFromParam, sessionId, status: CART_STATUS.ACTIVE },
        });
        if (!cart) {
          throw new Error('Cart not found or inactive');
        }
        console.log('GetCart - Using explicit cartId from param:', cartIdFromParam);
      } else {
        const activeCarts = await Cart.findAll({
          where: { sessionId, status: CART_STATUS.ACTIVE },
          order: [['createdAt', 'ASC']],
        });
        console.log(
          'GetCart - All active carts for session:',
          sessionId,
          activeCarts.map((c) => c.id),
        );

        cart = activeCarts.length
          ? activeCarts[0]
          : await Cart.create({
              userId: null,
              sessionId,
              status: CART_STATUS.ACTIVE,
              expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });
        console.log('GetCart - Selected/Created cart for session:', sessionId, 'CartId:', cart.id);
      }
    }

    console.log('GetCart - Final CartId:', cart.id);

    const items = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: ProductVariant,
              as: 'variants',
              required: false,
            },
          ],
        },
      ],
    });

    if (!items.length) {
      console.warn(`No items found for cartId: ${cart.id}`);
      const dbItems = await CartItem.findAll({ where: { cartId: cart.id } });
      console.log('GetCart - Raw CartItem count from DB:', dbItems.length);
    } else {
      console.log('GetCart - Found items:', items.length);
    }

    const formattedItems = items.map((item) => {
      const product = item.product;
      const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;

      return {
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice || product.price),
        addedAt: item.addedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: parseFloat(product.price),
          discountPercentage: product.discountPercentage || 0,
          stockQuantity: product.stockQuantity,
          sku: product.sku,
          isActive: product.isActive,
          featuredImage: product.featuredImage || null,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          variants: variant
            ? [
                {
                  id: variant.id,
                  productId: variant.productId,
                  size: variant.size,
                  color: variant.color,
                  material: variant.material,
                  additionalAttributes: variant.additionalAttributes || null,
                  price: parseFloat(variant.price || product.price),
                  stockQuantity: variant.stockQuantity,
                  sku: variant.sku,
                  createdAt: variant.createdAt,
                  updatedAt: variant.updatedAt,
                },
              ]
            : [],
        },
      };
    });

    const subtotal = formattedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = 0; // No coupon system
    const shipping = 0; // No shipping method at this stage
    const tax = 0; // No tax info at this stage
    const grandTotal = subtotal - discount + shipping + tax;

    const response = {
      cart: {
        id: cart.id,
        userId: cart.userId,
        sessionId: cart.sessionId,
        status: cart.status,
        expiryDate: cart.expiryDate,
      },
      items: formattedItems,
      summary: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        itemCount: formattedItems.length,
      },
    };

    return ApiResponse.success(res, 'Cart retrieved successfully', response);
  } catch (error) {
    console.error('Error in getCart:', error.message, error.stack);
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  const { productId, variantId, quantity } = req.body;
  let t;
  try {
    t = await sequelize.transaction();

    if (!variantId) {
      throw new Error('variantId is required');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Log complete authentication info for debugging
    console.log('AddToCart - Auth info:', {
      hasUser: !!req.user,
      userId: req.user?.id,
      sessionId: req.session?.id,
    });

    let cart;
    // For authenticated users with a valid user ID
    if (req.user && req.user.id) {
      console.log('AddToCart - Authenticated user:', req.user.id);

      // First try to find an existing cart
      cart = await Cart.findOne({
        where: {
          userId: req.user.id,
          status: CART_STATUS.ACTIVE,
        },
        order: [['createdAt', 'ASC']],
        transaction: t,
      });

      // If no cart exists, create a new one
      if (!cart) {
        console.log('AddToCart - Creating new cart for user:', req.user.id);
        try {
          cart = await Cart.create(
            {
              userId: req.user.id,
              sessionId: null,
              status: CART_STATUS.ACTIVE,
              expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: t },
          );
          console.log('AddToCart - New cart created:', cart.id);
        } catch (cartError) {
          console.error('Error creating cart for authenticated user:', cartError);
          throw cartError;
        }
      }
    }
    // For guest users
    else {
      console.log('AddToCart - Guest user detected');

      // Create a reliable session ID even if req.session is not set
      const sessionId =
        req.session?.id || `guest-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      console.log('AddToCart - Using Session ID:', sessionId);

      // First try to find an existing guest cart
      cart = await Cart.findOne({
        where: {
          sessionId,
          userId: null, // Explicitly look for null userId
          status: CART_STATUS.ACTIVE,
        },
        order: [['createdAt', 'ASC']],
        transaction: t,
      });

      // If no cart exists, create a new one
      if (!cart) {
        console.log('AddToCart - Creating new cart for guest session:', sessionId);
        try {
          cart = await Cart.create(
            {
              userId: null, // Explicitly set to null
              sessionId,
              status: CART_STATUS.ACTIVE,
              expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: t },
          );
          console.log('AddToCart - New guest cart created:', cart.id);
        } catch (cartError) {
          console.error('Error creating cart for guest:', cartError);
          throw cartError;
        }
      }
    }

    if (!cart) {
      throw new Error('Failed to create or retrieve cart');
    }

    console.log('AddToCart - Cart ID:', cart.id);

    const product = await Product.findByPk(productId, { transaction: t });
    if (!product) {
      throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const productVariant = await ProductVariant.findByPk(variantId, { transaction: t });
    if (!productVariant || productVariant.productId !== productId) {
      throw new Error('Invalid product variant');
    }
    if (productVariant.stockQuantity < quantity) {
      throw new Error('Insufficient stock for variant');
    }

    const unitPrice = parseFloat(productVariant.price || product.price);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new Error(`Invalid price for product: ${productVariant.price || product.price}`);
    }

    const existingItem = await CartItem.findOne({
      where: { cartId: cart.id, productId, variantId },
      transaction: t,
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.update({ quantity: existingItem.quantity, unitPrice }, { transaction: t });
    } else {
      await CartItem.create(
        {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          unitPrice,
          addedAt: new Date(),
        },
        { transaction: t },
      );
    }

    await t.commit();
    console.log('Transaction committed, cartId:', cart.id);

    const cartItems = await getCartItems(cart.id);
    if (!cartItems.length) {
      console.warn('No items found after adding to cart:', cart.id);
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
      0,
    );
    const discount = 0; // No coupon system
    const shipping = 0; // No shipping method at this stage
    const tax = 0; // No tax info at this stage
    const grandTotal = subtotal - discount + shipping + tax;

    return ApiResponse.success(res, 'Item added to cart', {
      cartItems: cartItems.map((item) => ({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        addedAt: item.addedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: item.product,
      })),
      summary: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        itemCount: cartItems.length,
      },
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
      console.error('Transaction rolled back:', error.message);
    }
    console.error('Error in addToCart:', error.message, error.stack);
    next(error);
  }
};

export const updateCart = async (req, res, next) => {
  const { items } = req.body;
  const t = await sequelize.transaction();
  try {
    const cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
    if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) throw new Error(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      if (product.stockQuantity < item.quantity)
        throw new Error(ERROR_MESSAGES.PRODUCT_INSUFFICIENT_STOCK);
      const existingItem = await CartItem.findOne({
        where: { cartId: cart.id, productId: item.productId, variantId: item.variantId },
        transaction: t,
      });
      if (existingItem) {
        await existingItem.update({ quantity: item.quantity }, { transaction: t });
      } else {
        const unitPrice = item.variantId
          ? (await ProductVariant.findByPk(item.variantId, { transaction: t }))?.price ||
            product.price
          : product.price;
        await CartItem.create({ cartId: cart.id, ...item, unitPrice }, { transaction: t });
      }
    }
    await t.commit();
    return ApiResponse.success(res, 'Cart updated', await getCartItems(cart.id));
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  const { productId, variantId } = req.body;
  try {
    const cart = await Cart.findOne({ where: { userId: req.user.id, status: CART_STATUS.ACTIVE } });
    if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

    const item = await CartItem.findOne({ where: { cartId: cart.id, productId, variantId } });
    if (!item) throw new Error(ERROR_MESSAGES.CART_ITEM_NOT_FOUND);

    await item.destroy();
    return ApiResponse.success(res, 'Item removed from cart', await getCartItems(cart.id));
  } catch (error) {
    next(error);
  }
};
// UPDATED CHECKOUT FUNCTION WITH PAYPAL PAYMENT INTEGRATION
export const checkout = async (req, res, next) => {
  const {
    firstName,
    lastName,
    phone,
    email, // For guests
    deliveryAddress,
    city,
    postCode,
    country,
    paymentMethod: rawPaymentMethod,
    shippingMethod, // Optional, defaults to STANDARD if not provided
    taxRate, // Optional, defaults to 0 if not provided
  } = req.body;

  const t = await sequelize.transaction();
  try {
    let cart;
    let userEmail;

    // Debug: Log the user and session information
    console.log('Checkout - req.user:', req.user);
    console.log('Checkout - req.session:', req.session);

    // Validate paymentMethod
    const validPaymentMethods = Object.values(PAYMENT_METHODS);
    const paymentMethod = validPaymentMethods.find(
      (method) => method.toLowerCase() === rawPaymentMethod.toLowerCase(),
    )
      ? rawPaymentMethod.toLowerCase()
      : PAYMENT_METHODS.PAYPAL || 'paypal';

    if (!validPaymentMethods.includes(rawPaymentMethod.toLowerCase())) {
      console.warn(
        `Invalid payment method "${rawPaymentMethod}" provided. Defaulting to "${PAYMENT_METHODS.PAYPAL || 'paypal'}".`,
      );
    }

    // Check if the user is authenticated or a guest
    if (req.user && req.user.id) {
      console.log('Checkout - Authenticated user detected:', req.user.id);
      cart = await Cart.findOne({
        where: { userId: req.user.id, status: CART_STATUS.ACTIVE },
        transaction: t,
      });
      if (!cart) {
        cart = await Cart.create(
          {
            userId: req.user.id,
            status: CART_STATUS.ACTIVE,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { transaction: t },
        );
      }
      const user = await User.findByPk(req.user.id, { attributes: ['email'], transaction: t });
      userEmail = user.email;
    } else {
      console.log('Checkout - Guest checkout detected');
      const sessionId = req.session?.id || 'guest-session';
      console.log('Checkout - Session ID:', sessionId);
      cart = await Cart.findOne({
        where: { sessionId, status: CART_STATUS.ACTIVE },
        transaction: t,
      });
      if (!cart) {
        cart = await Cart.create(
          {
            sessionId,
            status: CART_STATUS.ACTIVE,
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { transaction: t },
        );
      }
      if (!email) {
        throw new Error('Email is required for guest checkout');
      }
      userEmail = email;
    }

    if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

    console.log('Checkout - Cart found:', cart.id);

    // IMPORTANT FIX: Include proper associations when fetching cart items
    const items = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'featuredImage'],
        },
        {
          model: ProductVariant,
          as: 'variant',
          attributes: ['id', 'size', 'color', 'price'],
        },
      ],
      transaction: t,
    });

    if (!items.length) throw new Error(ERROR_MESSAGES.CART_EMPTY);

    console.log('Checkout - Cart items:', items.length);

    // CRITICAL FIX: Calculate subtotal properly based on cart items
    let subtotal = 0;
    const orderItemsDetails = [];

    // Process each item in the cart to determine the correct price
    for (const item of items) {
      const product = item.product;
      const variant = item.variant;

      // Determine the correct unit price (variant price or product price)
      let unitPrice;

      if (variant && variant.price !== null && variant.price !== undefined) {
        unitPrice = parseFloat(variant.price);
      } else {
        unitPrice = parseFloat(product.price);
      }

      // Log for debugging
      console.log(
        `Item ${product.name}: Product price = ${product.price}, Variant price = ${variant?.price}, Using price = ${unitPrice}`,
      );

      if (isNaN(unitPrice) || unitPrice <= 0) {
        console.error(`Invalid unitPrice for product ID ${item.productId}: ${unitPrice}`);
        throw new Error('Invalid price for product');
      }

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      console.log(
        `Item: ${product.name}, Quantity: ${item.quantity}, Unit Price: ${unitPrice}, Total: ${itemTotal}`,
      );

      orderItemsDetails.push({
        name: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        total: itemTotal.toFixed(2),
      });
    }

    // FIXED: Set delivery fee to 0 instead of using constants
    // const deliveryFee =
    //   shippingMethod && SHIPPING_FEES[shippingMethod] !== undefined
    //     ? parseFloat(SHIPPING_FEES[shippingMethod])
    //     : parseFloat(SHIPPING_FEES[SHIPPING_METHODS.STANDARD] || 0);

    // Override with 0 delivery fee
    const deliveryFee = 0.0;

    // No coupon system, so discount is always 0
    const discount = 0.0;

    // Calculate tax based on taxRate
    const tax = taxRate && taxRate > 0 ? parseFloat((subtotal * (taxRate / 100)).toFixed(2)) : 0.0;

    // Calculate total with all values as parsed floats to avoid string concatenation issues
    const totalAmount = parseFloat((subtotal - discount + deliveryFee + tax).toFixed(2));

    console.log('Order Financial Breakdown:', {
      subtotal,
      discount,
      deliveryFee,
      tax,
      totalAmount,
    });

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create the order in the database with consistent financial values
    const order = await Order.create(
      {
        userId: req.user?.id || null,
        orderNumber,
        status: ORDER_STATUS.PENDING,
        totalAmount,
        subtotal,
        tax,
        deliveryFee,
        shippingCost: deliveryFee, // Set both for backward compatibility
        discount,
        firstName,
        lastName,
        deliveryAddress,
        city,
        postCode,
        country,
        phone,
        paymentMethod,
        paymentStatus: PAYMENT_STATUS.PENDING,
        shippingMethod: shippingMethod || SHIPPING_METHODS.STANDARD,
        email: userEmail,
        processedAt: new Date(),
      },
      { transaction: t },
    );

    // Create order items with consistent pricing and detailed snapshots
    const orderItems = items.map((item) => {
      const product = item.product;
      const variant = item.variant;

      // FIXED: Properly determine the unit price
      let unitPrice;
      if (variant && variant.price !== null && variant.price !== undefined) {
        unitPrice = parseFloat(variant.price);
      } else {
        unitPrice = parseFloat(product.price);
      }

      const itemTotal = parseFloat((unitPrice * item.quantity).toFixed(2));

      return {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemTotal,
        productSnapshot: {
          id: product.id,
          name: product.name,
          price: unitPrice,
          featuredImage: product.featuredImage,
          variant: variant
            ? {
                id: variant.id,
                size: variant.size,
                color: variant.color,
                price: variant.price ? parseFloat(variant.price) : null,
              }
            : null,
        },
      };
    });

    await OrderItem.bulkCreate(orderItems, { transaction: t });

    // Update stock quantities
    await Promise.all(
      items.map(async (item) => {
        if (item.variantId) {
          await ProductVariant.update(
            { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
            { where: { id: item.variantId }, transaction: t },
          );
        } else {
          await Product.update(
            { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
            { where: { id: item.productId }, transaction: t },
          );
        }
      }),
    );

    // Mark cart as converted after checkout
    await Cart.update(
      { status: CART_STATUS.CONVERTED },
      { where: { id: cart.id }, transaction: t },
    );
    await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

    await t.commit();

    // Handle PayPal payment if selected
    let paypalOrderData = null;
    if (paymentMethod === PAYMENT_METHODS.PAYPAL) {
      try {
        const orderWithItems = await Order.findByPk(order.id, {
          include: [{ model: OrderItem, as: 'items' }],
        });

        const paypalOrderInfo = {
          id: orderWithItems.id,
          orderNumber: orderWithItems.orderNumber,
          totalAmount: parseFloat(orderWithItems.totalAmount),
          subtotal: parseFloat(orderWithItems.subtotal),
          tax: parseFloat(orderWithItems.tax || 0),
          deliveryFee: parseFloat(orderWithItems.deliveryFee || 0),
          discount: parseFloat(orderWithItems.discount || 0),
          firstName: orderWithItems.firstName,
          lastName: orderWithItems.lastName,
          deliveryAddress: orderWithItems.deliveryAddress,
          city: orderWithItems.city,
          postCode: orderWithItems.postCode,
          items: orderWithItems.items.map((item) => ({
            productId: item.productId,
            name: item.productSnapshot?.name || `Product ID: ${item.productId}`,
            unitPrice: parseFloat(item.unitPrice),
            quantity: item.quantity,
          })),
        };

        const paypalService = await import('../services/paypalService.js');
        paypalOrderData = await paypalService.createPayPalOrder(paypalOrderInfo);

        await Order.update({ paypalOrderId: paypalOrderData.id }, { where: { id: order.id } });
      } catch (paypalError) {
        console.error('PayPal order creation error:', paypalError);
      }
    } else {
      try {
        const orderWithItems = await Order.findByPk(order.id, {
          include: [{ model: OrderItem, as: 'items' }],
        });

        await sendOrderConfirmationEmail(userEmail, orderWithItems, orderWithItems.items);
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
      }
    }

    // Prepare the financial summary for the response
    const financialSummary = {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      itemCount: items.length,
    };

    // Return response based on payment method
    if (paymentMethod === PAYMENT_METHODS.PAYPAL && paypalOrderData) {
      return ApiResponse.success(
        res,
        'Checkout successful - Redirecting to PayPal',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          summary: financialSummary,
          paypal: {
            orderId: paypalOrderData.id,
            approvalUrl: paypalOrderData.links.find((link) => link.rel === 'approve').href,
          },
        },
        HTTP_STATUS_CODES.CREATED,
      );
    } else {
      return ApiResponse.success(
        res,
        'Checkout successful',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          summary: financialSummary,
        },
        HTTP_STATUS_CODES.CREATED,
      );
    }
  } catch (error) {
    await t.rollback();
    console.error('Checkout error:', error);
    next(error);
  }
};

// export const checkout = async (req, res, next) => {
//   const {
//     firstName,
//     lastName,
//     phone,
//     email, // For guests
//     deliveryAddress,
//     city,
//     postCode,
//     country,
//     paymentMethod: rawPaymentMethod,
//     shippingMethod, // Optional, defaults to STANDARD if not provided
//     taxRate, // Optional, defaults to 0 if not provided
//   } = req.body;

//   const t = await sequelize.transaction();
//   try {
//     let cart;
//     let userEmail;

//     // Debug: Log the user and session information
//     console.log('Checkout - req.user:', req.user);
//     console.log('Checkout - req.session:', req.session);

//     // Validate paymentMethod
//     const validPaymentMethods = Object.values(PAYMENT_METHODS);
//     const paymentMethod = validPaymentMethods.find(
//       (method) => method.toLowerCase() === rawPaymentMethod.toLowerCase(),
//     )
//       ? rawPaymentMethod.toLowerCase()
//       : PAYMENT_METHODS.PAYPAL || 'paypal';

//     if (!validPaymentMethods.includes(rawPaymentMethod.toLowerCase())) {
//       console.warn(
//         `Invalid payment method "${rawPaymentMethod}" provided. Defaulting to "${PAYMENT_METHODS.PAYPAL || 'paypal'}".`,
//       );
//     }

//     // Check if the user is authenticated or a guest
//     if (req.user && req.user.id) {
//       console.log('Checkout - Authenticated user detected:', req.user.id);
//       cart = await Cart.findOne({
//         where: { userId: req.user.id, status: CART_STATUS.ACTIVE },
//         transaction: t,
//       });
//       if (!cart) {
//         cart = await Cart.create(
//           {
//             userId: req.user.id,
//             status: CART_STATUS.ACTIVE,
//             expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//           },
//           { transaction: t },
//         );
//       }
//       const user = await User.findByPk(req.user.id, { attributes: ['email'], transaction: t });
//       userEmail = user.email;
//     } else {
//       console.log('Checkout - Guest checkout detected');
//       const sessionId = req.session?.id || 'guest-session';
//       console.log('Checkout - Session ID:', sessionId);
//       cart = await Cart.findOne({
//         where: { sessionId, status: CART_STATUS.ACTIVE },
//         transaction: t,
//       });
//       if (!cart) {
//         cart = await Cart.create(
//           {
//             sessionId,
//             status: CART_STATUS.ACTIVE,
//             expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//           },
//           { transaction: t },
//         );
//       }
//       if (!email) {
//         throw new Error('Email is required for guest checkout');
//       }
//       userEmail = email;
//     }

//     if (!cart) throw new Error(ERROR_MESSAGES.CART_NOT_FOUND);

//     console.log('Checkout - Cart found:', cart.id);

//     const items = await CartItem.findAll({
//       where: { cartId: cart.id },
//       include: [
//         {
//           model: Product,
//           as: 'product',
//           attributes: ['id', 'name', 'price', 'featuredImage'],
//         },
//         {
//           model: ProductVariant,
//           as: 'variant',
//           attributes: ['id', 'size', 'color', 'price'],
//         },
//       ],
//       transaction: t,
//     });

//     if (!items.length) throw new Error(ERROR_MESSAGES.CART_EMPTY);

//     console.log('Checkout - Cart items:', items.length);

//     // Calculate all financial aspects of the order
//     let subtotal = 0;
//     const orderItemsDetails = [];

//     for (const item of items) {
//       const product = item.product;
//       const variant = item.variant;

//       // Determine the correct unit price (variant price or product price)
//       const unitPrice =
//         variant && variant.price ? parseFloat(variant.price) : parseFloat(product.price);

//       if (isNaN(unitPrice)) {
//         console.error(`Invalid unitPrice for product ID ${item.productId}: ${unitPrice}`);
//         throw new Error('Invalid price for product');
//       }

//       const itemTotal = unitPrice * item.quantity;
//       subtotal += itemTotal;

//       orderItemsDetails.push({
//         name: product.name,
//         quantity: item.quantity,
//         unitPrice: unitPrice.toFixed(2),
//         total: itemTotal.toFixed(2),
//       });
//     }

//     // Use consistent naming for shipping fees (deliveryFee)
//     const deliveryFee =
//       shippingMethod && SHIPPING_FEES[shippingMethod] !== undefined
//         ? parseFloat(SHIPPING_FEES[shippingMethod])
//         : parseFloat(SHIPPING_FEES[SHIPPING_METHODS.STANDARD] || 0);

//     // No coupon system, so discount is always 0
//     const discount = 0.0;

//     // Calculate tax based on taxRate
//     const tax = taxRate && taxRate > 0 ? parseFloat((subtotal * (taxRate / 100)).toFixed(2)) : 0.0;

//     // Calculate total with all values as parsed floats to avoid string concatenation issues
//     const totalAmount = parseFloat((subtotal - discount + deliveryFee + tax).toFixed(2));

//     console.log('Order Financial Breakdown:', {
//       subtotal,
//       discount,
//       deliveryFee,
//       tax,
//       totalAmount,
//     });

//     const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

//     // Create the order in the database with consistent financial values
//     const order = await Order.create(
//       {
//         userId: req.user?.id || null,
//         orderNumber,
//         status: ORDER_STATUS.PENDING,
//         totalAmount,
//         subtotal,
//         tax,
//         deliveryFee,
//         shippingCost: deliveryFee, // Set both for backward compatibility
//         discount,
//         firstName,
//         lastName,
//         deliveryAddress,
//         city,
//         postCode,
//         country,
//         phone,
//         paymentMethod,
//         paymentStatus: PAYMENT_STATUS.PENDING,
//         shippingMethod: shippingMethod || SHIPPING_METHODS.STANDARD,
//         email: userEmail,
//         processedAt: new Date(),
//       },
//       { transaction: t },
//     );

//     // Create order items with consistent pricing and detailed snapshots
//     const orderItems = items.map((item) => {
//       const product = item.product;
//       const variant = item.variant;
//       const unitPrice =
//         variant && variant.price ? parseFloat(variant.price) : parseFloat(product.price);
//       const itemTotal = parseFloat((unitPrice * item.quantity).toFixed(2));

//       return {
//         orderId: order.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         quantity: item.quantity,
//         unitPrice,
//         subtotal: itemTotal,
//         productSnapshot: {
//           id: product.id,
//           name: product.name,
//           price: unitPrice,
//           featuredImage: product.featuredImage,
//           variant: variant
//             ? {
//                 id: variant.id,
//                 size: variant.size,
//                 color: variant.color,
//                 price: parseFloat(variant.price),
//               }
//             : null,
//         },
//       };
//     });

//     await OrderItem.bulkCreate(orderItems, { transaction: t });

//     // Update stock quantities
//     await Promise.all(
//       items.map(async (item) => {
//         if (item.variantId) {
//           await ProductVariant.update(
//             { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
//             { where: { id: item.variantId }, transaction: t },
//           );
//         } else {
//           await Product.update(
//             { stockQuantity: sequelize.literal(`"stockQuantity" - ${item.quantity}`) },
//             { where: { id: item.productId }, transaction: t },
//           );
//         }
//       }),
//     );

//     // Mark cart as converted after checkout
//     await Cart.update(
//       { status: CART_STATUS.CONVERTED },
//       { where: { id: cart.id }, transaction: t },
//     );
//     await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

//     await t.commit();

//     // Handle PayPal payment if selected
//     let paypalOrderData = null;
//     if (paymentMethod === PAYMENT_METHODS.PAYPAL) {
//       try {
//         const orderWithItems = await Order.findByPk(order.id, {
//           include: [{ model: OrderItem, as: 'items' }],
//         });

//         const paypalOrderInfo = {
//           id: orderWithItems.id,
//           orderNumber: orderWithItems.orderNumber,
//           totalAmount: parseFloat(orderWithItems.totalAmount),
//           subtotal: parseFloat(orderWithItems.subtotal),
//           tax: parseFloat(orderWithItems.tax || 0),
//           deliveryFee: parseFloat(orderWithItems.deliveryFee || 0),
//           discount: parseFloat(orderWithItems.discount || 0),
//           firstName: orderWithItems.firstName,
//           lastName: orderWithItems.lastName,
//           deliveryAddress: orderWithItems.deliveryAddress,
//           city: orderWithItems.city,
//           postCode: orderWithItems.postCode,
//           items: orderWithItems.items.map((item) => ({
//             productId: item.productId,
//             name: item.productSnapshot?.name || `Product ID: ${item.productId}`,
//             unitPrice: parseFloat(item.unitPrice),
//             quantity: item.quantity,
//           })),
//         };

//         const paypalService = await import('../services/paypalService.js');
//         paypalOrderData = await paypalService.createPayPalOrder(paypalOrderInfo);

//         await Order.update({ paypalOrderId: paypalOrderData.id }, { where: { id: order.id } });
//       } catch (paypalError) {
//         console.error('PayPal order creation error:', paypalError);
//       }
//     } else {
//       try {
//         const orderWithItems = await Order.findByPk(order.id, {
//           include: [{ model: OrderItem, as: 'items' }],
//         });

//         await sendOrderConfirmationEmail(userEmail, orderWithItems, orderWithItems.items);
//       } catch (emailError) {
//         console.error('Error sending order confirmation email:', emailError);
//       }
//     }

//     // Prepare the financial summary for the response
//     const financialSummary = {
//       subtotal: parseFloat(subtotal.toFixed(2)),
//       discount: parseFloat(discount.toFixed(2)),
//       deliveryFee: parseFloat(deliveryFee.toFixed(2)),
//       tax: parseFloat(tax.toFixed(2)),
//       totalAmount: parseFloat(totalAmount.toFixed(2)),
//       itemCount: items.length,
//     };

//     // Return response based on payment method
//     if (paymentMethod === PAYMENT_METHODS.PAYPAL && paypalOrderData) {
//       return ApiResponse.success(
//         res,
//         'Checkout successful - Redirecting to PayPal',
//         {
//           orderId: order.id,
//           orderNumber: order.orderNumber,
//           summary: financialSummary,
//           paypal: {
//             orderId: paypalOrderData.id,
//             approvalUrl: paypalOrderData.links.find((link) => link.rel === 'approve').href,
//           },
//         },
//         HTTP_STATUS_CODES.CREATED,
//       );
//     } else {
//       return ApiResponse.success(
//         res,
//         'Checkout successful',
//         {
//           orderId: order.id,
//           orderNumber: order.orderNumber,
//           summary: financialSummary,
//         },
//         HTTP_STATUS_CODES.CREATED,
//       );
//     }
//   } catch (error) {
//     await t.rollback();
//     console.error('Checkout error:', error);
//     next(error);
//   }
// };

async function getCartItems(cartId) {
  try {
    const items = await CartItem.findAll({
      where: { cartId },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            {
              model: ProductVariant,
              as: 'variants',
              required: false,
            },
          ],
        },
      ],
    });
    if (!items.length) {
      console.warn(`No items found for cartId: ${cartId}`);
    }
    return items;
  } catch (error) {
    console.error('Error in getCartItems:', error.message, error.stack);
    return [];
  }
}
