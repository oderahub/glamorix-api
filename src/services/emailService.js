
import nodemailer from 'nodemailer';
import { EMAIL_CONFIG, VALIDATION, ERROR_MESSAGES } from '../constants/constant.js';

const transporter = nodemailer.createTransport({
  host: EMAIL_CONFIG.SMTP_HOST,
  port: EMAIL_CONFIG.SMTP_PORT,
  secure: EMAIL_CONFIG.SMTP_SECURE,
  auth: {
    user: EMAIL_CONFIG.SMTP_USER,
    pass: EMAIL_CONFIG.SMTP_PASSWORD
  }
});

export const sendOtpEmail = async (email, otp, firstName) => {
  const mailOptions = {
    from: `"${EMAIL_CONFIG.SENDER_NAME}" <${EMAIL_CONFIG.SENDER_EMAIL}>`,
    to: email,
    subject: 'Your Verification Code',
    html: generateOtpEmailTemplate(firstName, otp)
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(ERROR_MESSAGES.EMAIL_SENDING_FAILED);
  }
};

const generateOtpEmailTemplate = (userName, otp) => {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Account</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .container { background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); padding: 30px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header img { max-width: 150px; height: auto; }
                h1 { color: #2c3e50; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
                .otp-container { background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 25px 0; border-left: 4px solid #3498db; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3498db; margin: 10px 0; }
                .expiry { font-size: 14px; color: #e74c3c; margin-top: 10px; }
                .support { background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin-top: 30px; }
                .support h2 { font-size: 18px; margin-top: 0; }
                .footer { margin-top: 30px; font-size: 12px; color: #7f8c8d; text-align: center; border-top: 1px solid #ecf0f1; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="${EMAIL_CONFIG.LOGO_URL}" alt="Omorix Logo">
                </div>
                <h1>Verify Your Account</h1>
                <p>Dear ${userName || 'Valued Customer'},</p>
                <p>Thank you for joining Omorix! Please verify your email by entering the code below:</p>
                <div class="otp-container">
                    <div class="otp-code">${otp}</div>
                    <div class="expiry">Expires in ${VALIDATION.OTP_EXPIRY_MINUTES} minutes</div>
                </div>
                <p>If you didn’t request this, please ignore this email or contact support.</p>
                <div class="support">
                    <h2>Need Help?</h2>
                    <p>Contact us at <a href="mailto:${EMAIL_CONFIG.SUPPORT_EMAIL}">${EMAIL_CONFIG.SUPPORT_EMAIL}</a>.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} ${EMAIL_CONFIG.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

export const sendOrderConfirmationEmail = async (toEmail, order, orderItems) => {
  const mailOptions = {
    from: `"${EMAIL_CONFIG.SENDER_NAME}" <${EMAIL_CONFIG.SENDER_EMAIL}>`,
    to: toEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: generateOrderConfirmationEmailTemplate(toEmail, order, orderItems)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${toEmail}`);
    return { success: true, message: 'Order confirmation email sent successfully' };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw new Error(ERROR_MESSAGES.EMAIL_SENDING_FAILED);
  }
};

const generateOrderConfirmationEmailTemplate = (toEmail, order, orderItems) => {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .container { background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); padding: 30px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header img { max-width: 150px; height: auto; }
                h1 { color: #2c3e50; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
                h2 { color: #2c3e50; font-size: 20px; font-weight: 600; margin-top: 20px; }
                .order-details { background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 25px 0; border-left: 4px solid #3498db; }
                .order-details p { margin: 5px 0; }
                .order-items { margin: 25px 0; }
                .order-items ul { list-style-type: none; padding: 0; }
                .order-items li { background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
                .shipping-details { background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 25px 0; border-left: 4px solid #3498db; }
                .support { background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin-top: 30px; }
                .support h2 { font-size: 18px; margin-top: 0; }
                .footer { margin-top: 30px; font-size: 12px; color: #7f8c8d; text-align: center; border-top: 1px solid #ecf0f1; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="${EMAIL_CONFIG.LOGO_URL}" alt="Omorix Logo">
                </div>
                <h1>Order Confirmation</h1>
                <p>Dear ${order.firstName || 'Valued Customer'},</p>
                <p>Thank you for your order! We're excited to let you know that your order has been successfully placed. Below are the details of your purchase:</p>
                
                <div class="order-details">
                    <h2>Order Details</h2>
                    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                    <p><strong>Total Amount:</strong> £${order.totalAmount.toFixed(2)}</p>
                    <p><strong>Subtotal:</strong> £${order.subtotal.toFixed(2)}</p>
                    <p><strong>Delivery Fee:</strong> £${order.deliveryFee.toFixed(2)}</p>
                    <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>

                <div class="order-items">
                    <h2>Order Items</h2>
                    <ul>
                        ${orderItems.map(item => `
                            <li>
                                <p><strong>Product ID:</strong> ${item.productId}</p>
                                <p><strong>Variant ID:</strong> ${item.variantId || 'N/A'}</p>
                                <p><strong>Quantity:</strong> ${item.quantity}</p>
                                <p><strong>Unit Price:</strong> £${item.unitPrice.toFixed(2)}</p>
                                <p><strong>Subtotal:</strong> £${item.subtotal.toFixed(2)}</p>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="shipping-details">
                    <h2>Shipping Details</h2>
                    <p><strong>Name:</strong> ${order.firstName} ${order.lastName}</p>
                    <p><strong>Address:</strong> ${order.deliveryAddress}, ${order.city}, ${order.postCode}, ${order.country}</p>
                    <p><strong>Phone:</strong> ${order.phone}</p>
                    <p><strong>Email:</strong> ${order.email}</p>
                </div>

                <p>We will notify you once your order is shipped. If you have any questions, feel free to reach out to us.</p>

                <div class="support">
                    <h2>Need Help?</h2>
                    <p>Contact us at <a href="mailto:${EMAIL_CONFIG.SUPPORT_EMAIL}">${EMAIL_CONFIG.SUPPORT_EMAIL}</a>.</p>
                </div>

                <div class="footer">
                    <p>© ${new Date().getFullYear()} ${EMAIL_CONFIG.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};