const mysql = require('mysql2/promise');
//mysql usuario e senha
const usr = 'default';
const pwd = '123';


module.exports = {
	async searchByNickname(nick) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			database: 'db_projetofinal'
		});
		const result = await connection.query("select * from tb_usuarios where nickname like '" + nick + "'");
		connection.end();
		return result[0];
	},

	async searchById(id) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			database: 'db_projetofinal'
		});
		const result = await connection.query("select * from tb_usuarios where id = " + id);
		connection.end();
		return result[0];
	},

	async getTop10() {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			database: 'db_projetofinal'
		});
		const result = await connection.query("select nickname, points from tb_usuarios order by points desc limit 10");
		connection.end();
		return result[0];
	},

	async getUserPointsAndRank(id) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			database: 'db_projetofinal'
		});
		const result = await connection.query("select R.points, R.rank from (select id, points, rank() over w as 'rank' from tb_usuarios WINDOW w as (order by points desc)) as R where R.id= "+id);
		connection.end();
		return result[0][0];
	},

	async addToUserPoints(id, points) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			database: 'db_projetofinal'
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
			database: 'db_projetofinal'
		});
		await connection.execute("insert into tb_usuarios (nickname, password) values ('"+nick+"','"+passwd+"')");
		connection.end();
	},
	
	async deleteUser(id) {
		var connection = await mysql.createConnection({
			user: usr,
			password: pwd,
			database: 'db_projetofinal'
		});
		await connection.execute("delete from tb_usuarios where id = " + id);
		connection.end();
	}
}
