import { controller, FileUpload, Post, request } from "@expressots/adapter-express";
import type { Request } from "express";

@controller("/upload")
export class UploadController {
    @Post("/avatar")
    @FileUpload({ fieldName: "avatar" }, { dest: "uploads/" })
    uploadAvatar(@request() req: Request) {
        return {
            message: "File uploaded successfully",
            filename: req.file?.filename ?? null,
            originalname: req.file?.originalname ?? null,
        };
    }
}
