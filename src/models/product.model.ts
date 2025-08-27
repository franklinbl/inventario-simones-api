import { DataTypes, FindOptions, literal, Model, Optional, ProjectionAlias } from 'sequelize';
import sequelize from '../config/db.config';
import RentalProduct from './rental-product.model';
import Rental from './rental.model';

interface ProductAttributes {
  id: number;
  code: string;
  name: string;
  description: string;
  total_quantity: number;
  price: number;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  static readonly AVAILABILITY_STATUSES = ['pending_return', 'with_issues'] as const;

  public id!: number;
  public name!: string;
  public code!: string;
  public description!: string;
  public total_quantity!: number;
  public price!: number;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
  },
  {
    sequelize,
    tableName: 'products',
    modelName: 'Product',
  }
);

const statuses = Product.AVAILABILITY_STATUSES;
Product.addScope(
  'withAvailability',
  (startDate: string, endDate: string): FindOptions => ({
    attributes: {
      include: [
        [
          literal(`
            GREATEST(
              "Product"."total_quantity"
              - COALESCE(
                  SUM(
                    CASE
                      WHEN "rental_product->rental"."start_date" <= :endDate::date
                       AND "rental_product->rental"."end_date"   >= :startDate::date
                       AND "rental_product->rental"."status" = 'pending_return'
                      THEN "rental_product"."quantity_rented"
                      WHEN "rental_product->rental"."start_date" <= :endDate::date
                       AND "rental_product->rental"."end_date"   >= :startDate::date
                       AND "rental_product->rental"."status" = 'with_issues'
                      THEN "rental_product"."quantity_rented" - "rental_product"."quantity_returned"
                      ELSE 0
                    END
                  ), 0
                ),
              0
            )
          `),
          'available_quantity',
        ] as ProjectionAlias,
      ],
    },
    include: [
      {
        model: RentalProduct,
        as: 'rental_product',
        attributes: [],
        required: false,
        include: [{ model: Rental, as: 'rental', attributes: [] }],
      },
    ],
    group: ['Product.id'],
    replacements: { startDate, endDate, statuses },
  })
);

export default Product;