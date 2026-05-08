const ALARM_NAME = "update-analog-toolbar-clock";
const ICON_SIZES = [16, 24, 32, 48];
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
let creatingOffscreenDocument;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatTooltipDateTime(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

function getNextMinuteTimestamp(date = new Date()) {
  const nextMinute = new Date(date);

  nextMinute.setSeconds(0);
  nextMinute.setMilliseconds(100);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);

  return nextMinute.getTime();
}

function getClockColor(colorScheme) {
  return colorScheme === "dark" ? "#ffffff" : "#111111";
}

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    });

    return contexts.length > 0;
  }

  const matchedClients = await clients.matchAll();

  return matchedClients.some((client) => client.url === offscreenUrl);
}

async function setupOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.MATCH_MEDIA],
      justification: "Detect system light or dark color scheme for the toolbar clock icon."
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = undefined;
  }
}

async function getSystemColorScheme() {
  await setupOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    type: "GET_COLOR_SCHEME"
  });

  return response?.colorScheme === "dark" ? "dark" : "light";
}

function drawHand(ctx, centerX, centerY, angle, length, width, color) {
  const x = centerX + Math.cos(angle) * length;
  const y = centerY + Math.sin(angle) * length;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x, y);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawDotMarkers(ctx, center, radius, size, color) {
  const dotDistance = radius * 0.82;
  const dotRadius = Math.max(0.85, size * 0.05);

  for (const hour of [0, 3, 6, 9]) {
    const angle = (hour * Math.PI) / 6 - Math.PI / 2;
    const x = center + Math.cos(angle) * dotDistance;
    const y = center + Math.sin(angle) * dotDistance;

    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawClockHands(ctx, center, radius, date, size, color) {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();

  const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2;
  const minuteAngle = (minutes * Math.PI) / 30 - Math.PI / 2;

  drawHand(
    ctx,
    center,
    center,
    hourAngle,
    radius * 0.42,
    Math.max(1.4, size * 0.09),
    color
  );

  drawHand(
    ctx,
    center,
    center,
    minuteAngle,
    radius * 0.64,
    Math.max(1.05, size * 0.06),
    color
  );

  ctx.beginPath();
  ctx.arc(center, center, Math.max(0.95, size * 0.048), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawClockIcon(size, date, color) {
  console.log("Drawing minimal transparent icon:", {
    size,
    color
  });

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const center = size / 2;
  const radius = size / 2 - 1;

  ctx.clearRect(0, 0, size, size);
  drawDotMarkers(ctx, center, radius, size, color);
  drawClockHands(ctx, center, radius, date, size, color);

  return ctx.getImageData(0, 0, size, size);
}

async function updateClock() {
  const now = new Date();
  const colorScheme = await getSystemColorScheme();
  const color = getClockColor(colorScheme);

  console.log("Analog Toolbar Clock updated:", {
    colorScheme,
    color,
    tooltip: formatTooltipDateTime(now)
  });

  const imageData = {};

  for (const size of ICON_SIZES) {
    imageData[size] = drawClockIcon(size, now, color);
  }

  await chrome.action.setIcon({ imageData });

  await chrome.action.setTitle({
    title: formatTooltipDateTime(now)
  });
}

async function scheduleNextMinuteUpdate() {
  await chrome.alarms.clear(ALARM_NAME);

  await chrome.alarms.create(ALARM_NAME, {
    when: getNextMinuteTimestamp()
  });
}

async function updateClockAndScheduleNextMinute() {
  try {
    await updateClock();
    await scheduleNextMinuteUpdate();
  } catch (error) {
    console.error("Failed to update analog toolbar clock:", error);
  }
}

async function updateClockForColorSchemeChange() {
  try {
    await updateClock();
  } catch (error) {
    console.error("Failed to update analog toolbar clock color scheme:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  updateClockAndScheduleNextMinute();
});

chrome.runtime.onStartup.addListener(() => {
  updateClockAndScheduleNextMinute();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) {
    return;
  }

  updateClockAndScheduleNextMinute();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "COLOR_SCHEME_CHANGED") {
    return false;
  }

  updateClockForColorSchemeChange();
  return false;
});

// service worker가 실행될 때마다 즉시 갱신하고 다음 분 정각 알람 예약
updateClockAndScheduleNextMinute();
