type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];

type CustomOrigin = (requestOrigin: string | undefined, callback: (err: Error | null, origin?: StaticOrigin) => void) => void;

interface CorsOptions {
    /**
     * @default '*''
     */
    origin?: StaticOrigin | CustomOrigin | undefined;
    /**
     * @default 'GET,HEAD,PUT,PATCH,POST,DELETE'
     */
    methods?: string | string[] | undefined;
    allowedHeaders?: string | string[] | undefined;
    exposedHeaders?: string | string[] | undefined;
    credentials?: boolean | undefined;
    maxAge?: number | undefined;
    /**
     * @default false
     */
    preflightContinue?: boolean | undefined;
    /**
     * @default 204
     */
    optionsSuccessStatus?: number | undefined;
}

export { CorsOptions };