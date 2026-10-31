import { randomBytes, scryptSync } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
  console.error("Run this command in an interactive terminal.");
  process.exit(1);
}

emitKeypressEvents(stdin);
stdin.setRawMode(true);
stdin.resume();
stdout.write("Enter a new admin password (minimum 16 characters): ");

let password = "";

function finish(exitCode) {
  stdin.setRawMode(false);
  stdin.pause();
  stdin.removeAllListeners("keypress");
  stdout.write("\n");

  if (exitCode !== 0) process.exitCode = exitCode;
}

stdin.on("keypress", (character, key) => {
  if (key?.ctrl && key.name === "c") {
    finish(130);
    return;
  }

  if (key?.name === "return" || key?.name === "enter") {
    if (password.length < 16) {
      stdout.write("Password must contain at least 16 characters. Try again: ");
      password = "";
      return;
    }

    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    stdout.write(`${salt.toString("base64url")}:${hash.toString("base64url")}\n`);
    password = "";
    finish(0);
    return;
  }

  if (key?.name === "backspace" || key?.name === "delete") {
    password = Array.from(password).slice(0, -1).join("");
    return;
  }

  if (character && !key?.ctrl && !key?.meta && character >= " ") {
    password += character;
  }
});
