/// <reference types="cookie-parser" />
import { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { Request } from 'express';
interface RequestUser {
    id: string;
}
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createCheckoutSession(dto: CreateCheckoutSessionDto, user: RequestUser): Promise<{
        id: string;
        url: string;
    }>;
    handleWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
}
export {};
