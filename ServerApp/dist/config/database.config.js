"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const user_entity_1 = require("../modules/users/entities/user.entity");
const driver_entity_1 = require("../modules/drivers/entities/driver.entity");
const ride_entity_1 = require("../modules/rides/entities/ride.entity");
const platform_settings_entity_1 = require("../modules/settings/entities/platform-settings.entity");
const wallet_transaction_entity_1 = require("../modules/wallet/entities/wallet-transaction.entity");
const wallet_request_entity_1 = require("../modules/wallet/entities/wallet-request.entity");
const notification_entity_1 = require("../modules/notifications/entities/notification.entity");
const device_token_entity_1 = require("../modules/notifications/entities/device-token.entity");
const notification_preference_entity_1 = require("../modules/notifications/entities/notification-preference.entity");
const refresh_token_entity_1 = require("../modules/auth/entities/refresh-token.entity");
const review_entity_1 = require("../modules/ratings/entities/review.entity");
const coupon_entity_1 = require("../modules/promotions/entities/coupon.entity");
const coupon_redemption_entity_1 = require("../modules/promotions/entities/coupon-redemption.entity");
const support_ticket_entity_1 = require("../modules/support/entities/support-ticket.entity");
const support_ticket_message_entity_1 = require("../modules/support/entities/support-ticket-message.entity");
const vehicle_entity_1 = require("../modules/vehicles/entities/vehicle.entity");
const vehicle_document_entity_1 = require("../modules/vehicles/entities/vehicle-document.entity");
const favorite_place_entity_1 = require("../modules/places/entities/favorite-place.entity");
const admin_audit_log_entity_1 = require("../modules/audit-log/entities/admin-audit-log.entity");
const databaseConfig = (config) => ({
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get('DB_PORT', 5432),
    username: config.get('DB_USERNAME', 'vtc_user'),
    password: config.get('DB_PASSWORD', 'vtc_password'),
    database: config.get('DB_NAME', 'vtc_db'),
    entities: [
        user_entity_1.User, driver_entity_1.Driver, ride_entity_1.Ride, platform_settings_entity_1.PlatformSettings, wallet_transaction_entity_1.WalletTransaction, notification_entity_1.Notification,
        wallet_request_entity_1.WalletRequest, device_token_entity_1.DeviceToken, notification_preference_entity_1.NotificationPreference, refresh_token_entity_1.RefreshToken,
        review_entity_1.Review, coupon_entity_1.Coupon, coupon_redemption_entity_1.CouponRedemption, support_ticket_entity_1.SupportTicket, support_ticket_message_entity_1.SupportTicketMessage,
        vehicle_entity_1.Vehicle, vehicle_document_entity_1.VehicleDocument, favorite_place_entity_1.FavoritePlace, admin_audit_log_entity_1.AdminAuditLog,
    ],
    synchronize: config.get('NODE_ENV') !== 'production',
    logging: config.get('NODE_ENV') === 'development',
});
exports.databaseConfig = databaseConfig;
//# sourceMappingURL=database.config.js.map