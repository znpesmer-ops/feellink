import { UserRoleCode } from '../../roles/roles.types';
export declare class RegisterDto {
    email: string;
    username: string;
    password: string;
    fullName?: string;
    role?: UserRoleCode;
    termsAccepted: boolean;
}
