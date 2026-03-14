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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyResetOtpDto = void 0;
const class_validator_1 = require("class-validator");
class VerifyResetOtpDto {
}
exports.VerifyResetOtpDto = VerifyResetOtpDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Geçerli bir e-posta adresi girin.' }),
    __metadata("design:type", String)
], VerifyResetOtpDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'Kod 6 haneli olmalıdır.' }),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Kod sadece rakamlardan oluşmalıdır.' }),
    __metadata("design:type", String)
], VerifyResetOtpDto.prototype, "code", void 0);
//# sourceMappingURL=verify-reset-otp.dto.js.map