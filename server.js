const express = require('express');
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const socketioJwt = require('socketio-jwt');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const dao = require("./src/UserDao");

const app = express();

const port = 8081;
const server = app.listen(process.env.PORT || port, () => {
	console.log("listening on port 8081!");
});

app.use(bodyParser.json());

const io = socketio(server);

const jwtSecret = process.env.jwt_secret;

//express

app.use('/static', express.static(__dirname + '/public'));
app.use('/favicon.ico', express.static(__dirname + '/public/favicon.ico'));
app.set("view engine", "ejs");

app.use(cookieParser());

app.get('/', async function(request, response) {
	var token = request.cookies.token;
	
	var t10 = await dao.getTop10();
	
	if (typeof token !== "undefined") {
		try {
			var decoded = jwt.verify(token, jwtSecret);
			var p = await dao.getUserPointsAndRank(decoded.id);
			decoded['points'] = p.points;
			decoded['rank'] = p.rank;
			
			return response.status(200).render("index.ejs", {top10: t10, user: decoded});
			
		} catch(err) {
			console.log(err);
			return response.status(403).cookie("token", token, {maxAge: 0}).render("index.ejs", {top10: t10});
		}
	} else {
		return response.status(200).render("index.ejs", {top10: t10});
	}
});

app.post('/login', async function(request, response) {
	
	var nick = request.body.nickname;
	var pwd = request.body.password;
	
	var profile = { id: 0, nickname: '' };
	
	var result = await dao.searchByNickname(nick);
	
	if (result.length == 0 || typeof result === "undefined") {
		return response.status(403).send({
			message: 'Usuario não existente!'
		});
	} else {
		if (pwd === result[0]["password"]) {
			profile.nickname = result[0]["nickname"];
			profile.id = result[0]["id"];
		} else {
			return response.status(403).send({
				message: 'Senha incorreta!'
			});
		}
	}
	// mandando de volta o token
	var token = jwt.sign(profile, jwtSecret, { expiresIn: 60*30 });

	return response.cookie("token", token).sendStatus(200);
});

app.get('/logout', function(request, response) {
	var token = request.cookies.token;
	
	if (typeof token !== "undefined") {
		return response.cookie("token", token, {maxAge: 0}).redirect("/");
	}
	response.redirect("/");
});

app.get('/deleteUser', async function(request, response) {
	var token = request.cookies.token;
	
	if (typeof token !== "undefined") {
		try {
			var decoded = jwt.verify(token, jwtSecret);
			await dao.deleteUser(decoded.id);
			return response.status(200).cookie("token", token, {maxAge: 0}).redirect("/");
			
		} catch(err) {
			//console.log(err);
			return response.status(403).send({
				message: 'Faça login novamente!',
				redirect: '/'
			});
		}
	} else {
		return response.status(403).send({
			message: 'Não Autorizado!'
		});
	}
});

app.post('/register', async function(request, response) {
	var nick = request.body.nickname;
	var pwd = request.body.password;
	
	if (typeof nick === undefined || "" === nick || nick.length < 3) {
		return response.status(400).send({
			message: 'O nickname deve conter ao menos 3 caracteres!'
		});
	}
	
	if (typeof pwd === undefined || "" === pwd || pwd.length < 4) {
		return response.status(400).send({
			message: 'A senha deve conter ao menos 5 caracteres!'
		});
	}
	
	var result = await dao.searchByNickname(nick);
	
	if (result.length == 0) {
		await dao.registerUser(nick, pwd);
		
		var result = await dao.searchByNickname(nick);
		var profile = {
			nickname: result[0]["nickname"],
			id: result[0]["id"]
		};
		var token = jwt.sign(profile, jwtSecret, { expiresIn: 60*30 });

		return response.cookie("token", token).sendStatus(200);
	}
	
	return response.status(400).send({
		message: 'Usuario já existente!'
	});
	
});

app.get('/jogar', async function(request, response) {
	var token = request.cookies.token;
	
	if (typeof token !== "undefined") {
		try {
			var decoded = jwt.verify(token, jwtSecret);
			return response.status(200).render("game.ejs", {user: decoded});
		} catch(err) {
			return response.status(400).cookie("token", token, {maxAge: 0}).redirect("/");
		}
	} else {
		return response.sendStatus(403);
	}
});

app.get('/treino', function(request, response) {
	
	return response.status(200).render("solo-game.ejs");
});

//websocket connection

io.of("/jogar").use(socketioJwt.authorize({
	secret: jwtSecret,
	handshake: true
}));

var matches = [];
var roomUser = [];
var count = 0;

