"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("./entities/user.entity");
const ride_entity_1 = require("../rides/entities/ride.entity");
let UsersService = class UsersService {
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async findById(id) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        return user;
    }
    async update(id, dto) {
        await this.userRepo.update(id, dto);
        return this.findById(id);
    }
    async setPhoto(id, photoUrl) {
        await this.userRepo.update(id, { photoUrl });
        return this.findById(id);
    }
    async incrementTotalRides(id) {
        await this.userRepo.increment({ id }, 'totalRides', 1);
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        return this.userRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
    }
    async findAllPaginated(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const qb = this.userRepo.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');
        if (query.isActive !== undefined) {
            qb.andWhere('user.isActive = :isActive', { isActive: query.isActive === 'true' });
        }
        if (query.search) {
            qb.andWhere('(user.name ILIKE :s OR user.phone ILIKE :s)', { s: `%${query.search}%` });
        }
        const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data, total, page, limit };
    }
    async getStats(id) {
        const user = await this.findById(id);
        const rideRepo = this.userRepo.manager.getRepository(ride_entity_1.Ride);
        const statusCounts = await rideRepo
            .createQueryBuilder('ride')
            .select('ride.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('ride.userId = :id', { id })
            .groupBy('ride.status')
            .getRawMany();
        const ridesByStatus = {};
        let totalRides = 0;
        for (const row of statusCounts) {
            const count = parseInt(row.count, 10);
            ridesByStatus[row.status] = count;
            totalRides += count;
        }
        return { user, totalRides, ridesByStatus, balance: Number(user.balance) };
    }
    async block(id, reason) {
        await this.findById(id);
        await this.userRepo.update(id, {
            isActive: false,
            blockedReason: reason ?? null,
            blockedAt: new Date(),
        });
        return this.findById(id);
    }
    async unblock(id) {
        await this.findById(id);
        await this.userRepo.update(id, { isActive: true, blockedReason: null, blockedAt: null });
        return this.findById(id);
    }
    async createAdmin(dto) {
        const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
        if (existing)
            throw new common_1.ConflictException('Un compte avec ce numéro existe déjà');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const admin = this.userRepo.create({
            phone: dto.phone,
            name: dto.name,
            passwordHash,
            role: user_entity_1.UserRole.ADMIN,
        });
        return this.userRepo.save(admin);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map