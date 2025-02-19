const { sendEmail } = require('./utils/email-service');

const checkDeadlines = () => {
    console.log('Mando email');
    sendEmail('penazziriccardo17@gmail.com');
    console.log('Email mandata');
};

module.exports = checkDeadlines;