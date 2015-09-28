var Promise = require("bluebird");
var Mysql = require("mysql");

var Crud = function(datastore,mysql_client){

	datastore.insert = function(table_name, to_insert, options){		
		var sql = "INSERT INTO ?? SET ?";		//chyba lepiej zapisać to w 1 linijce?
		var inserts = [table_name, to_insert];
		sql = mysql_client.format(sql, inserts);

		return new Promise(function(resolve, reject){
			//mysql_client.query("INSERT INTO ?? SET ?",[table_name, to_insert], function(err, inserted){
			mysql_client.query(sql, function(err, insert_response){
				if (err) {
					reject(err);
				} else {
					console.log("wstawiono dane kwerendą: "+ sql);
					resolve(insert_response);
				}
			})
		})
	}

	datastore.update = function(table_name, query, new_value){
		var sql = "UPDATE ?? SET ?";
		var updates = [table_name, new_value];
		sql = mysql_client.format(sql, updates);

		var where = "";
		if(query!=""){
			where = " WHERE ?";
			where = mysql_client.format(where, query).replace(/,/g," AND");
		}
		sql += where;

		return new Promise(function(resolve, reject){
			mysql_client.query(sql, function(err, update_response) {
				if (err) {
					reject(err);
				} else {
					console.log("zaktualizowano dane kwerendą: "+ sql);
					resolve(update_response);
				}
			})
		})
	}

	datastore.find = function(table_name, query, options, output_options){	//czo to options?
		var sql = "SELECT * FROM "+ table_name;

		var where = "";
		if(query!=""){
			where = " WHERE ?";
			where = mysql_client.format(where, query).replace(/,/g," AND");
		}
		sql += where;

		if (typeof output_options.sort !== "undefined") {
			sql += " ORDER BY " + output_options.sort;
		}

		if (typeof output_options.skip !== "undefined" && typeof output_options.amount !== "undefined") {
			sql += " LIMIT " + output_options.skip + ", " + output_options.amount;
		}
		else if (typeof output_options.skip !== "undefined") {
			sql += " LIMIT " + output_options.skip + ", 18446744073709551615";
		}
		else if (typeof output_options.amount !== "undefined") {
			sql += " LIMIT " + output_options.amount;
		}
		//sql += ";";
		console.log(sql);

		return new Promise(function(resolve, reject){
			mysql_client.query(sql, function(err, find_response) {
				if (err) {
					reject(err)
				} else {
					console.log(find_response);
					resolve(find_response);
				}
			})
		})
	}

	datastore.remove = function(table_name, query, just_one){
		var sql = "DELETE FROM "+ table_name;

		var where = "";
		if(query!=""){
			where = " WHERE ?";
			where = mysql_client.format(where, query).replace(/,/g," AND");
		}
		sql += where;

		if(just_one!==undefined){
			if(just_one){
				sql += " LIMIT 1"
			}
		}

		return new Promise(function(resolve, reject){
			mysql_client.query(sql, function(err, delete_response) {
				if (err) {
					reject(err);
				} else {
					console.log("po usunięciu ",sql);
					resolve(delete_response);
				}
			})			
		})
	}
}


module.exports = Crud;
