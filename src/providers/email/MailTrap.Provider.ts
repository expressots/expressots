import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { Env } from 'env';
import { IMessage } from './IMail.Provider';

export class MailTrapProvider {

    private transporter: Mail;
    
    constructor() {

        this.transporter = nodemailer.createTransport({
            host: Env.mailtrap.MAILTRAP_HOST,
            port: Env.mailtrap.MAILTRAP_PORT,
            auth: {
                user: Env.mailtrap.MAILTRAP_USERNAME,
                pass: Env.mailtrap.MAILTRAP_PASSWORD
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