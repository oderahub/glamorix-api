import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// PayPal API configurations
const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  'AQhH1Ijs2T-CJw-GCY-PC4SVuD1tciUVriV32iZlf-5f8oIRV3gXLmFkIGNTLJM_s_7Cfgg8M0a_o3Ro';
const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  'EE5T3rFKAb4g0SEtaW3YPaRXj-g5B2dzWwrlqneNWTP3isDQAlnOaPd6XgChzYD8AsPvlrO2Db3JXP-E';
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

/**
 * Generate an access token for PayPal API
 * @returns {Promise<string>} The access token
 */
async function generateAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v1/oauth2/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      data: 'grant_type=client_credentials',
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Failed to generate PayPal access token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error('Failed to generate PayPal access token');
  }
}

/**
 * Create a PayPal order
 * @param {Object} orderData The order data
 * @returns {Promise<Object>} The created PayPal order
 */
/**
 * Create a PayPal order
 * @param {Object} orderData The order data
 * @returns {Promise<Object>} The created PayPal order
 */
export async function createPayPalOrder(orderData) {
  try {
    const accessToken = await generateAccessToken();

    // Ensure all financial values are properly parsed as floats and rounded to 2 decimal places
    const subtotal = parseFloat(orderData.subtotal).toFixed(2);
    const deliveryFee = parseFloat(orderData.deliveryFee || 0).toFixed(2);
    const tax = parseFloat(orderData.tax || 0).toFixed(2);
    const discount = parseFloat(orderData.discount || 0).toFixed(2);

    // Calculate total independently to double-check it matches the provided total
    const calculatedTotal = (
      parseFloat(subtotal) +
      parseFloat(deliveryFee) -
      parseFloat(discount) +
      parseFloat(tax)
    ).toFixed(2);

    // Use calculated total if it differs from provided total (fail-safe)
    const totalAmount =
      Math.abs(parseFloat(calculatedTotal) - parseFloat(orderData.totalAmount)) < 0.01
        ? parseFloat(orderData.totalAmount).toFixed(2)
        : calculatedTotal;

    console.log('PayPal Order Financial Values:', {
      providedTotal: parseFloat(orderData.totalAmount).toFixed(2),
      calculatedTotal,
      finalTotal: totalAmount,
      subtotal,
      deliveryFee,
      tax,
      discount,
    });

    // Prepare items array with consistent pricing
    const itemsArray = orderData.items.map((item) => {
      const itemUnitPrice = parseFloat(item.unitPrice).toFixed(2);

      return {
        name: item.name || `Product ID: ${item.productId}`,
        unit_amount: {
          currency_code: 'GBP',
          value: itemUnitPrice,
        },
        quantity: item.quantity.toString(),
        sku: item.productId,
      };
    });

    // Construct the payload with all values properly formatted
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderData.orderNumber,
          description: `Order #${orderData.orderNumber}`,
          custom_id: orderData.id,
          amount: {
            currency_code: 'GBP',
            value: totalAmount,
            breakdown: {
              item_total: {
                currency_code: 'GBP',
                value: subtotal,
              },
              shipping: {
                currency_code: 'GBP',
                value: deliveryFee,
              },
              tax_total: {
                currency_code: 'GBP',
                value: tax,
              },
              discount: {
                currency_code: 'GBP',
                value: discount,
              },
            },
          },
          items: itemsArray,
          shipping: {
            name: {
              full_name: `${orderData.firstName} ${orderData.lastName}`,
            },
            address: {
              address_line_1: orderData.deliveryAddress,
              admin_area_2: orderData.city,
              postal_code: orderData.postCode,
              country_code: 'US',
            },
          },
        },
      ],
      application_context: {
        brand_name: process.env.COMPANY_NAME || 'Your E-Commerce Store',
        landing_page: 'BILLING',
        shipping_preference: 'SET_PROVIDED_ADDRESS',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-completed`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/cancel`,
      },
    };

    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v2/checkout/orders`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: payload,
    });

    return response.data;
  } catch (error) {
    console.error('Failed to create PayPal order:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error('Failed to create PayPal order');
  }
}

/**
 * Capture a PayPal payment
 * @param {string} orderId The PayPal order ID
 * @returns {Promise<Object>} The captured payment details
 */

/**
 * Capture a PayPal payment
 * @param {string} orderId The PayPal order ID
 * @returns {Promise<Object>} The captured payment details
 */
export async function capturePayPalPayment(orderId) {
  try {
    const accessToken = await generateAccessToken();

    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to capture PayPal payment:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data));
      console.error('Response status:', error.response.status);

      // Check for MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED error
      if (
        error.response.status === 422 &&
        error.response.data.details &&
        error.response.data.details.some(
          (detail) => detail.issue === 'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED',
        )
      ) {
        throw new Error('MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED');
      }

      throw new Error(
        `PayPal error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
      );
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('No response received from PayPal');
    } else {
      console.error('Error setting up request:', error.message);
      throw new Error(`Failed to connect to PayPal: ${error.message}`);
    }
  }
}

/**
 * Get PayPal order details
 * @param {string} orderId The PayPal order ID
 * @returns {Promise<Object>} The order details
 */
export async function getPayPalOrderDetails(orderId) {
  try {
    const accessToken = await generateAccessToken();

    const response = await axios({
      method: 'get',
      url: `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get PayPal order details:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error('Failed to get PayPal order details');
  }
}

/**
 * Refund a PayPal payment
 * @param {string} captureId The PayPal capture ID
 * @param {number} amount The amount to refund
 * @returns {Promise<Object>} The refund details
 */
export async function refundPayPalPayment(captureId, amount) {
  try {
    const accessToken = await generateAccessToken();

    const payload = {
      amount: {
        currency_code: 'GBP',
        value: amount.toFixed(2),
      },
    };

    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: payload,
    });

    return response.data;
  } catch (error) {
    console.error('Failed to refund PayPal payment:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error('Failed to refund PayPal payment');
  }
}

export default {
  createPayPalOrder,
  capturePayPalPayment,
  getPayPalOrderDetails,
  refundPayPalPayment,
};
