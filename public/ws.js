let pingIndex = 0;
let pongIndex = 0;
let serverPongIndex = 0;

let peddingMsg = "";
let receiver = ""

let reconnectKey = ""

function pingpong(d){
    if(d){
        socket.send(
            JSON.stringify({
                mode: "pong",
                target: "client",
                receiver: receiver,
                data: { index: d.toString()},
            })
        );
    }else {
        pingIndex++;
        if(receiver){
            socket.send(JSON.stringify({
                mode: "ping",
                receiver: receiver,
                target: "client",
                data: {index: String(pingIndex)}
            }))
        }
        socket.send(JSON.stringify({
            mode: "server-ping",
            receiver: "server",
            target: "server",
            data: {index: String(pingIndex)}
        }))
    }
}

// start when connected to a client
function sendPing (){
    setInterval(() => {
        if(receiver){
        if(pingIndex - pongIndex >= 3){
            changeStatus(1, 0);
            console.log("Target client connection lost");
        }else{
            changeStatus(1, 1);
        }
        if(pingIndex - serverPongIndex >= 3){
            changeStatus(0, 0);
            console.log("Server connection lost");
        }else {
            changeStatus(0, 1);
        }}
        pingpong();
    }, 3000);
}

sendPing()

function open() {
    //websocket event listeners
    socket = new WebSocket(wsURL);
    socket.onopen = () => {
        console.log("connected");
        generateKeyPair().then(() => (msgBox.innerHTML = "Key pair generated"));
    };
    messageHandler(socket);
}

function messageHandler(socket){

    socket.onmessage = async (msg) => {
        console.log(JSON.parse(msg.data));
        const mode = JSON.parse(msg.data).mode;
        const sender = JSON.parse(msg.data).sender;
        const data = JSON.parse(msg.data).data;
        if (mode === "cid") {
            // set cid
            cid = data.cid;
            reconnectKey = data.rKey
            document.getElementById("cid").innerHTML = cid;
            // document.getElementById("status1").src = preloadedImages["online"];
            connectBtn.disabled = false;
            document.getElementById("rec-input").disabled = false;
            loaded++;
            if (loaded === haveLoad) {
                changePage("pairing");
            }
        } else if (mode === "getKey") {
            //相手が自分の公開鍵を要求してきたとき=connect成立
            yourPublicKey = b642ab(data.key);
            socket.send(
                JSON.stringify({
                    mode: "key",
                    receiver: sender,
                    target: "client",
                    data: { key: ab2b64(myPublicKey) },
                })
            );
            receiver = sender;
            document.getElementById("target-status-id").innerHTML = sender;
            showInfo("#136ac1", "Public key sent");
            clientStatus = "online";
            setTimeout(() => {
                changePage("chat");
                // sendPing();
            }, 1000);
            // checkClientStatus();
        } else if (mode === "key") {
            if (data.key === "") {
                connectBtn.disabled = false;
                connectBtn.innerText = "connect";

                showInfo("red", "User not found");

                return;
            } else {
                showInfo("#136ac1", "Public key received");
            }
            console.log(data.key);
            yourPublicKey = b642ab(data.key);
            receiver = sender;
            document.getElementById("target-status-id").innerHTML = sender;
            msgBox.innerHTML = "Connected !";
            changePage("chat");
            clientStatus = "online";
            // sendPing();
        } else if (mode === "hash-check") {
            const hash = data.content;
            console.log(hash);
            console.log(msgHash);
            socket.send(
                JSON.stringify({
                    mode: "hash-result",
                    receiver: sender,
                    target: "client",
                    data: { content: String(hash === msgHash) },
                })
            );
            if (hash === msgHash) {
                pushMsg("0", peddingMsg);
                document.getElementById("message").value = "";
                status = "free";
                peddingMsg = "";
                //chat-boxを一番下にスクロール
                const chatBox = document.getElementById("message-box");
                chatBox.scrollTo({
                    top: chatBox.scrollHeight,
                    behavior: "smooth",
                });
            } else {
                console.log("hash didn't match", data.content);
                showError();
            }
        } else if (mode === "hash-result") {
            if (data.content === "true") {
                console.log("Decrypted Message:", receivedMsg);

                pushMsg("1", receivedMsg);
            } else {
                console.log("hash didn't match", data.content);
            }
        } else if (mode === "message") {
            let decryptedMessage = "";
            let content = data.content.split("|");
            content.shift();
            console.log(content)
            for (let i = 0; i < content.length; i++) {
                decryptedMessage += await decryptRSA(b642ab(content[i]), privateKey);
            }
            const hash = await sha256(decryptedMessage);
            receivedMsg = decryptedMessage;
            setTimeout(() => {
                socket.send(
                    JSON.stringify({
                        mode: "hash-check",
                        receiver: sender,
                        target: "client",
                        data: { content: hash },
                    })
                );
            }, 500);
        } else if (mode === "ping") {
            pingpong(data.index)
        } else if (mode === "pong") {
            if (data.index > pingIndex) {
                pongIndex = data.index;
                console.error("error");
                throw new Error("problem: (pong index) > (ping index)");
            } else {
                pongIndex = data.index;
            }
        }else if(mode === "server-pong"){
            serverPongIndex = data.index;
        }else if(mode === "reconnect"){
            if(data.content === "success"){
                console.log("reconnected")
                cid = data.rCid;
                reconnectKey = data.rKey
                document.getElementById("cid").innerHTML = cid;
                msgBox.innerHTML = "reconnected";
                msgBox.style.color = "";
            }else{
                msgBox.innerHTML = "connected";
                msgBox.style.color = "";
            }
        }
        else if (mode === "error") {
            msgBox.innerHTML = "Error: " + data.message;
            msgBox.style.color = "red";
            if (data.code === "c0001") {
                connectBtn.disabled = false;
                // connectBtn.innerHTML = "connect";
                recInput.disabled = false;
            }
        } else {
            console.log(JSON.parse(msg.data));
        }
    };

    socket.onclose = () => {
        console.log("disconnected");
        if (!cid) {
            msgBox.innerHTML = "Cannot connect to server !";
            msgBox.style.color = "red";
        } else {
            msgBox.innerHTML = "Disconnected";
            msgBox.style.color = "red";
            reconnect(cid);
        }
        return true
    };
}

function reconnect(cid){
    console.log("reconnecting");
    socket.close();
    socket = new WebSocket(wsURL);
    socket.onopen = () => {
        console.log(cid);
        socket.send(JSON.stringify({mode: "reconnect", receiver: "", target: "server", data: {rCid: cid ,rKey: reconnectKey}}))
    }
    messageHandler(socket);
}

// check client status
function changeStatus(t, s) {
    //t=1: target, t=0: user
    //s=1: online, s=0: offline
    let element;
    switch (t) {
        case 1:
            element = document.getElementById("target-status");
            break;
            case 0:
            element = document.getElementById("user-status");
            break;
    }
    switch (s) {
        case 0:
            element.classList.remove("status-online");
            element.classList.add("status-offline");
            break;
            case 1:
            element.classList.remove("status-offline");
            element.classList.add("status-online");
            break;
    }
}