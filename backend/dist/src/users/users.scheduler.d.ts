import { UsersService } from './users.service';
export declare class UsersScheduler {
    private usersService;
    constructor(usersService: UsersService);
    purgeScheduledDeletions(): Promise<void>;
}
