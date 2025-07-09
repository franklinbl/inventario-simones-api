import Product from './product.model';
import Rental from './rental.model';
import RentalProduct from './rental-product.model';
import { User } from './user.model';
import { Role } from './role.model';

// Relaciones entre Product y Rental
Product.belongsToMany(Rental, { through: RentalProduct, foreignKey: 'product_id', as: 'rentals' });
Rental.belongsToMany(Product, { through: RentalProduct, foreignKey: 'rental_id', as: 'products' });

// Relaciones entre User y Role
User.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });
Role.hasMany(User, { as: 'users', foreignKey: 'roleId' });

// Relación entre Rental y User (quien creó la renta)
Rental.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
User.hasMany(Rental, { as: 'rentals', foreignKey: 'created_by' });

export { Product, Rental, RentalProduct, User, Role };