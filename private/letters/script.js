// ----- guard screen ------

document.getElementById("submit-btn").addEventListener("click", () => {
    const loginBox = document.getElementById("login-box");
    const contentBox = document.getElementById("content-box");

    loginBox.classList.add("hidden");
    contentBox.classList.remove("hidden");
    prepareEnvelope()
});


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
    const env = document.getElementById('envelope-wrapper');
    const letter = document.getElementById('text');

    env.style.transform = 'rotateX(0deg) rotateY(0deg)';
    env.style.boxShadow = '0px 0px 25px rgba(0,0,0,0.25)';
    env.classList.add('open');
    letter.classList.add('zoom-in');
    letter.addEventListener('click', () => {
        env.classList.remove('straight');
        letter.classList.remove('zoom-in');
        letter.classList.add('zoom-out');
        setTimeout(resetEnvelope, 2000)
    });
    env.removeEventListener('click', envelopeOnClick);
}

function resetEnvelope() {
    isOpened = false;
    const env = document.getElementById('envelope-wrapper');
    const letter = document.getElementById('text');

    letter.classList.remove('zoom-out');
    env.classList.remove('open');
    env.addEventListener('click', envelopeOnClick);
}

// ----- decryption ------

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

async function decrypt() {
    const keyStr = document.getElementById("decKey").value;
    const b64 = document.getElementById("decText").value;

    const combined = base64ToBytes(b64);

    if (combined.length < 16 + 12) {
        document.getElementById("decOut").value = "Invalid ciphertext";
        return;
    }

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
        document.getElementById("decOut").value = fromBytes(new Uint8Array(plainBuf));
    } catch (e) {
        document.getElementById("decOut").value = "Decryption failed (wrong key or corrupted data)";
    }
}