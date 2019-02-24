const express = require('express');
const pool = require('./pool');
const util = require('./util');

const integrationsRouter = express.Router(); // eslint-disable-line new-cap

/**
 * Add app, device and timestamp info to db if not already added and return indexes
 * @param {String} appId Application id
 * @param {String} devId Device id
 * @param {String} timestamp Timestamp of package
 * @param {Object} data Full package json
 * @returns {Object} appIndex, devIndex and packageIndex
 */
async function addPackageToDB(appId, devId, timestamp, data) {
	// Add app and get index in db
	const appIndex = (await pool.query(`
BEGIN
	IF NOT EXISTS (
			SELECT id FROM APPLICATION_IDS
			WHERE app_id = '${appId}'
		)
	BEGIN
		INSERT INTO APPLICATION_IDS (app_id)
		VALUES ('${appId}')
	END
	ELSE
	BEGIN
		SELECT id FROM APPLICATION_IDS
		WHERE app_id = '${appId}'
	END
END
`)).recordset[0].id;

	// Add device and get index in db
	const devIndex = (await pool.query(`
BEGIN
	IF NOT EXISTS (SELECT ID FROM DEVICE_IDS WHERE dev_id LIKE '${devId}' AND app_id IN (SELECT id FROM APPLICATION_IDS WHERE APPLICATION_IDS.app_id = '${appId}'))
	BEGIN
		INSERT INTO DEVICE_IDS (app_id, dev_id)
		VALUES ('${appIndex}', '${devId}')
	END
	ELSE
	BEGIN
		SELECT id FROM DEVICE_IDS WHERE dev_id LIKE '${devId}' AND app_id IN (SELECT id FROM APPLICATION_IDS WHERE APPLICATION_IDS.app_id = '${appId}')
	END
END
`)).recordset[0].id;

	timestamp = util.truncateTimestampForMySQL(timestamp);

	// Add package and get index in db
	await pool.query(`INSERT INTO PACKAGES (dev_id, timestamp, package_content) VALUES ('${devIndex}', '${timestamp}', '${JSON.stringify(data)}')`);
}

integrationsRouter.post('/', async (req, res, next) => {
	try {
		// Get data from body
		const data = req.body;
		// Extract props that are used
		const {app_id: appId, dev_id: devId, metadata} = data;
		const {time: timestamp} = metadata;

		await addPackageToDB(appId, devId, timestamp, data);

		res.send('ok');
	} catch (error) {
		console.error(error);
		next(error);
	}
});

module.exports = integrationsRouter;
