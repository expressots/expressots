import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { Env } from "env";
import { IMessage } from "./IMail.Provider";
import { provide } from "inversify-binding-decorators";

enum EmailType {
    Welcome = 0,
    RecoveryPassword,
    ChangePassword,
    CreateUser
}

@provide(MailTrapProvider)
class MailTrapProvider {

    private transporter: Mail;

    constructor() {

        this.transporter = nodemailer.createTransport({
            host: Env.Mailtrap.HOST,
            port: Env.Mailtrap.PORT,
            auth: {
                user: Env.Mailtrap.USERNAME,
                pass: Env.Mailtrap.PASSWORD
            }
        })
    }

    private async MailSender(message: IMessage): Promise<void> {
        await this.transporter.sendMail({
            to: {
                name: message.to.name,
                address: message.to.email
            },
            from: {
                name: message.from.name,
                address: message.from.email
            },
            subject: message.subject,
            html: message.body
        })
    }

    public async SendEmail(emailType: EmailType): Promise<void> {
        switch (emailType) {
            case EmailType.Welcome:
                break;
            case EmailType.RecoveryPassword:
                break;
            case EmailType.ChangePassword:
                break;
            case EmailType.CreateUser:
                this.MailSender({
                    to: {
                        name: "User",
                        email: Env.Mailtrap.INBOX_ALIAS
                    },
                    from: {
                        name: "Expresso TS",
                        email: "noreply@expressots.dev"
                    },
                    subject: "Your account was created successfully!",
                    body: "<h1>Account created successfully!</h1>"
                });
                break;
        }
    }
}

export { MailTrapProvider, EmailType };