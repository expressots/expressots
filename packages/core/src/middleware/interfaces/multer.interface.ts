import express, { Express } from "express";


export namespace Multer {

    /**
     * Represents a file uploaded through Multer.
     *
     * @interface File
     * @property {string} fieldname - The field name associated with the file.
     * @property {string} originalname - The original name of the file.
     * @property {string} encoding - The encoding type of the file.
     * @property {string} mimetype - The MIME type of the file.
     * @property {number} size - The size of the file in bytes.
     * @property {string} destination - The directory where the file is stored.
     * @property {string} filename - The name of the file within the destination.
     * @property {string} path - The full path to the file.
     * @property {Buffer} buffer - The file data as a Buffer.
     */
    export interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
    }

    /**
     * Interface for defining a custom storage engine for Multer.
     *
     * @interface StorageEngine
     */
    export interface StorageEngine {
        /**
         * Method to handle the uploaded file.
         *
         * @function
         * @name StorageEngine#_handleFile
         * @param {Express.Request} req - The Express request object.
         * @param {File} file - The file being uploaded.
         * @param {(error: Error | null, info: Partial<File>) => void} callback - Callback function to indicate completion or error.
         * @returns {void}
         */
        _handleFile(req: Express.Request, file: File, callback: (error: Error | null, info: Partial<File>) => void): void;

        /**
         * Method to remove a file.
         *
         * @function
         * @name StorageEngine#_removeFile
         * @param {Express.Request} req - The Express request object.
         * @param {File} file - The file to be removed.
         * @param {(error: Error | null) => void} callback - Callback function to indicate completion or error.
         * @returns {void}
         */
        _removeFile(req: Express.Request, file: File, callback: (error: Error | null) => void): void;
    }

    export interface MulterOptions {
        storage?: StorageEngine | undefined;
        fileFilter?: (req: Express.Request, file: File, callback: (error: Error | null, acceptFile: boolean) => void) => void;
    }
}
