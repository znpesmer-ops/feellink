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
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Lütfen geçerli bir e-posta adresi girin.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'E-posta adresi gereklidir' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Kullanıcı adı gereklidir' }),
    (0, class_validator_1.MinLength)(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim().toLowerCase()),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Şifre gereklidir' }),
    (0, class_validator_1.MinLength)(8, { message: 'Şifre en az 8 karakter olmalıdır' }),
    (0, class_validator_1.Matches)(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: 'Şifre en az bir harf ve bir rakam içermelidir',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value === 'string' && value.trim() === '') {
            return undefined;
        }
        return value;
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === true || value === 'true' || value === 1)
            return true;
        if (value === false || value === 'false' || value === 0)
            return false;
        return value;
    }),
    (0, class_validator_1.IsBoolean)({ message: 'Kullanıcı sözleşmesi kabul edilmelidir' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Kullanıcı sözleşmesi kabul edilmelidir' }),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "termsAccepted", void 0);
//# sourceMappingURL=register.dto.js.map