import express, { Express } from "express";  // Import Express framework
import multer, { Multer } from "multer";

export interface MulterOptions extends Express, Multer.File {
    /**
     * The directory to which the uploaded files will be stored.
     * If not specified, the files will be stored in memory as Buffer objects.
     */
    dest?: string;

    /**
     * Function to determine the file name for storing the uploaded files.
     * If not specified, a random unique name will be generated for each file.
     *
     * @param req - The Express request object.
     * @param file - The uploaded file.
     * @param callback - Callback function to pass the file name to Multer.
     */
    filename?: (
        req: Express.Request,
        file: Multer.File,
        callback: (error: Error | null, filename: string) => void
    ) => void;

    /**
     * Limits the size of uploaded files.
     */
    limits?: {
        /**
         * The maximum size in bytes for each uploaded file.
         */
        fileSize?: number;

        /**
         * The maximum number of files to accept in a single request.
         */
        files?: number;

        /**
         * The maximum number of fields to accept in a single request.
         */
        fields?: number;

        /**
         * The maximum size in bytes for the combined fields and files in a single request.
         */
        fieldSize?: number;
    };

    /**
     * Function to filter which files are accepted based on file type and other criteria.
     *
     * @param req - The Express request object.
     * @param file - The uploaded file.
     * @param callback - Callback function to indicate if the file is accepted or rejected.
     */
    fileFilter?: (
        req: Express.Request,
        file: Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void
    ) => void;
}