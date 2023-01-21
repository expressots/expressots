
import { IBaseEntity } from "./IBase.Entity";
import { Document, Schema, model } from "mongoose";

/* Represents the model of a user and its property types */
interface IUser extends IBaseEntity {
    name: string;
    email: string;
    password: string;
}

type UserDocument = Document & IUser;

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, "Email is invalid"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// The actual model in which we instantiate the user
const User = model<IUser>("User", userSchema);

export { User, IUser, UserDocument };