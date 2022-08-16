import morgan from "morgan";

function DefineMorganTokens(): void {

    morgan.token("hostname", function (req: any) {
        return req.hostname;
    });

    morgan.token("pid", function (req: any) {
        return process.pid.toString();
    });

    morgan.token("path", (req: any) => {
        return req.path;
    });

    morgan.token("method", (req: any) => {
        return req.method;
    });

    morgan.token("status", (req: any) => {
        return req.statusCode;
    });

    morgan.token("response-time", (req: any) => {
        return req.responseTime;
    });

    morgan.token("date", (req: any) => {
        return new Date().toISOString();
    });

    morgan.token("body", (req: any) => {
        return JSON.stringify(req.body);
    });

    morgan.token("query", (req: any) => {
        return JSON.stringify(req.query);
    });

    morgan.token("params", (req: any) => {
        return JSON.stringify(req.params);
    });

    morgan.token("headers", (req: any) => {
        return JSON.stringify(req.headers);
    });

    morgan.token("ip", (req: any) => {
        return req.ip;
    });

    morgan.token("user-agent", (req: any) => {
        return req.userAgent;
    });

    morgan.token("body-size", (req: any) => {
        return req.bodySize;
    });

    morgan.token("remote-address", (req: any) => {
        return req.connection.remoteAddress;
    });

    morgan.token("remote-user", (req: any) => {
        return req.connection.user;
    });

    morgan.token("date", (req: any) => {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        let todayDate = today.getFullYear() + '-' + mm + '-' + dd;

        return todayDate + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
    });

    morgan.token("url", (req: any) => {
        return req.url;
    });

    morgan.token("referrer", (req: any) => {
        return req.headers.referer;
    });

    morgan.token("response-sectime", (req: any, res: any) => {
        if (!res._header || !req._startAt) {
            return "";
        }
        const diff = process.hrtime(req._startAt);
        const ms = diff[0] * 1e3 + diff[1] * 1e-9;
        return ms.toFixed(3);
    });
}

function MorganDefaultFormat(): string {
    return "[:hostname :remote-address]-[:date]-[pid: :pid] :method :url :res[content-length] :response-time :response-sectime ms :referrer :user-agent";
}

export { DefineMorganTokens, MorganDefaultFormat };
