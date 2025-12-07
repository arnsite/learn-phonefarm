import { execSync } from "child_process";
import { run } from "./bot.js";

function getDevices() {
  return execSync("C:\\adb\\adb.exe devices")
    .toString()
    .split("\n")
    .filter((l) => l.includes("\tdevice"))
    .map((l) => l.split("\t")[0]);
}

const devices = getDevices();
console.log("Devices:", devices);

await Promise.all(devices.map((d) => run(d)));
