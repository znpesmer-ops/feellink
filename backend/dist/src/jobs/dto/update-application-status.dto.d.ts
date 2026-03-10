export declare enum ApplicationStatus {
    PENDING = "PENDING",
    REVIEWED = "REVIEWED",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    INTERVIEW = "INTERVIEW"
}
export declare class UpdateApplicationStatusDto {
    status: ApplicationStatus;
}
