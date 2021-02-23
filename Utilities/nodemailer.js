const nodeMailer = require("nodemailer");

const sendMail = async (details) => {
  try {
    // Creating the transporter
    let transporter = nodeMailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.STMP_USERNAME,
        pass: process.env.STMP_PASSWORD,
      },
    });

    let message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: details.email,
      subject: details.subject,
      text: details.message,
    };

    // send mail with defined transport object
    let info = await transporter.sendMail(message);

    console.log("Message sent: %s", info.messageId);
  } catch (err) {
    console.error(err);
  }
};

module.exports = sendMail;
