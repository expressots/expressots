interface CookieParserOptions {
    /**
     * A function used for decoding cookies.
     * By default, `decodeURIComponent` is used.
     * You can provide a custom decoding function here.
     */
    decode?(val: string): string;
}

export { CookieParserOptions };
