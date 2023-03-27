interface IAddress {
    email: string;
    name: string;
}

interface IMessage {
    from: IAddress;
    to: IAddress;
    subject: string;
    body: string;
}

interface IMailProvider {
    sendEmail(message: IMessage): Promise<void>;
}

export { IMessage, IMailProvider };