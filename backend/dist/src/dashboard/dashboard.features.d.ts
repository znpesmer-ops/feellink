type DashboardPlanKey = 'standard' | 'pro';
type DashboardDefinition = {
    title: Record<DashboardPlanKey, string>;
    features: Record<DashboardPlanKey, string[]>;
};
export declare const DASHBOARD_FEATURES: Record<string, DashboardDefinition>;
export declare const getDashboardSnapshot: (role: string | null | undefined, plan: string | null | undefined) => {
    role: string;
    plan: "pro";
    title: string;
    features: string[];
};
export {};
