export declare enum UserRole {
    ADMIN = "admin",
    EDITOR = "editor",
    USER = "user"
}
export declare class CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<CreateUserDto>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
}
export declare class UserResponseDto {
    id: number;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
}
export {};
