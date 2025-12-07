import { exec } from "child_process";

export function adb(device, cmd) {
  return new Promise((resolve, reject) => {
    exec(`C:\\adb\\adb.exe -s ${device} ${cmd}`, (err, out) => {
      if (err) reject(err);
      else resolve(out.trim());
    });
  });
}
