create schema db_projetofinal;
use db_projetofinal;
create table tb_usuarios (
	id int not null auto_increment,
	nickname varchar(20) not null unique,
	password varchar(128) not null,
	points int default 0,
	primary key(id)
);