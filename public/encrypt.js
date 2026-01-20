function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function ab2b64(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
}

function b642ab(b64) {
    console.log(b64)
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function sha256(text) {
    const uint8 = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", uint8);
    return Array.from(new Uint8Array(digest))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
}

// RSA-OAEP encryption/decryption
async function encryptRSA(data, publicKey) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    console.log(encodedData.length);
    const key = await crypto.subtle.importKey("spki", publicKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
    return await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encodedData);
}

async function decryptRSA(data, privateKey) {
    const key = await crypto.subtle.importKey("pkcs8", privateKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    const decryptedData = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, data);
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
}

async function generateKeyPair() {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error("crypto.subtle not supported.");
    }
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
    myPublicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
}