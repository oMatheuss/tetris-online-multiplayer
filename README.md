# tetris-online

<p>Projeto desenvolvido usando as tecnologias:</p>
<ol>
  <li><b>node.js</b> (interpretador javascript);</li>
  <li><b>express</b> (servidor web);</li>
  <li><b>ejs</b> (<i>'view engine'</i> - paginas dinamicas com javascript);</li>
  <li><b>socket.io</b> (biblioteca web para comunicação em tempo real);</li>
  <li><b>jwt</b> (token para gerenciamento de login/logout);</li>
  <li><b>mysql</b> (banco de dados).</li>
  <li><b>html, css e javascript</b> (construção de paginas)</li>
</ol>

<h2>Link para pagina do jogo: <a href="https://tetris-online-multiplayer.herokuapp.com/" target="_blank" rel="noopener noreferrer">tetris-online</a>.</h2>

<h2>Instruçoes para rodar o projeto:</h2>

<b>Obs:</b>
É necessario ter o <a href="https://nodejs.org/en/" target="_blank" rel="noopener noreferrer">node.js/npm</a> instalado na maquina juntamente com <a href="https://www.mysql.com/" target="_blank" rel="noopener noreferrer">mysql8</a><br />

Primeiro instale as bibliotecas:

Vá pasta do projeto no CMD: <code>cd C:\caminho\para\pasta</code><br />
Pelo cmd na pasta do projeto digite: <code>npm install</code>

Em seguida crie o banco de dados com o codigo no arquivo <a href="./db.sql">db.sql</a><br />
O app faz acesso ao banco usando o usuario e senha: 'root'.<br />

Finalmente rode o projeto usando <code>node server.js</code>

O projeto fica no link http://localhost:8081/
