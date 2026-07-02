"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const drivers_module_1 = require("./modules/drivers/drivers.module");
const geolocation_module_1 = require("./modules/geolocation/geolocation.module");
const rides_module_1 = require("./modules/rides/rides.module");
const places_module_1 = require("./modules/places/places.module");
const settings_module_1 = require("./modules/settings/settings.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const ratings_module_1 = require("./modules/ratings/ratings.module");
const promotions_module_1 = require("./modules/promotions/promotions.module");
const support_module_1 = require("./modules/support/support.module");
const vehicles_module_1 = require("./modules/vehicles/vehicles.module");
const audit_log_module_1 = require("./modules/audit-log/audit-log.module");
const database_config_1 = require("./config/database.config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: database_config_1.databaseConfig,
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            drivers_module_1.DriversModule,
            geolocation_module_1.GeolocationModule,
            rides_module_1.RidesModule,
            places_module_1.PlacesModule,
            settings_module_1.SettingsModule,
            wallet_module_1.WalletModule,
            notifications_module_1.NotificationsModule,
            dashboard_module_1.DashboardModule,
            ratings_module_1.RatingsModule,
            promotions_module_1.PromotionsModule,
            support_module_1.SupportModule,
            vehicles_module_1.VehiclesModule,
            audit_log_module_1.AuditLogModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map