const nodemailer = require("nodemailer");

const sendMail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    service: process.env.SMPT_SERVICE,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    },
    // === add this === //
    tls: {
      rejectUnauthorized: false,
    },
  });


  const mailOptions = {
    from: process.env.SMPT_MAIL,
    template: "email",
    to: options.email,
    subject: options.subject,
    // text: options.message,
    html: "Mật khẩu mới của bạn là: <h4>" + `${options.message}` + "</h4>",
   
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendMail;
