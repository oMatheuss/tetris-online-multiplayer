const mysql = require('mysql2/promise');

let usr, pwd, hst, db;

//mysql usuario e senha
if (process.env.DEVELOPMENT === 'FALSE') {
	usr = process.env.CLEARDB_DATABASE_URL.split("/")[2].split(":")[0];
	[pwd, hst] = process.env.CLEARDB_DATABASE_URL.split("/")[2].split(":")[1].split("@");
	db = process.env.CLEARDB_DATABASE_URL.split("/")[3].split("?")[0];
} else {
	[usr, pwd, hst, db] = ['root', 'root', 'localhost', 'db_projetofinal'];
}

module.exports = {
	async searchByNickname(nick) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		const result = await connection.query("select * from tb_usuarios where nickname like '" + nick + "'");
		connection.end();
		return result[0];
	},

	async searchById(id) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		const result = await connection.query("select * from tb_usuarios where id = " + id);
		connection.end();
		return result[0];
	},

	async getTop10() {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		const result = await connection.query("select nickname, points from tb_usuarios order by points desc limit 10");
		connection.end();
		return result[0];
	},

	async getUserPointsAndRank(id) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		const result = await connection.query("select R.points, R.rank from (select id, points, @rank := @rank  + 1 as 'rank' from tb_usuarios, (select @rank := 0) a order by points desc) as R where R.id="+id);
		connection.end();
		return result[0][0];
	},

	async addToUserPoints(id, points) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		if (points < 0) {
			const result = await connection.query("select points from tb_usuarios where id = " + id);
			if (0 == result[0][0].points) {
				return;
			} else if ((result[0][0].points - points) <= 0) {
				await connection.execute("update tb_usuarios set points = points - "+result[0][0].points+" where id = " + id);
			}
		}
		
		await connection.execute("update tb_usuarios set points = points + "+points+" where id = " + id);
		connection.end();
	},

	async registerUser(nick, passwd) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		await connection.execute("insert into tb_usuarios (nickname, password) values ('"+nick+"','"+passwd+"')");
		connection.end();
	},
	
	async deleteUser(id) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			host: hst,
			database: db
		});
		await connection.execute("delete from tb_usuarios where id = " + id);
		connection.end();
	}
}