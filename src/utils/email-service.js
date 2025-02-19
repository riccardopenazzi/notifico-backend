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

/* const sendEmail = (userEmail, deadlineTitle, deadlineDate) => {
    const mailOptions = {
      from: process.env.NOTIFICO_EMAIL,
      to: userEmail,
      subject: `Avviso scadenza: ${deadlineTitle}`,
      text: `Ciao! Questo è un promemoria per la scadenza di "${deadlineTitle}" che avverrà il ${deadlineDate}.`,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Errore nell\'invio dell\'email:', error);
      } else {
        console.log('Email inviata:', info.response);
      }
    });
  }; */

  const sendEmail = (userEmail) => {
    const mailOptions = {
      from: process.env.NOTIFICO_EMAIL,
      to: userEmail,
      subject: `Test invio email`,
      text: `Ciao! Questo è un test per l'invio delle email, se funziona sei un grande!!`,
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