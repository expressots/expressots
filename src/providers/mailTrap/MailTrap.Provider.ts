import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { Env } from 'Env';
import { IMessage } from './IMail.Provider';
import { provide } from 'inversify-binding-decorators';

@provide(MailTrapProvider)
export class MailTrapProvider {

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

    async sendEmail(message: IMessage): Promise<void> {
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

}