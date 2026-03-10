"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception instanceof common_1.HttpException
            ? exception.getResponse()
            : exception instanceof Error
                ? exception.message
                : 'Internal server error';
        let validationDetails = '';
        if (exception instanceof common_1.HttpException && status === 400) {
            const response = exception.getResponse();
            if (typeof response === 'object' && response !== null) {
                const resp = response;
                if (Array.isArray(resp.message)) {
                    validationDetails = `\nValidation Errors: ${JSON.stringify(resp.message, null, 2)}`;
                }
                else if (resp.message) {
                    validationDetails = `\nError Message: ${resp.message}`;
                }
            }
        }
        this.logger.error(`❌ ${request.method} ${request.url} - Status: ${status}${validationDetails}`, exception instanceof Error ? exception.stack : JSON.stringify(exception));
        let errorMessage = typeof message === 'string' ? message : message?.message || 'Internal server error';
        let validationErrors = null;
        if (exception instanceof common_1.HttpException && status === 400) {
            const response = exception.getResponse();
            if (typeof response === 'object' && response !== null) {
                const resp = response;
                if (Array.isArray(resp.message)) {
                    validationErrors = resp.message;
                    errorMessage = `Validation failed: ${resp.message.join(', ')}`;
                }
                else if (resp.message) {
                    errorMessage = resp.message;
                }
            }
        }
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: errorMessage,
            ...(validationErrors ? { errors: validationErrors } : {}),
            ...(typeof message === 'object' && message !== null && !Array.isArray(message?.message) ? message : {}),
        };
        if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
            errorResponse.stack = exception.stack;
        }
        response.status(status).json(errorResponse);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map