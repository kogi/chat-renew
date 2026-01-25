let loaded = 0;
const haveLoad = 2;

const msgBox = document.getElementById("msg-box");
const connectBtn = document.getElementById("connect");

let myPublicKey = "";
let yourPublicKey = "";
let privateKey = "";
let wsURL = "wss://" + location.host + "/ws";
let socket ;
let cid = "";

const recInput = document.getElementById("rec-input");

function connect() {
	if (recInput.value.trim() === "") {
		alert("Please enter a valid ID.");
		return;
	}
	if (recInput.value === cid) {
		alert("You cannot connect to yourself.");
		return;
	}
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(
			JSON.stringify({
				mode: "getKey",
				target: "client",
				receiver: recInput.value,
				data: { key: ab2b64(myPublicKey) },
			})
		);
		msgBox.innerHTML = "Connecting to ID: " + recInput.value;
		connectBtn.disabled = true;
		// connectBtn.innerHTML = "connecting...";
		recInput.disabled = true;
	} else {
		alert("WebSocket is not open. Please reload the page.");
	}
}

function changePage(page) {
	switch (page) {
		case "pairing":
			setTimeout(() => {
				const loading = document.getElementById("loading");
				if (loading) {
					loading.style.display = "none";
					const pairing = document.getElementById("pairing");
					if (pairing) {
						pairing.style = "";
					}
				}
				document.getElementById("pairing").style = "";
				document.getElementById("chat").style.display = "none";
				document.getElementById("message-input").style.display = "none";
			}, 1000);
			break;

		case "chat":
			document.getElementById("pairing").style.display = "none";
			document.getElementById("chat").style = "";
			document.getElementById("message-input").style = "";
			break;

		default:
			break;
	}
}

function pushMsg(src, msg) {
	const chatBox = document.getElementById("message-box");
	const msgElement = `<div class="${src === "0" ? "message" : "t-message"}">
					<p>${msg}</p>
				</div>`;
	chatBox.innerHTML += msgElement;
	// メッセージボックスをスクロール
	chatBox.scrollTo({
		top: chatBox.scrollHeight,
		behavior: "smooth",
	});
}

function showInfo(color, message) {
	msgBox.style.color = color;
	msgBox.innerHTML = message;
}

async function sendMsg(t) {

	ctt = t.replace(/\r?\n/g, "<br>");
	const chunkSize = 50;
	let encryptedMessage = "";
	for (let i = 0; i < ctt.length; i += chunkSize) {
		const chunk = ctt.substring(i, i + chunkSize);
		console.log(chunk)
		const encryptedChunk = await encryptRSA(chunk, publicKey);
        console.log(ab2b64(encryptedChunk))
		encryptedMessage+="|"+ab2b64(encryptedChunk);
	}

	msgHash = await sha256(ctt);

	// console.log(ab2b64(encryptedMessage).length)
    console.log("Sending encrypted message:", encryptedMessage);
	socket.send(
		JSON.stringify({
			mode: "message",
			receiver: receiver,
			target: "client",
			data: { content: encryptedMessage },
		})
	);
	peddingMsg = ctt;
}

const sendBtn = document.getElementById("send-button");
sendBtn.addEventListener("click", () => {
	if(document.getElementById("message").value.trim() === "") {
		return;
	}
	sendMsg(document.getElementById("message").value);
});

window.addEventListener("load", () => {
	//check if environment support RSA encryption
	if (!window.crypto || !window.crypto.subtle) {
		showInfo("red", "Your browser does not support RSA encryption.");
		changePage("pairing");
		return;
	}else{
		open()
	}
	loaded++;
	console.log("preloadimg.js loaded");
	if (loaded === haveLoad) {
		changePage("pairing");
	}
});
