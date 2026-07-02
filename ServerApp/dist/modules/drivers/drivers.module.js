"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const drivers_controller_1 = require("./drivers.controller");
const admin_drivers_controller_1 = require("./admin-drivers.controller");
const drivers_service_1 = require("./drivers.service");
const driver_entity_1 = require("./entities/driver.entity");
const geolocation_module_1 = require("../geolocation/geolocation.module");
const audit_log_module_1 = require("../audit-log/audit-log.module");
let DriversModule = class DriversModule {
};
exports.DriversModule = DriversModule;
exports.DriversModule = DriversModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([driver_entity_1.Driver]),
            (0, common_1.forwardRef)(() => geolocation_module_1.GeolocationModule),
            audit_log_module_1.AuditLogModule,
        ],
        controllers: [drivers_controller_1.DriversController, admin_drivers_controller_1.AdminDriversController],
        providers: [drivers_service_1.DriversService],
        exports: [drivers_service_1.DriversService],
    })
], DriversModule);
//# sourceMappingURL=drivers.module.js.map