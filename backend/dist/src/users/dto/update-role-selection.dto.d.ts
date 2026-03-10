declare const PLAN_CODES: readonly ["FREE", "PRO", "ORI"];
export declare class UpdateRoleSelectionDto {
    roles?: string[];
    plan?: (typeof PLAN_CODES)[number];
    extras?: string[];
}
export {};
