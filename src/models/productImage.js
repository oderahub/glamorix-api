import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    timestamps: true,
    paranoid: true
  }
)

export default ProductImage
