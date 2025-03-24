import nodemailer from 'nodemailer';

const senderEmail = process.env.CONTACT_SENDER_EMAIL;
const recipientEmail = process.env.CONTACT_RECIPIENT_EMAIL;
const pass = process.env.CONTACT_SENDER_PASSWORD;

export const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: senderEmail,
		pass: pass,
	},
});

export const mailOptions = {
	from: senderEmail,
	to: recipientEmail,
};
