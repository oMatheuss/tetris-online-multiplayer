var token = '';

async function attemptLogin(e) {
	if (e.preventDefault) e.preventDefault();
	
	let targetUrl = "";
	
	if (document.activeElement.name === "cadastro") targetUrl = "/register";
	else targetUrl = "/login";
	
	const response = await fetch(targetUrl, {
		// metodo da requisição
		method: "POST",

		// corpo da requisição
		body: JSON.stringify({
			nickname: e.target["nickname"].value,
			password: e.target["password"].value,
		}),

		// headers da requisição
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		}
	});
	
	const body = await response.body;
	if (response.status !== 200) {
		let msg = await response.json();
		alert(msg.message);
		return;
	};
	window.location.reload(true);
}

var formLogin = document.getElementById("login");
if (formLogin !== null) {
	if (formLogin.attachEvent) {
		formLogin.attachEvent("submit", attemptLogin);
	} else {
		formLogin.addEventListener("submit", attemptLogin);
	}
}
