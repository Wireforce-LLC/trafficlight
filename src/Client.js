const {$configurator} = require("./config");
const {MongoClient} = require("mongodb");

class Client {
	static useClient() {
		const url = `mongodb://${$configurator.get('databases.mongodb.ip', '127.0.0.1')}:${$configurator.get('databases.mongodb.port', '27017')}`;
		return new MongoClient(url);
	}
}

module.exports = {Client}