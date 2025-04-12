import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { PRODUCT_STATUS } from '../constants/constant.js';

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountPercentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,

      field: 'stockQuantity',
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    isActive: {
      type: DataTypes.ENUM(...Object.values(PRODUCT_STATUS)),
      defaultValue: PRODUCT_STATUS.ACTIVE,
    },
    featuredImage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    indexes: [
      { name: 'product_slug_index', fields: ['slug'], unique: true },
      { name: 'product_sku_index', fields: ['sku'], unique: true },
    ],
  },
);

// Review-related methods added to the Product model prototype
// Product.prototype.getAverageRating = async function () {
//   const avgRating = await this.sequelize.models.Review.findOne({
//     where: {
//       productId: this.id,
//       // No isApproved filter since all reviews are now visible
//     },
//     attributes: [[this.sequelize.fn('AVG', this.sequelize.col('rating')), 'avgRating']],
//     raw: true,
//   });

//   return avgRating ? parseFloat(avgRating.avgRating).toFixed(1) : '0.0';
// };

// // Get total number of reviews
// Product.prototype.getReviewCount = async function () {
//   return await this.sequelize.models.Review.count({
//     where: {
//       productId: this.id,
//       // No isApproved filter
//     },
//   });
// };

// // Get rating distribution
// Product.prototype.getRatingDistribution = async function () {
//   const distribution = await this.sequelize.models.Review.findAll({
//     where: {
//       productId: this.id,
//       // No isApproved filter
//     },
//     attributes: ['rating', [this.sequelize.fn('COUNT', this.sequelize.col('rating')), 'count']],
//     group: ['rating'],
//     raw: true,
//   });

//   // Format to standard distribution object
//   const result = {
//     1: 0,
//     2: 0,
//     3: 0,
//     4: 0,
//     5: 0,
//   };

//   distribution.forEach((item) => {
//     result[item.rating] = parseInt(item.count);
//   });

//   return result;
// };

Product.prototype.getAverageRating = async function () {
  try {
    const avgRating = await this.sequelize.models.Review.findOne({
      where: {
        productId: this.id,
      },
      attributes: [[this.sequelize.fn('AVG', this.sequelize.col('rating')), 'avgRating']],
      raw: true,
    });

    return avgRating && avgRating.avgRating ? parseFloat(avgRating.avgRating).toFixed(1) : '0.0';
  } catch (error) {
    console.error('Error getting average rating:', error);
    return '0.0';
  }
};

// Get total number of reviews
Product.prototype.getReviewCount = async function () {
  try {
    return await this.sequelize.models.Review.count({
      where: {
        productId: this.id,
      },
    });
  } catch (error) {
    console.error('Error getting review count:', error);
    return 0;
  }
};

// Get rating distribution
Product.prototype.getRatingDistribution = async function () {
  try {
    const distribution = await this.sequelize.models.Review.findAll({
      where: {
        productId: this.id,
      },
      attributes: ['rating', [this.sequelize.fn('COUNT', this.sequelize.col('rating')), 'count']],
      group: ['rating'],
      raw: true,
    });

    // Format to standard distribution object
    const result = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    distribution.forEach((item) => {
      result[item.rating] = parseInt(item.count);
    });

    return result;
  } catch (error) {
    console.error('Error getting rating distribution:', error);
    return {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
  }
};

// Get full review statistics in a single call
// Product.prototype.getReviewStatistics = async function () {
//   const avgRating = await this.getAverageRating();
//   const totalReviews = await this.getReviewCount();
//   const distribution = await this.getRatingDistribution();

//   return {
//     avgRating: parseFloat(avgRating),
//     totalReviews,
//     distribution,
//   };
// };
// Get full review statistics in a single call
Product.prototype.getReviewStatistics = async function () {
  try {
    const avgRating = await this.getAverageRating();
    const totalReviews = await this.getReviewCount();
    const distribution = await this.getRatingDistribution();

    return {
      avgRating: parseFloat(avgRating),
      totalReviews,
      distribution,
    };
  } catch (error) {
    console.error('Error getting review statistics:', error);
    // Return default statistics
    return {
      avgRating: 0,
      totalReviews: 0,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }
};

export default Product;
