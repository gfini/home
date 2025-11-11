import { recipient as encryptedRecipient } from './data/recipient.js';
import { content as encryptedContent } from './data/content.js';
const LETTER_NAME = "the letter 4-11-25-abp"

// ----- guard screen ------

document.getElementById("submit-btn").addEventListener("click", onButtonClick);
notifyDiscord("Login page visited.");

let triesCount = 0;

async function onButtonClick() {
    const input1 = document.getElementById("input-1").value;
    const input2 = document.getElementById("input-2").value;
    const input3 = document.getElementById("input-3").value;
    const wrong = document.getElementById("wrong");

    if (input1 == "" || input2 == "" || input3 == "") {
        wrong.innerHTML = "Wszystkie pola muszą być uzupełnione ^^";
    } else {
        const keyStr = input1 + input2 + input3;
        const decryptedRecipient = await decrypt(keyStr, encryptedRecipient);
        if (decryptedRecipient !== null) {
            const decryptedContent = await decrypt(keyStr, encryptedContent);
            if (decryptedContent !== null) {
                notifyDiscord("Someone just made it to the envelope!");
                showTheEnvelope(decryptedRecipient, decryptedContent);
                return;
            }
        }
        if (++triesCount == 1) {
            wrong.innerHTML = "Coś jest nie tak ;)";
        } else if (triesCount == 2) {
            wrong.innerHTML = "Tip: wielkość liter ma znaczenie :)";
        } else if (triesCount == 3) {
            wrong.innerHTML = "Hej, na pewno Ty jesteś odbiorcą tego listu? ^^";
        } else {
            wrong.innerHTML = "...";
        }
    }
    notifyDiscord(`Unsuccessful attempt.\ninput1 = ${input1}\ninput2 = ${input2}\ninput3 = ${input3}\ntriesCount=${triesCount}`);
    wrong.classList.remove('hidden')
}

function showTheEnvelope(recipient, content) {
    document.getElementById("recipient").innerHTML = `<p>${recipient}</p>`
    document.getElementById("letter").innerHTML = content

    const loginBox = document.getElementById("login-box")
    const contentBox = document.getElementById("content-box")
    loginBox.classList.add("swipe-out");
    setTimeout(() => {
        loginBox.classList.add("hidden");
        contentBox.classList.remove("hidden");
        contentBox.classList.add("swipe-in");
        prepareEnvelope()
    }, 1000);
}


// ----- envelope -----

let isOpened = false;

function prepareEnvelope() {
    document.getElementById('envelope-wrapper').addEventListener('click', envelopeOnClick);

    // śledzenie kursora — obrót wrappera
    const followingDiv = document.querySelector('.wrapper');
    const letter = document.querySelector('.letter');

    document.addEventListener('mousemove', (event) => {
        if (isOpened) {
            // letter only
            const rectLetter = letter.getBoundingClientRect();
            const centerXLetter = rectLetter.left + rectLetter.width / 2;
            const centerYLetter = rectLetter.top + rectLetter.height / 2;

            const deltaXLetter = event.clientX - centerXLetter;
            const deltaYLetter = event.clientY - centerYLetter;

            const shadowXLetter = -(deltaXLetter / 30);
            const shadowYLetter = -(deltaYLetter / 30);

            letter.style.boxShadow = `${shadowXLetter}px ${shadowYLetter}px 25px rgba(0,0,0,0.25)`;
        } else {
            // wrapper
            const rect = followingDiv.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = event.clientX - centerX;
            const deltaY = event.clientY - centerY;

            const rotateX = -deltaY / 40;
            const rotateY = deltaX / 40;

            followingDiv.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

            const shadowX = -(deltaX / 20);
            const shadowY = -(deltaY / 20);

            followingDiv.style.boxShadow = `${shadowX}px ${shadowY}px 25px rgba(0,0,0,0.25)`;
        }
    });
}

function envelopeOnClick() {
    isOpened = true;
    fadeInAudio(document.getElementById('piano'))
    notifyDiscord("Envelope opened!");
    const env = document.getElementById('envelope-wrapper');
    const letter = document.getElementById('letter');

    env.style.transform = 'rotateX(0deg) rotateY(0deg)';
    env.style.boxShadow = '0px 0px 25px rgba(0,0,0,0.25)';
    env.classList.add('open');

    letter.classList.add('zoom-in');
    letter.addEventListener('click', letterOnClick);

    env.removeEventListener('click', envelopeOnClick);
}

function letterOnClick() {
    fadeOutAudio(document.getElementById('piano'))
    notifyDiscord("Envelope closed.");

    const letter = document.getElementById('letter');
    letter.classList.remove('zoom-in');
    letter.classList.add('zoom-out');

    setTimeout(resetEnvelope, 2000)
    letter.removeEventListener('click', letterOnClick);
}

function resetEnvelope() {
    isOpened = false;
    const env = document.getElementById('envelope-wrapper');
    const letter = document.getElementById('letter');

    letter.classList.remove('zoom-out');
    env.classList.remove('open');
    env.addEventListener('click', envelopeOnClick);
}


// ----- audio -----

let fadeInIsRunning = false;
let fadeOutIsRunning = false;

function fadeInAudio(audio, duration = 2500) {
    fadeInIsRunning = true;
    const steps = 25;
    const stepTime = duration / steps;
    const volumeStep = 1 / steps;

    audio.volume = 0;
    audio.play();
    const fade = setInterval(() => {
        if (fadeOutIsRunning) {
            fadeInIsRunning = false;
            clearInterval(fade);
        }
        const newVolume = audio.volume + volumeStep;
        if (newVolume >= 1) {
            audio.volume = 1;
            clearInterval(fade);
            fadeInIsRunning = false;
        } else {
            audio.volume = newVolume;
        }
    }, stepTime);
}

function fadeOutAudio(audio, duration = 2500) {
    fadeOutIsRunning = true;
    const steps = 25;
    const stepTime = duration / steps;
    const volumeStep = 1 / steps;

    const fade = setInterval(() => {
        if (fadeInIsRunning) {
            fadeOutIsRunning = false;
            clearInterval(fade);
        }
        const newVolume = audio.volume - volumeStep;
        if (newVolume <= 0) {
            audio.pause();
            clearInterval(fade);
            fadeOutIsRunning = false;
        } else {
            audio.volume = newVolume;
        }
    }, stepTime);
}


// ----- decryption ------

function toBytes(str) { return new TextEncoder().encode(str); }
function fromBytes(bytes) { return new TextDecoder().decode(bytes); }

function base64ToBytes(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

async function deriveKey(passphrase, salt) {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        toBytes(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function decrypt(keyStr, encryptedBase64Value) {
    const combined = base64ToBytes(encryptedBase64Value);

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await deriveKey(keyStr, salt);

    try {
        const plainBuf = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        );
        return fromBytes(new Uint8Array(plainBuf));
    } catch (e) {
        return null;
    }
}


// ----- integrations ------

function notifyDiscord(message) {
    fetch("https://discord.com/api/webhooks/1437719066017005618/SE3RA7qj8AQQFcOayZPzlL9ii67o9qnho5ErP4vD36IGbPkVqd09L2urjOgVJYSwPuPy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `[${LETTER_NAME}] ${message}` })
    });
}