var Promise = require("bluebird");
var Sealious = require("sealious");
var Mysql = require("mysql");
var data = require("./auth.js");
var crudFunctions = require("./crud.js");

var mysql_client = null;

var DatastoreMysql  = new Sealious.ChipTypes.Datastore("mysql");

Sealious.ConfigManager.set_default_config("datastore_chip_name", data);

DatastoreMysql.start = function(){
	var config = Sealious.ConfigManager.get_config("datastore_chip_name");

	mysql_client = Mysql.createConnection(config);
	mysql_client.connect();

	return this.rebuild_database_schema();
}	

DatastoreMysql.create_database_if_not_exist = function(db_name){
	return new Promise(function(resolve, reject){
		var sql_query = 'CREATE DATABASE IF NOT EXISTS ??';
		mysql_client.query(sql_query, [db_name], function(err, rows, fields) {
			if (err) {
				reject(err);
				return;
			}
			console.log("Jestem po stworzeniu bazy danych: ", db_name);
			resolve(db_name);
		})
	})
}

DatastoreMysql.use_db = function(db_name){
	return new Promise(function(resolve, reject){
		mysql_client.query('USE ??',[db_name], function(err, rows) {
			if (err) {
				reject(err);
				return;
			}
			console.log("Jestem po użyciu bazy danych: ", db_name);
			resolve();			
		});
	})	
}

DatastoreMysql.create_table_query = function(resource_type){
	var self = this;
	var table_name = resource_type.name;

	var query = "CREATE TABLE IF NOT EXISTS " + table_name + " (";
	query += "id VARCHAR(10), ";
	for (var i in resource_type.fields) {
		query += "body_" + resource_type.fields[i].name + " ";
		query += self.get_column_type(resource_type.fields[i].type_name) + ", ";
	}
	//remove last comma 
	query = query.substring(0, query.length-2) + ");";
	return query;
}

DatastoreMysql.execute_query = function(query_string){
	return new Promise(function(resolve, reject){
		mysql_client.query(query_string, function(err, rows, fields){
			if (err) {
				reject(err);
				return;
			}
			console.log("Jestem po wykonaniu kwerendy ",query_string);
			resolve();
		});
	})
}

DatastoreMysql.create_necessary_table = function(db_name, resource_type){
	var query = this.create_table_query(resource_type);
	return this.execute_query(query);
}

DatastoreMysql.get_table_schema = function(db_name, table_name){
	return new Promise(function(resolve, reject){
		mysql_client.query("SELECT column_name, column_type FROM information_schema.columns WHERE table_schema = '" + db_name + "' AND table_name='" + table_name + "'", function(err, rows, fields) {
			resolve(rows);
		})		
	})
}

DatastoreMysql.add_column_to_table = function(db_name, table_name, column_name, column_type){
	var query = "ALTER TABLE " + table_name + " ADD COLUMN " + column_name + " " + column_type;
	return this.execute_query(query);
}

DatastoreMysql.change_column_type = function(db_name, table_name, column_name, new_column_type){
	var query = "ALTER TABLE " + table_name + " MODIFY COLUMN " + column_name + " " + new_column_type;
	return this.execute_query(query);
}

DatastoreMysql.get_column_type = function(field_type){
	var column_type;
	switch(field_type) {
		case "int":
			column_type = "INT";
			break;
		case "float":
			column_type = "FLOAT";
			break;
		default:
			column_type = "VARCHAR(255)";
	}
	return column_type;
}

DatastoreMysql.fix_table_for_resource_type = function(db_name, resource_type){
	var self = this;
	return self.get_table_schema(db_name, resource_type.name)
	.then(function(schema){
		var all_promises = [];

		var column_names = schema.map(function(value){ 
			return value.column_name; 
		});

		for (var i in resource_type.fields) {
			var field = resource_type.fields[i];
			var table_name = resource_type.name;
			var field_type = field.type_name;
			//set column name
			var column_name = "body_" + field.name;
			
			if (column_names.indexOf(column_name) == -1){
				//set column type by changing to equivalent in MySQL
				var column_type = self.get_column_type(field_type);
				//add new column
				var promise = self.add_column_to_table(db_name, table_name, column_name, column_type);
				all_promises.push(promise);
			} else {
				//get column type from db
				var column_type_in_db = schema
				.filter(function(value){ return (value.column_name == column_name)})
				.map(function(value){ return value.column_type; })[0];

				var type_map = {
					"int(11)": "int",
					"float": "float",
					"varchar(255)": "text"
				}

				//if column type in db is diffrent from field type in schema
				if(type_map[column_type_in_db]!=field_type){
					var new_column_type = self.get_column_type(field_type);
					
					if(new_column_type.toLowerCase() != column_type_in_db){
						var promise = self.change_column_type(db_name, table_name, column_name, new_column_type);;
						all_promises.push(promise);
					}
				}
			}
		}
		return Promise.all(all_promises);
	});
}

DatastoreMysql.rebuild_database_schema = function(){
	var self = this;
	var db_name = "my_db";
	var resource_types = Sealious.ChipManager.get_chips_by_type("resource_type");

	return self.create_database_if_not_exist(db_name)
	.then(function(){
		return self.use_db(db_name);
	})
	.then(function(){
		var fix_table_promises = [];

		for(var i in resource_types){
			var resource_type = resource_types[i];
			var promise = self.create_necessary_table(db_name, resource_type);
			fix_table_promises.push(promise);
		}
		return Promise.all(fix_table_promises);
	})
	.then(function(){
		var fix_table_promises = [];

		for(var i in resource_types){
			var resource_type = resource_types[i];
			var promise = self.fix_table_for_resource_type(db_name, resource_type);
			fix_table_promises.push(promise);
		}
		return Promise.all(fix_table_promises);
	})
	/*.then(function(){
		//return self.insert("students",{name: "Marek", age: 12})
		//return self.update("students",{name: "Marek", age: 12},{age:15});
		//return self.find("students",{body.age:15});
		return self.remove("students",{age:15},1);
	})*/
	.then(function(){
		mysql_client.end();
		console.log("Już po wszystkim!!!");
		return Promise.resolve();
	})
};

	/*	TO-DO
		sprawdzić czy istnieje tabela
			jesli tak, to sprawdź czy jest kolumna (show fields from places)
				jesli tak, to sprawdź jej typ
					jesli jest inny, to: (alter table_name modify column_name)
					 (tu musi być catch)
				jesli nie, to ją dodaj
			jesli nie, to utwórz: CREATE TABLE IF NOT EXISTS 

		Co ze sprawdzaniem czy kolumna już istnieje?

	*/
crudFunctions(DatastoreMysql,mysql_client);		

module.exports = DatastoreMysql;

//Sealious.init();
//DatastoreMysql.test_compatibility();