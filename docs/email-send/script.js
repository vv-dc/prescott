/* eslint-disable @typescript-eslint/no-var-requires */
const process = require('node:process');
const { randomInt } = require('node:crypto');
const { setTimeout } = require('node:timers/promises');
const { createTransport } = require('nodemailer');

const sendEmail = async (transport, receiver) => {
  const mailOptions = {
    from: 'from@gmail.com',
    to: receiver,
    subject: 'Hello, world!',
    text: `An automation system sent this message on [${new Date().toISOString()}]`,
  };
  try {
    console.log(`Process[${process.pid}]: enqueue email to: ${receiver}`);
    const data = await transport.sendMail(mailOptions);
    console.log(
      `Process[${process.pid}]: email sent to ${data.accepted[0]} - ${data.response}`
    );
  } catch (err) {
    console.error(`Process[${process.pid}]: ${err.toString()}`);
  }
};

const run = async () => {
  const transport = createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: 'user',
      pass: 'pass',
    },
  });
  for (let idx = 0; idx < 3; ++idx) {
    const receiver = `target-${randomInt(1, 10_00)}@test.com`;
    await sendEmail(transport, receiver);
    await setTimeout(1_500);
  }
};

run().then(() => {
  console.log(`Process[${process.pid}]: sent all emails`);
});
