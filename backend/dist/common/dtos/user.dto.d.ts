export declare enum UserProfile {
    ADMIN = "admin",
    FINAL_USER = "final_user"
}
export declare class CreateUserDto {
    email: string;
    password: string;
    name: string;
    profile?: UserProfile;
    isActive?: boolean;
}
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<CreateUserDto>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
}
export declare class UserResponseDto {
    id: number;
    email: string;
    name: string;
    profile: string;
    isActive: boolean;
    createdAt: Date;
    allowedMenuItems?: string[];
}
export {};
