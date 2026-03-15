import { User } from "./user.model";
import type { IUser, UserResponse } from "./user.types";

class UserService {
    async findById(id: string): Promise<IUser | null> {
        return User.findById(id);
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email: email.toLowerCase().trim() });
    }

    async createUser(data: {
        name: string;
        email: string;
        password: string;
        role?: "user" | "admin";
    }): Promise<IUser> {
        return User.create({
            name: data.name,
            email: data.email.toLowerCase().trim(),
            password: data.password,
            role: data.role || "user",
        });
    }

    async getAllUsers() {
        const users = await User.find().sort({ createdAt: -1 });
        return users.map((user: any) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        }));
    }

    async updateOnboardingData(userId: string, data: Partial<IUser>): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            {
                ...data,
                onboardingComplete: true,
            },
            { returnDocument: "after" },
        );
    }

    async updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null> {
        return User.findByIdAndUpdate(
            userId,
            { $set: data },
            { returnDocument: "after" },
        );
    }

    async deleteUser(userId: string): Promise<boolean> {
        const result = await User.findByIdAndDelete(userId);
        return !!result;
    }

    toResponse(user: IUser): UserResponse {
        return {
            id: (user as any)._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            firstName: user.firstName,
            lastName: user.lastName,
            businessName: user.businessName,
            licenseNumber: user.licenseNumber,
            phoneNumber: user.phoneNumber,
            address: user.address,
            professionalEmail: user.professionalEmail,
            yearsInBusiness: user.yearsInBusiness,
            calendlyLink: user.calendlyLink,
            markets: user.markets,
            signatureImageUrl: user.signatureImageUrl,
            brandLogoUrl: user.brandLogoUrl,
            brokerageLogoUrl: user.brokerageLogoUrl,
            brokerageName: user.brokerageName,
            subscriptionPlan: user.subscriptionPlan,
        };
    }
}

export const userService = new UserService();
