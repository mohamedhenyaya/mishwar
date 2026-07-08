"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeolocationModule = void 0;
const common_1 = require("@nestjs/common");
const geolocation_gateway_1 = require("./geolocation.gateway");
const drivers_module_1 = require("../drivers/drivers.module");
const auth_module_1 = require("../auth/auth.module");
const rides_module_1 = require("../rides/rides.module");
let GeolocationModule = class GeolocationModule {
};
exports.GeolocationModule = GeolocationModule;
exports.GeolocationModule = GeolocationModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => drivers_module_1.DriversModule), (0, common_1.forwardRef)(() => rides_module_1.RidesModule), auth_module_1.AuthModule],
        providers: [geolocation_gateway_1.GeolocationGateway],
        exports: [geolocation_gateway_1.GeolocationGateway],
    })
], GeolocationModule);
//# sourceMappingURL=geolocation.module.js.map