export declare class CreateJobDto {
    title: string;
    description: string;
    company?: string;
    location?: string;
    salary?: string;
    tags?: string[];
    saveAsDraft?: boolean;
    deadline?: string;
    maxApplications?: string;
    autoCloseOnDeadline?: boolean;
}
