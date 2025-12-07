import { adb } from "./adb.js";

/**
 * helper: delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * helper: wait until YouTube is foreground or process alive
 */
async function waitForYouTube(device, retry = 5) {
  for (let i = 0; i < retry; i++) {
    const focus = await adb(
      device,
      "shell dumpsys window | grep mCurrentFocus"
    );

    if (focus && focus.toLowerCase().includes("youtube")) {
      return true;
    }

    await sleep(700);
  }

  // fallback: check process
  const pid = await adb(device, "shell pidof com.google.android.youtube");
  return pid.trim().length > 0;
}

/**
 * MAIN BOT
 */
export async function run(device) {
  console.log(`[${device}] bot start`);

  // 1. Wake device (SAFE, not toggle)
  await adb(device, "shell input keyevent 224");
  await sleep(500);

  // 2. Go HOME (reset state)
  await adb(device, "shell input keyevent 3");
  await sleep(500);

  // 3. Open YouTube app
  await adb(device, "shell monkey -p com.google.android.youtube 1");

  const ytReady = await waitForYouTube(device);
  if (!ytReady) {
    throw new Error("YouTube failed to launch");
  }

  console.log(`[${device}] YouTube active`);

  // 4. Open Muse Indonesia channel (FORCE YouTube app)
  await adb(
    device,
    `shell am start \
     -a android.intent.action.VIEW \
     -d "https://www.youtube.com/@MuseIndonesia" \
     -p com.google.android.youtube`
  );

  // optional wait after navigation
  await sleep(1500);

  console.log(`[${device}] Muse Indonesia opened`);
  console.log(`[${device}] bot end`);
}
