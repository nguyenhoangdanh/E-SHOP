const nodemailer = require("nodemailer");

const sendMail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMPT_HOST,
        port: process.env.SMPT_PORT,
        service: process.env.SMPT_SERVICE,
        secure: true, // true for 465, false for other ports
        auth:{
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD,
        },
         // === add this === //
         tls: {
            rejectUnauthorized: false
        }
        
    });

   

    const mailOptions = {
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: '<h2>' + `${options.message}` + '</h2>'
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendMail;