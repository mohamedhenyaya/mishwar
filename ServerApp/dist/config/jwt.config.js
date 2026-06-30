"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
const jwtConfig = (config) => ({
    secret: config.get('JWT_SECRET', 'vtc-dev-secret'),
    signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
});
exports.jwtConfig = jwtConfig;
//# sourceMappingURL=jwt.config.js.map