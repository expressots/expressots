interface IDatabaseProvider {
    Connect(): Promise<void>;
    Disconnect(): Promise<void>;
}

export { IDatabaseProvider };