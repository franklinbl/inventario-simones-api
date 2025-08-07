import Product from './product.model';
import Rental from './rental.model';
import RentalProduct from './rental-product.model';
import { User } from './user.model';
import { Role } from './role.model';
import Client from './client.model';

// Relación muchos a muchos: Product ⇄ Rental
Product.belongsToMany(Rental, { through: RentalProduct, foreignKey: 'product_id', as: 'rentals' });
Rental.belongsToMany(Product, { through: RentalProduct, foreignKey: 'rental_id', as: 'products' });

// Relación intermedia: RentalProduct → Rental y Product
RentalProduct.belongsTo(Rental, { foreignKey: 'rental_id', as: 'rental' });
RentalProduct.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(RentalProduct, { foreignKey: 'product_id', as: 'rental_product' });
Rental.hasMany(RentalProduct, { foreignKey: 'rental_id', as: 'rental_product' });

// Relación User ⇄ Role
User.belongsTo(Role, { as: 'role', foreignKey: 'role_id' });
Role.hasMany(User, { as: 'users', foreignKey: 'role_id' });

// Relación Rental → User (creador)
Rental.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
User.hasMany(Rental, { as: 'rentals', foreignKey: 'created_by' });

// Relación Client → Rental
Client.hasMany(Rental, { as: 'rentals', foreignKey: 'client_id' });
Rental.belongsTo(Client, { as: 'client', foreignKey: 'client_id' });

export { Product, Rental, RentalProduct, User, Role };