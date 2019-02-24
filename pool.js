const mssql = require('mssql');
const Mailgun = require('mailgun-js');
const config = require('./config');

const connectionConfig = {
	user: config.mysqlUser,
	password: config.mysqlPassword,
	server: config.mysqlHost,
	database: config.mysqlDatabase,
	parseJSON: true,
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000
	},
	options: {
		encrypt: true
	}
};

// eslint-disable-next-line new-cap
const mailgun = Mailgun({
	apiKey: config.emailNotificationsApiKey,
	domain: config.emailNotificationsDomain
});
const list = mailgun.lists(config.emailNotificationsList);

const pool = new mssql.ConnectionPool(connectionConfig, async error => {
	if (error) {
		console.error(error.code);

		try {
			const members = await list.members().list();

			const recipients = members.items.map(obj => obj.address);

			const data = {
				from: 'Maker Panel Backend <makerpanelbackend@maker.rs>',
				to: recipients.join(', '),
				subject: `${error.code}`,
				text: `There was an error on the Maker Panel Backend\n${error.name}\n${error.message}\n${JSON.stringify({...error}, null, '    ')}`
			};

			await mailgun.messages().send(data);
		} catch (error2) {
			console.error('error: failed to get members and send email');
			console.error(error2);
		}
	}
});

// (async () => {
// 	try {
// 		await pool.connect();
// 	} catch (error) {
// 		if (error) {
// 			console.error(error.code);

// 			try {
// 				const members = await list.members().list();

// 				const recipients = members.items.map(obj => obj.address);

// 				const data = {
// 					from: 'Maker Panel Backend <makerpanelbackend@maker.rs>',
// 					to: recipients.join(', '),
// 					subject: `${error.code}`,
// 					text: `There was an error on the Maker Panel Backend\n${error.name}\n${error.message}\n${JSON.stringify({...error}, null, '    ')}`
// 				};

// 				await mailgun.messages().send(data);
// 			} catch (error2) {
// 				console.error('error: failed to get members and send email');
// 				console.error(error2);
// 			}
// 		}
// 	}
// })();

module.exports = pool;
