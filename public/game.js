function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// 1. Wait for the onload even
window.addEventListener("load", function() {

	var socket = io("/jogar", {
		query: 'token=' + getCookie('token')
	});
	
	var roomID = window.sessionStorage.getItem('roomID');
	var player1 = "";
	var player2 = "";
	
	//width: 750, height: 1000
	var Q = window.Q = Quintus({ development: true })
		  .include("Sprites, Scenes, Input, 2D, Touch, UI")
		  .setup({ width: 750, height: 600, maximize: "touch", scaleToFit: true }).touch();
	
	
	//define botoes
	Q.input.touchControls({
	  controls:  [ ['left','←' ], ['down','↓' ], ['right','→' ], [], ['action','⥁'], ['fire', '↓↓' ]]
	});
	
	var started = false;

	Q.input.keyboardControls();

	Q.ctx.canvas.style.backgroundColor = "rgb(222, 226, 230, 1)";

	Q.gravityX = 0;
	Q.gravityY = 0;

	gridScreenSize = { w: 300, h: 600 };
	gridSize = { w: 10, h: 20 };
	pieceSize = { w: gridScreenSize.w/gridSize.w, h: gridScreenSize.h/gridSize.h };
	
	//x <= min && x >= max
	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	Q.Sprite.extend("Grid",{
		
		init: function(gridPos) {
			this._super({
				color: "rgb(3, 4, 94)",
				x: gridPos.x,
				y: gridPos.y,
				w: gridScreenSize.w,
				h: gridScreenSize.h,
			});
		},

		draw: function(ctx) {
			//bottom left corner
			let blf = { x: -this.p.cx, y: this.p.cy };
			let size = { w: this.p.w, h: this.p.h };
			
			ctx.strokeStyle = this.p.color;
			ctx.lineWidth = 1;
			
			ctx.beginPath();
			
			for (let i = 0; i <= gridSize.h; i++) {
				ctx.moveTo(blf.x, blf.y - i * pieceSize.h);
				ctx.lineTo(blf.x + size.w, blf.y - i * pieceSize.h);
			}
			
			for (let i = 0; i <= gridSize.w; i++) {
				ctx.moveTo(blf.x + i * pieceSize.w, blf.y);
				ctx.lineTo(blf.x + i * pieceSize.w, blf.y - size.h);
			}
			
			ctx.stroke();
		}
	});
	
	//Player 1
	
	Q.Sprite.extend("Piece",{
		
		init: function(gridPos, posX, posY, color) {
			this._super({
				w: pieceSize.w,
				h: pieceSize.h,
			});
			this.x = 0;
			this.y = 0;
			this.gridPos = gridPos;
			this.setPos(posX, posY);
			this.drawPoints = [-this.p.cx + 1, -this.p.cy + 1, this.p.w - 2, this.p.h - 2];
			this.color = color;
			this.setColors(color);
		},
		
		setColors: function(t) {
			switch (t) {
				case 1:
					this.p.color = "rgb(220, 20, 60, 1)"; //vermelho
					this.borderColor = "rgb(139,0,0)";
					break;
				case 2:
					this.p.color = "rgb(255, 140, 0, 1)"; //laranja
					this.borderColor = "rgb(255,69,0)";
					break;
				case 3:
					this.p.color = "rgb(106, 153, 78, 1)"; //verde
					this.borderColor = "rgb(56, 102, 65)";
					break;
				case 4:
					this.p.color = "rgb(90, 24, 154, 1)"; //roxo
					this.borderColor = "rgb(60, 9, 108)";
					break;
				case 5:
					this.p.color = "rgb(3, 83, 164, 1)"; //azul
					this.borderColor = "rgb(2, 62, 125)";
					break;
				case 6:
					this.p.color = "rgb(255, 71, 126, 1)"; //rosa
					this.borderColor = "rgb(255, 10, 84)";
					break;
				case 7:
					this.p.color = "rgb(114, 81, 181, 1)"; //roxo?
					this.borderColor = "rgb(98, 71, 170)";
					break;
				default:
					this.p.color = "red";
					this.borderColor = "red";
			}
		},
		
		setPos: function(posX, posY) {
			this.x = posX;
			this.y = posY;
			this.p.x = this.gridPos.x - gridScreenSize.w/2 + pieceSize.w/2 + posX * pieceSize.w;
			this.p.y = this.gridPos.y + gridScreenSize.h/2 - pieceSize.h/2 - posY * pieceSize.h;
		},
		
		down: function() {
			this.y -= 1;
			this.p.y += pieceSize.h;
		},
		
		left: function() {
			this.x -= 1;
			this.p.x -= pieceSize.w;
		},
		
		right: function() {
			this.x += 1;
			this.p.x += pieceSize.w;
		},

		draw: function(ctx) {
			ctx.fillStyle = this.p.color;
			ctx.fillRect(this.drawPoints[0], this.drawPoints[1], this.drawPoints[2], this.drawPoints[3]);
			ctx.lineWidth = 1;
			ctx.strokeStyle = this.borderColor;
			ctx.strokeRect(this.drawPoints[0], this.drawPoints[1], this.drawPoints[2], this.drawPoints[3]);
		}
	});
	
	Q.Sprite.extend("Brick",{
		init: function(stage, gridPos, gameArray, type) {
			this._super({});
			this.stage = stage;
			this.gridPos = gridPos;
			this.gameArray = gameArray;
			this.pieces = new Array(4);
			this.createBrick(type);
		},
		
		createBrick: function(type) {
			if (type == 1) {
				//2x2
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 5, 21, 1));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 4, 21, 1));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 5, 20, 1));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 4, 20, 1));
				
				this.pivot = { x: 4.5, y: 20.5 };
			} else if (type == 2) {
				//J
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 3, 21, 2));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 3, 20, 2));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 4, 20, 2));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 5, 20, 2));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 3) {
				//L
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 3, 20, 3));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 4, 20, 3));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 5, 20, 3));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 5, 21, 3));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 4) {
				//|
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 3, 21, 4));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 4, 21, 4));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 5, 21, 4));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 6, 21, 4));
				
				this.pivot = { x: 4.5, y: 20.5 };
			} else if (type == 5) {
				// A
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 3, 20, 5));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 4, 20, 5));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 5, 20, 5));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 4, 21, 5));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 6) {
				// S
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 3, 20, 6));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 4, 20, 6));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 4, 21, 6));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 5, 21, 6));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 7) {
				// Z
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 3, 21, 7));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 4, 21, 7));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 4, 20, 7));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 5, 20, 7));
				
				this.pivot = { x: 4, y: 20 };
			}
		},
		
		downTime: 1,
		elapsed: 0,
		moveDown: function(dt) {
			this.elapsed += dt;
			
			if (this.elapsed >= this.downTime) {
				for (let i = 0; i < 4; i ++) {
					if (this.pieces[i].y == 0) {
						return -1;
					} else if (this.pieces[i].y - 1 < 20) {
						if (this.gameArray[this.pieces[i].x][this.pieces[i].y -1].exist) {
							return -1;
						}
					}
				}
				for (let i = 0; i < 4; i ++) {
					this.pieces[i].down();
				}
				this.pivot.y -= 1;
				this.elapsed = 0;
				return 1;
			}
			return 0;
		},
		
		elapsedRL: 0,
		moveLeft: function() {
			if (this.elapsedRL > 0.1) {
				for (let i = 0; i < 4; i ++) {
					if (this.pieces[i].x == 0) {
						return false;
					} else if (this.pieces[i].y < 20) {
						if (this.gameArray[this.pieces[i].x -1][this.pieces[i].y].exist) {
							return false;
						}
					}
				}
				for (let i = 0; i < 4; i ++) {
					this.pieces[i].left();
				}
				this.pivot.x -= 1;
				this.elapsedRL = 0;
				return true;
			}
			return false;
		},
		
		moveRight: function() {
			if (this.elapsedRL > 0.1) {
				for (let i = 0; i < 4; i ++) {
					if (this.pieces[i].x == 9) {
						return false;
					} else if (this.pieces[i].y < 20) {
						if (this.gameArray[this.pieces[i].x +1][this.pieces[i].y].exist) {
							return false;
						}
					}
				}
				for (let i = 0; i < 4; i ++) {
					this.pieces[i].right();
				}
				this.pivot.x += 1;
				this.elapsedRL = 0;
				return true;
			}
			return false;
		},
		
		rotate: function() {
			for (let i = 0; i < 4; i++) {
				let newX = this.pivot.x + this.pivot.y - this.pieces[i].y;
				let newY = this.pivot.y - this.pivot.x + this.pieces[i].x;
				
				if (newX < 0 || newX > 9 || newY < 0) {
					return false;
				}
				
				if (newY < 20) {
					if (this.gameArray[newX][newY].exist) {
						return false;
					}
				}
			}
			
			for (let i = 0; i < 4; i++) {
				this.pieces[i].setPos(this.pivot.x + this.pivot.y - this.pieces[i].y,
									  this.pivot.y - this.pivot.x + this.pieces[i].x
				);
			}
			return true;
		},
		
		saveOnGameArray: function() {
			let allSaved = true;
			for (let i = 0; i < 4; i++) {
				if (this.pieces[i].x >= 0 && this.pieces[i].x <= 9) {
					if (this.pieces[i].y >= 0 && this.pieces[i].y <= 19) {
						this.gameArray[this.pieces[i].x][this.pieces[i].y].exist = true;
						this.gameArray[this.pieces[i].x][this.pieces[i].y].piece = this.pieces[i];
					} else {
						allSaved = false;
					}
				}
			}
			
			return allSaved;
		},
		
		step: function(dt) {
			this.elapsedRL += dt;
		}
	});
	
	Q.Sprite.extend("BrickStatic",{
		
		init: function(stage, gridPos, type) {
			this._super({});
			this.gridPos = gridPos;
			this.stage = stage;
			this.type = type;
			this.pieces = new Array(4);
			this.createBrick(type);
			
		},
		
		createBrick: function(type) {
			if (type == 1) {
				//2x2
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 1, 19, 1));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 0, 19, 1));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 1, 18, 1));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 0, 18, 1));
			} else if (type == 2) {
				//J
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 0, 19, 2));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 0, 18, 2));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 1, 18, 2));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 2, 18, 2));
			} else if (type == 3) {
				//L
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 0, 18, 3));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 1, 18, 3));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 2, 18, 3));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 2, 19, 3));
			} else if (type == 4) {
				//|
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 0, 19, 4));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 1, 19, 4));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 2, 19, 4));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 3, 19, 4));
			} else if (type == 5) {
				// A
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 0, 18, 5));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 1, 18, 5));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 2, 18, 5));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 1, 19, 5));
			} else if (type == 6) {
				// S
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 0, 18, 6));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 1, 18, 6));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 1, 19, 6));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 2, 19, 6));
			} else if (type == 7) {
				// Z
				this.pieces[0] = this.stage.insert(new Q.Piece(this.gridPos, 0, 19, 7));
				this.pieces[1] = this.stage.insert(new Q.Piece(this.gridPos, 1, 19, 7));
				this.pieces[2] = this.stage.insert(new Q.Piece(this.gridPos, 1, 18, 7));
				this.pieces[3] = this.stage.insert(new Q.Piece(this.gridPos, 2, 18, 7));
			}
		},
		
		_destroy() {
			for (let i = 0; i < 4; i++) {
				this.pieces[i].destroy();
			}
		},
	
		moveDown: function() {
			for (let i = 0; i < 4; i++) {
				for (let j =0; j < 3; j++) {
					this.pieces[i].down();
				}
			}
		}
	});
	
	Q.Sprite.extend("BrickGen", {
		//propiedades declaradas aqui (fora da função) ficam estaticas
		
		init: function(stage, gridPos) {
			this._super({});
			this.gridPos = {x: gridPos.x + gridScreenSize.w + 10, y: gridPos.y};
			this.stage = stage;
			this.bricks = new Array(3);
			this.gen();
		},
		
		gen: function() {
			for (let i = 0; i < 3; i++) {
				let randomT = getRandomInt(1, 7);
				this.bricks[i] = {'brick': undefined, 'type': randomT};
			}
			
			for (let i = 0; i < 3; i++) {
				this.bricks[i]['brick'] = this.stage.insert(new Q.BrickStatic(this.stage, this.gridPos, this.bricks[i].type));
				for (let j = 0; j < 2-i; j++) {
					this.bricks[i].brick.moveDown();
				}
			}
		},
		
		nextBrick: function() {
			let type = this.bricks[0]['type'];
			
			this.bricks[0]['brick']._destroy();
			this.bricks[0]['brick'].destroy();
			
			for (let i = 0; i < 2; i++) {
				let next = i + 1;
				this.bricks[next]['brick'].moveDown();
				this.bricks[i]['brick'] = this.bricks[next]['brick'];
				this.bricks[i]['type'] = this.bricks[next]['type'];
			}
			
			
			let randomT = getRandomInt(1, 7);
			this.bricks[2]['brick'] = this.stage.insert(new Q.BrickStatic(this.stage, this.gridPos, randomT));
			this.bricks[2]['type'] = randomT;
			
			return type;
		}
	});
	
	Q.Sprite.extend("Controller",{
		
		init: function(stage, gridPos, score, callback) {
			this._super({});
			this.stage = stage;
			
			this.gridPos = gridPos;
			stage.insert(new Q.Grid(gridPos));
			this.brickGen = stage.insert(new Q.BrickGen(stage, gridPos));
			
			this.gameArray = this.createNewGame();
			
			this.score = score;
			this.callback = callback;
			
			//
			
			this.wasClickedDwn = false;
			this.wasClickedRot = false;
			this.wasClickedHd = false;
			this.blockCounter = 1.5;
			this.blockDwn = false;
			this.first = true;
			this.firstElapsed = 1;
			this.lost = false;
		},
		
		createNewGame: function() {
			var g = new Array(gridSize.w);
			for (let i = 0; i < gridSize.w; i++) {
				g[i] = new Array(gridSize.h);
				for (let j = 0; j < gridSize.h; j++) {
					g[i][j] = { exist: false, piece: undefined };
				}
			}
			return g;
		},
		
		replacer: function(key, value) {
			if (key === "piece") {
				if (typeof value !== "undefined" && value != null) {
					return value.color;
				}
				return undefined;
			}
			return value;
		},
		
		createNewBrick: function() {
			let t = this.brickGen.nextBrick();
			socket.emit("newBrick", roomID, t);
			this.actualBrick = this.stage.insert(new Q.Brick(this.stage, this.gridPos, this.gameArray, t));
		},
		
		attGameArray: function() {
			let count = 0;
			//exclui e atualiza uma linha de blocos completa
			for (let i = 0; i < gridSize.h; i++) {
				let complete = true;
				for (let j = 0; j < gridSize.w; j++) {
					if (!this.gameArray[j][i].exist) {
						complete = false;
						break;
					}
				}
				
				if (complete) {
					count++;
					for (let j = 0; j < gridSize.w; j++) {
						this.gameArray[j][i].exist = false;
						this.gameArray[j][i].piece.destroy();
					}
					
					for (let k = i; k < gridSize.h-1; k++) {
						for (let j = 0; j < gridSize.w; j++) {
							if (this.gameArray[j][k+1].exist) {
								this.gameArray[j][k+1].exist = false;
								this.gameArray[j][k+1].piece.down();
								this.gameArray[j][k].exist = true;
								this.gameArray[j][k].piece = this.gameArray[j][k+1].piece;
								this.gameArray[j][k+1].piece = null;
							}
						}
					}
					i--;
				}
			}
			if (count != 0) { this.score.s += 200 * count - 100; }
			let jsonA = JSON.stringify(this.gameArray, this.replacer);
			socket.emit("attArray", roomID, jsonA);
		},
		
		step: function(dt) {
			if (this.first) {
				if (this.firstElapsed > 0) {
					this.firstElapsed -= dt;
					return;
				} else {
					this.createNewBrick();
					this.first = false;
				}
			}
			
			if (this.lost) {
				return;
			}
			
			if (Q.inputs['left']) {
				if(this.actualBrick.moveLeft()) {
					socket.emit("left", roomID);
				}
			}
			
			if (Q.inputs['right']) {
				if (this.actualBrick.moveRight()) {
					socket.emit("right", roomID);
				}
			}
			
			//rotate uma vez por click
			if (Q.inputs['action'] && !this.wasClickedRot) {
				this.wasClickedRot = true;
				if (this.actualBrick.rotate()) {
					socket.emit("rotate", roomID);
				}
			} else if (!Q.inputs['action'] && this.wasClickedRot) {
				this.wasClickedRot = false;
			}
			
			//normal drop
			let movedDown = this.actualBrick.moveDown(dt);
			
			//hard drop
			if (Q.inputs['fire'] && !this.wasClickedHd) {
				this.wasClickedHd = true;
				
				while (this.actualBrick.moveDown(10) != -1) {
					this.score.s += 2;
				}
				moveDown = -1;
				this.blockCounter = 0;
				
			} else if (!Q.inputs['fire'] && this.wasClickedHd) {
				this.wasClickedHd = false;
			}
			
			
			//executa o tempo de fixação e salva na array
			if (movedDown == -1) {
				
				if (this.blockCounter > 0) {
					this.blockCounter -= dt;
					this.blockDwn = true;
				}
				
				if (this.blockCounter <= 0) {
					this.blockDwn = false;
					//salva e verifica se o bloco foi salvo dentro da grid
					if(!this.actualBrick.saveOnGameArray()) {
						this.actualBrick.destroy();
						this.lost = true;
						this.callback();
					} else {
						this.actualBrick.destroy();
						this.attGameArray();
						this.createNewBrick();
					}
					this.blockCounter = 1.5;
				}
			} else if(movedDown == 1) {
				socket.emit("down", roomID);
				//soft drop
				if (this.actualBrick.downTime == 0.05) {
					this.score.s += 1;
				}
			}
			
			//soft drop
			if (Q.inputs['down'] && !this.wasClickedDwn) {
				this.wasClickedDwn = true;
				this.actualBrick.downTime = 0.05;
				if (this.blockDwn) {
					this.blockCounter = 0;
					this.wasClickedDwn = false;
				}
			} else if (!Q.inputs['down'] && this.wasClickedDwn) {
				this.wasClickedDwn = false;
				this.actualBrick.downTime = 1;
			}
		}
		
		//fim da classe
	});

	//Fim Player1
	
	//Player2
	
	Q.Sprite.extend("Piece2",{
		
		init: function(gridPos, posX, posY, color) {
			this._super({
				w: pieceSize.w,
				h: pieceSize.h,
			});
			
			this.x = 0;
			this.y = 0;
			this.gridPos = gridPos;
			this.setPos(posX, posY);
			this.drawPoints = [-this.p.cx + 1, -this.p.cy + 1, this.p.w - 2, this.p.h - 2];
			this.color = color;
			this.setColors(color);
		},
		
		setColors: function(t) {
			switch (t) {
				case 1:
					this.p.color = "rgb(220, 20, 60, 1)"; //vermelho
					this.borderColor = "rgb(139,0,0)";
					break;
				case 2:
					this.p.color = "rgb(255, 140, 0, 1)"; //laranja
					this.borderColor = "rgb(255,69,0)";
					break;
				case 3:
					this.p.color = "rgb(106, 153, 78, 1)"; //verde
					this.borderColor = "rgb(56, 102, 65)";
					break;
				case 4:
					this.p.color = "rgb(90, 24, 154, 1)"; //roxo
					this.borderColor = "rgb(60, 9, 108)";
					break;
				case 5:
					this.p.color = "rgb(3, 83, 164, 1)"; //azul
					this.borderColor = "rgb(2, 62, 125)";
					break;
				case 6:
					this.p.color = "rgb(255, 71, 126, 1)"; //rosa
					this.borderColor = "rgb(255, 10, 84)";
					break;
				case 7:
					this.p.color = "rgb(114, 81, 181, 1)"; //roxo?
					this.borderColor = "rgb(98, 71, 170)";
					break;
				default:
					this.p.color = "red";
					this.borderColor = "red";
			}
		},
		
		setPos: function(posX, posY) {
			this.x = posX;
			this.y = posY;
			this.p.x = this.gridPos.x - gridScreenSize.w/2 + pieceSize.w/2 + posX * pieceSize.w;
			this.p.y = this.gridPos.y + gridScreenSize.h/2 - pieceSize.h/2 - posY * pieceSize.h;
		},
		
		down: function() {
			this.y -= 1;
			this.p.y += pieceSize.h;
		},
		
		left: function() {
			this.x -= 1;
			this.p.x -= pieceSize.w;
		},
		
		right: function() {
			this.x += 1;
			this.p.x += pieceSize.w;
		},

		draw: function(ctx) {
			ctx.fillStyle = this.p.color;
			ctx.fillRect(this.drawPoints[0], this.drawPoints[1], this.drawPoints[2], this.drawPoints[3]);
			ctx.lineWidth = 1;
			ctx.strokeStyle = this.borderColor;
			ctx.strokeRect(this.drawPoints[0], this.drawPoints[1], this.drawPoints[2], this.drawPoints[3]);
		}
	});
	
	Q.Sprite.extend("Brick2",{
		
		init: function(stage, gridPos, gameArray, type) {
			this._super({});
			this.stage = stage;
			this.gridPos = gridPos;
			this.gameArray = gameArray;
			this.pieces = new Array(4);
			this.createBrick(type);
		},
		
		createBrick: function(type) {
			if (type == 1) {
				//2x2
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 21, 1));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 21, 1));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 20, 1));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 20, 1));
				
				this.pivot = { x: 4.5, y: 20.5 };
			} else if (type == 2) {
				//J
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 21, 2));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 20, 2));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 20, 2));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 20, 2));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 3) {
				//L
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 20, 3));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 20, 3));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 20, 3));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 21, 3));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 4) {
				//|
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 21, 4));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 21, 4));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 21, 4));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 6, 21, 4));
				
				this.pivot = { x: 4.5, y: 20.5 };
			} else if (type == 5) {
				// A
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 20, 5));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 20, 5));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 20, 5));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 21, 5));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 6) {
				// S
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 20, 6));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 20, 6));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 21, 6));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 21, 6));
				
				this.pivot = { x: 4, y: 20 };
			} else if (type == 7) {
				// Z
				this.pieces[0] = this.stage.insert(new Q.Piece2(this.gridPos, 3, 21, 7));
				this.pieces[1] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 21, 7));
				this.pieces[2] = this.stage.insert(new Q.Piece2(this.gridPos, 4, 20, 7));
				this.pieces[3] = this.stage.insert(new Q.Piece2(this.gridPos, 5, 20, 7));
				
				this.pivot = { x: 4, y: 20 };
			}
		},
		
		moveDown: function(dt) {
			for (let i = 0; i < 4; i ++) {
				this.pieces[i].down();
			}
			this.pivot.y -= 1;
			this.elapsed = 0;
		},
		
		moveLeft: function() {
			for (let i = 0; i < 4; i ++) {
				this.pieces[i].left();
			}
			this.pivot.x -= 1;
			this.elapsedRL = 0;
		},
		
		moveRight: function() {
			for (let i = 0; i < 4; i ++) {
				this.pieces[i].right();
			}
			this.pivot.x += 1;
			this.elapsedRL = 0;
		},
		
		rotate: function() {
			for (let i = 0; i < 4; i++) {
				this.pieces[i].setPos(this.pivot.x + this.pivot.y - this.pieces[i].y,
									  this.pivot.y - this.pivot.x + this.pieces[i].x
				);
			}
		},
		
		saveOnGameArray: function() {
			for (let i = 0; i < 4; i++) {
				if (this.pieces[i].y < 20) {
					this.gameArray[this.pieces[i].x][this.pieces[i].y].exist = true;
					this.gameArray[this.pieces[i].x][this.pieces[i].y].piece = this.pieces[i];
				}
			}
		}
	});
	
	class QueuePlayerAction {
		constructor (len) {
			this.queue = new Uint8Array(len);
			this.i = 0;
			this.j = -1;
		}
		
		write(num) {
			this.queue[this.i] = num;
			this.i++;
			if (this.i == this.queue.length) {
				this.i = 0;
			}
		}
		
		next() {
			if (this.j != this.i && this.queue[this.j+1] != 0) {
				this.queue[this.j] = 0;
				this.j++;
				if (this.j == this.queue.length) {
					this.j = 0;
				}
				return true;
			}
			return false;
		}
		
		read() {
			return this.queue[this.j];
		}
	}
	
	Q.Sprite.extend("Controller2",{
		
		init: function(stage, gridPos) {
			this._super({});
			this.stage = stage;
			
			this.gridPos = gridPos;
			stage.insert(new Q.Grid(gridPos));
			this.gameArray = this.createNewGameArray();
			
			this.queueA = new QueuePlayerAction(100);
			
			socket.on("down", 	() => { this.queueA.write(1); });
			socket.on("left", 	() => { this.queueA.write(2); });
			socket.on("right", 	() => { this.queueA.write(3); });
			socket.on("rotate", () => { this.queueA.write(4); });
			socket.on("newBrick", (t) => { this.queueA.write(5); this.queueA.write(t); });
			socket.on("attArray", (t) => { this.attGameArray(t); });
		},
		
		createNewGameArray: function() {
			var g = new Array(gridSize.w);
			for (let i = 0; i < gridSize.w; i++) {
				g[i] = new Array(gridSize.h);
				for (let j = 0; j < gridSize.h; j++) {
					g[i][j] = {exist: false};
				}
			}
			return g;
		},
		
		attGameArray: function(newArrayJson) {
			var newArray = JSON.parse(newArrayJson);
			
			Q("Piece2").destroy();
			
			for (let i = 0; i < gridSize.h; i++) {
				for (let j = 0; j < gridSize.w; j++) {
					if (this.gameArray[j][i].exist) {
						this.gameArray[j][i].exist = false;
					}
					
					if (newArray[j][i].exist) {
						this.gameArray[j][i].exist = true;
						this.stage.insert(new Q.Piece2(this.gridPos, j, i, newArray[j][i].piece));
					}
				}
			}
		},
		
		createNewBrick: function(t) {
			if (typeof this.actualBrick !== "undefined") { this.actualBrick.destroy(); }
			this.actualBrick = this.stage.insert(new Q.Brick2(this.stage, this.gridPos, this.gameArray, t));
		},
		
		step: function(dt) {
			if (this.queueA.next()) {
				let action = this.queueA.read();
				
				if (action == 1) {
					this.actualBrick.moveDown();
				} else if(action == 2) {
					this.actualBrick.moveLeft();
				} else if(action == 3) {
					this.actualBrick.moveRight();
				} else if(action == 4) {
					this.actualBrick.rotate();
				} else if(action == 5) {
					this.queueA.next();
					let a = this.queueA.read();
					this.createNewBrick(a);
				}
			}
		},
		
		//fim da classe
	});
	
	//Fim Player2
	
	//telas/stages
	
	Q.scene("level1",function(stage) {
		
		var score = {s: 0};
		var score2 = {s: 0};
		
		var end = false;
		
		var gridPos = {x: (-gridScreenSize.w-150)/2, y: 0};
		stage.insert(new Q.Controller(stage, gridPos, score, () => {
			
			var container = stage.insert(new Q.UI.Container({
			  x: gridPos.x, y: gridPos.y, fill: "rgba(255,255,255,0.5)" }));
			
			
			var label = container.insert(new Q.UI.Text({x:10, y: -10, label: "Finalizado!" }));
			socket.emit("score", roomID, score.s);
			socket.emit("lost", roomID);

			container.fit(20);
			
			socket.on("end", (result) => {
				end = true;
				if (result == 1) {
					label.p.label = "Vitória! :)\n +30";
					container.p.fill = "rgba(0, 71, 171, 0.7)";
				} else if (result == -1) {
					label.p.label = "Derrota! :'(\n -20";
					container.p.fill = "rgba(227, 38, 54, 0.7)";
				} else {
					label.p.label = "\nEmpate! :/"
					container.p.fill = "rgba(253, 233, 16, 0.7)";
				}
				var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC", label: "Sair" }));
				label.p.y = -15 - button.p.h;
				container.fit(20);
				
				button.on('click', () => {
					window.location.href='/';
				});
			});
		}));
		
		var gridPos2 = {x: (gridScreenSize.w+150)/2, y: 0};
		stage.insert(new Q.Controller2(stage, gridPos2));
		
		var scoreUi = stage.insert(new Q.UI.Text({x:gridPos.x, y: gridScreenSize.h/2+30, label: "Score: " + score.s }));
		var scoreUi2 = stage.insert(new Q.UI.Text({x:gridPos2.x, y: gridScreenSize.h/2+30, label: "Score: " + score.s }));
		
		stage.add("viewport");
		stage.viewport.scale = 0.8;
		stage.centerOn(0, 0);
		
		socket.on("score", (s) => {
			score2.s = s;
		});
		
		var elapsed = 0;
		stage.on("step", (dt) => {
			if (end) return;
			scoreUi.p.label = "Score " + score.s;
			scoreUi2.p.label = "Score " + score2.s;
			
			if (elapsed >= 0.25) {
				socket.emit("score", roomID, score.s);
				elapsed = 0;
			}
			elapsed += dt;
		});
	});
	
	Q.scene('startGame',function(stage) {
		var isReady1 = false, isReady2 = false;
		
		var container = stage.insert(new Q.UI.Container({
		  x: Q.width/2, y: Q.height/2, w: 280, h: 150, fill: "rgba(255,255,255,0.5)" }));
		  
		var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC", label: "Pronto" }));
		var label = container.insert(new Q.UI.Text({x:0, y: - button.p.h, label: "0/2" }))

		button.on("click", function() {
			isReady1 = true;
			if (isReady2) label.p.label = "2/2";
			else label.p.label = "1/2";
			socket.emit("ready", roomID);
		});
		
		socket.on("ready", function(ready) {
			isReady2 = true;
			if (isReady1 == true) {
				ready(true);
			} else {
				label.p.label = "1/2";
				ready(false);
			}
		});
		
		socket.on("startar", function() {
			started = true;
			Q.clearStages();
			Q.stageScene('level1');
		});

		container.fit(20);
	});
	
	socket.on("start room", (room) => {
		roomID = room;
		Q.stageScene("startGame");
	});
	
	socket.on("continue room", (room) => {
		roomID = room;
		Q.stageScene("level1");
	});
	
	socket.emit("join game");
	
});
