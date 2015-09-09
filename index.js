//var Promise = require("bluebird");
var Sealious = require("sealious");
var Mysql = require("mysql");
var data = require("./authentication.js");
//var DbsCommonPart = require('sealious-datastore-dbs-common-part');

var DatastoreMysql  = new Sealious.ChipTypes.Datastore("mysql");

Sealious.ConfigManager.set_default_config(
	"datastore_mysql", 
	data
);

DatastoreMysql.start = function(){
	var config = Sealious.ConfigManager.get_config("datastore_mysql");

	//console.log("jak wygląda config: ",config);

	var mysql_client = Mysql.createConnection(config);
	mysql_client.connect();

	/*return new Promise(function(resolve, reject){
		mysql_client.open(function(err, mongoClient){
			private.db = mongoClient.db(config.db_name);
			resolve();
		});
	});	*/
	mysql_client.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
		if (err) throw err;
		console.log('The solution is: ', rows[0].solution);
	});

	//connection.end();
}


DatastoreMysql.start();

//DatastoreMysql = DbsCommonPart(DatastoreMysql,private);		

//module.exports = DatastoreMysql;