io.of("/jogar").on('connection', (socket) => {
	console.log('hello!', socket.decoded_token.nickname);
	
	socket.once('join game', () => {
		//verifica se há uma sala disponivel (com apenas um player)
		
		let foundRoom = false;
		for (let room in matches) {
			if (typeof matches[room].player2 === "undefined") {
				matches[room].player2 = {id: socket.decoded_token.id, score: 0, lost: false, socket: socket};
				matches[room].length = 2;
				socket.join(room);
				roomUser[socket.decoded_token.id] = room;
				socket.emit('start room', room);
				console.log(room);
				
				foundRoom = true;
			}
		}
		
		//cria uma nova sala e insere o socket como player1
		if (!foundRoom) {
			room = "room-" + count++;
			socket.join(room);
			matches[room] = {
				player1: {id: socket.decoded_token.id, score: 0, lost: false, socket: socket},
				length: 1,
				started: false
			};
			roomUser[socket.decoded_token.id] = room;
			socket.emit('start room', room);
			console.log(room);
		}
		
		socket.onAny((eventName, ...args) => {
			if (typeof args[0] === "undefined" || typeof matches[args[0]] === "undefined") {
				socket.removeAllListeners();
			}
		});
		
		socket.on("ready", (room) => {
			if (2 == matches[room].length) {
				if (matches[room].player1.id == socket.decoded_token.id) {
					if (typeof matches[room].player2 === "undefined") return;
					
					matches[room].player2.socket.emit('ready', (isReady) => {
						if (isReady) {
							io.of("/jogar").to(room).emit('startar');
							matches[room].started = true;
						}
					});
				} else {
					if (typeof matches[room].player1 === "undefined") return;
					
					matches[room].player1.socket.emit('ready', (isReady) => {
						if (isReady) {
							io.of("/jogar").to(room).emit('startar');
							matches[room].started = true;
						}
					});
				}
			}
		});
		
		socket.on('score', (room, t) => {
			if (matches[room].player1.id === socket.decoded_token.id) {
				matches[room].player1.score = t;
			} else {
				matches[room].player2.score = t;
			}
			socket.to(room).emit('score', t);
		});
		
		socket.on('attArray', (room, t) => {
			socket.to(room).emit('attArray', t);
		});
		
		socket.on('newBrick', (room, t) => {
			socket.to(room).emit('newBrick', t);
		});
		socket.on('down', (room) => {
			socket.to(room).emit('down');
		});
		socket.on('left', (room) => {
			socket.to(room).emit('left');
		});
		socket.on('right', (room) => {
			socket.to(room).emit('right');
		});
		socket.on('rotate', (room) => {
			socket.to(room).emit('rotate');
		});
		
		socket.on('lost', (room) => {
			if (matches[room].player1.id === socket.decoded_token.id) {
				matches[room].player1.lost = true;
				console.log(matches[room].player1.score);
			} else {
				matches[room].player2.lost = true;
				console.log(matches[room].player2.score);
			}
			
			if (matches[room].player1.lost && matches[room].player2.lost) {
				if (matches[room].player1.score > matches[room].player2.score) {
					dao.addToUserPoints(matches[room].player1.id, 30);
					dao.addToUserPoints(matches[room].player2.id, -20);
					matches[room].player1.socket.emit('end', 1);
					matches[room].player2.socket.emit('end', -1);
					
					
				} else if (matches[room].player1.score < matches[room].player2.score) {
					dao.addToUserPoints(matches[room].player1.id, -20);
					dao.addToUserPoints(matches[room].player2.id, 30);
					matches[room].player1.socket.emit('end', -1);
					matches[room].player2.socket.emit('end', 1);
					
				} else {
					matches[room].player1.socket.emit('end', 0);
					matches[room].player2.socket.emit('end', 0);
				}
				
				matches[room].player1.socket.removeAllListeners();
				matches[room].player2.socket.removeAllListeners();
				delete matches[room];
			}
		});
	});

	socket.on('disconnect', () => {
		console.log('bye!', socket.decoded_token.nickname);
		
		if (typeof roomUser[socket.decoded_token.id] !== "undefined") {
			let room = roomUser[socket.decoded_token.id];
			
			//se a partida não começou
			if (!matches[room].started) {
				if (1 == matches[room].length) {
					delete matches[room];
				} else {
					if (matches[room].player1.id === socket.decoded_token.id) {
						matches[room].player1 = matches[room].player2;
					}
					delete matches[room].player2;
				}
			} else {
				//se o jogador desconectou, mas a partida ainda existe
				if (matches[room]) {
					if (matches[room].player1.id === socket.decoded_token.id) {
						matches[room].player1.lost = true;
					} else {
						matches[room].player2.lost = true;
					}
				}
			}
			
			delete roomUser[socket.decoded_token.id];
		}
	});
});
