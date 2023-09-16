// Interface for Keygrip functionality
interface Keygrip {
    /**
     * Signs the provided data and returns the signature as a string.
     * @param data Data to be signed.
     * @returns Signature string.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sign(data: any): string;

    /**
     * Verifies the provided data against a given digest (signature).
     * @param data Data to be verified.
     * @param digest Signature to verify against.
     * @returns True if the verification is successful, otherwise false.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verify(data: any, digest: string): boolean;

    /**
     * Retrieves the index of the provided data in relation to a given digest (signature).
     * @param data Data to find the index for.
     * @param digest Signature to search for.
     * @returns Index of the data, or -1 if not found.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    index(data: any, digest: string): number;
}

// Function signature for creating Keygrip instances
interface KeygripFunction {
    new(keys: ReadonlyArray<string>, algorithm?: string, encoding?: string): Keygrip;
    (keys: ReadonlyArray<string>, algorithm?: string, encoding?: string): Keygrip;
}

// Export the Keygrip interface
export { KeygripFunction as Keygrip };
