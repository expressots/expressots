import { AppError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, GeneralErrorCode } from "@providers/error/ErrorTypes";
import { Report } from "@providers/error/ReportError.Provider";
import fs from "fs";
import { createStream, RotatingFileStream } from "rotating-file-stream";
import path from "path";
import { DefineMorganTokens } from "./MorganTokens";

class MorganLog {

    public static Init(rootDir: string): RotatingFileStream | void {
        fs.mkdir(`${rootDir}`, { recursive: true }, (err) => {

            if (err) {
                Report.Error(new AppError(
                    ApplicationErrorCode.LogFolderCreationError));
                return;
            }
        });

        // Setting up the morgan tokens
        DefineMorganTokens();

        let logFile = createStream(MorganLog.GetFileName(), {
            interval: '1d',
            path: path.join(rootDir),
            size: '10M',
            compress: 'gzip',
            maxFiles: 30,
        });

        return logFile;
    }

    private static GetFileName(): string {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        let todayDate = today.getFullYear() + '-' + mm + '-' + dd;

        let conToday = "api-requests-" + mm + '-' + dd + '-' + yyyy + ".log";

        return conToday;
    }
}

export { MorganLog };