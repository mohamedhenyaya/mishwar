"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const user_entity_1 = require("../modules/users/entities/user.entity");
const driver_entity_1 = require("../modules/drivers/entities/driver.entity");
const ride_entity_1 = require("../modules/rides/entities/ride.entity");
const databaseConfig = (config) => ({
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get('DB_PORT', 5432),
    username: config.get('DB_USERNAME', 'vtc_user'),
    password: config.get('DB_PASSWORD', 'vtc_password'),
    database: config.get('DB_NAME', 'vtc_db'),
    entities: [user_entity_1.User, driver_entity_1.Driver, ride_entity_1.Ride],
    synchronize: config.get('NODE_ENV') !== 'production',
    logging: config.get('NODE_ENV') === 'development',
});
exports.databaseConfig = databaseConfig;
//# sourceMappingURL=database.config.js.map