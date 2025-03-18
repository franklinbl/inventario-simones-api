import Product from './product.model';
import Rental from './rental.model';
import RentalProduct from './rental-product.model';

// Relaciones
Product.belongsToMany(Rental, { through: RentalProduct, foreignKey: 'product_id', as: 'rentals' });
Rental.belongsToMany(Product, { through: RentalProduct, foreignKey: 'rental_id', as: 'products' });

export { Product, Rental, RentalProduct };