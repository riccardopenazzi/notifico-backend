require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    /* port: 456,
    secure: true, */
    auth: {
        user: process.env.NOTIFICO_EMAIL,
        pass: process.env.NOTIFICO_APP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false, //temporaneamente
    }
});

const sendEmail = (userEmail, deadlineTitle, deadlineDate, deadlineDescription) => {
  const mailOptions = {
    from: process.env.NOTIFICO_EMAIL,
    to: userEmail,
    subject: `Avviso scadenza: ${deadlineTitle}`,
    text: `Ciao! Questo è un promemoria per la scadenza di "${deadlineTitle}" che avverrà il ${deadlineDate}.\n\nEcco qualche info in più:\n${deadlineDescription}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Errore nell\'invio dell\'email:', error);
    } else {
      console.log('Email inviata:', info.response);
    }
  });
};


module.exports = { sendEmail };