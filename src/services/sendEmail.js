const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: process.env.SENDEREMAIL ,
    pass: process.env.PASSWORD
  }
});

// async..await is not allowed in global scope, must use a wrapper
const sendEmail = async (sendTo, message, subject, senderName) =>  {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: {
        name: senderName,
        address: process.env.SENDEREMAIL
    },
    to: sendTo , // list of receivers
    subject, // Subject line
    html: message , // html body
  });
}

module.exports = sendEmail