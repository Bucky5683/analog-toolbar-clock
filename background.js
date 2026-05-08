const ALARM_NAME = "update-analog-toolbar-clock";
const ICON_SIZES = [16, 24, 32, 48];

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

function drawClockIcon(size, date) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const center = size / 2;
  const radius = size / 2 - Math.max(1.5, size * 0.07);

  ctx.clearRect(0, 0, size, size);

  // 시계 배경
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // 외곽선
  ctx.lineWidth = Math.max(1, size * 0.055);
  ctx.strokeStyle = "#111827";
  ctx.stroke();

  // 12개 눈금
  for (let i = 0; i < 12; i += 1) {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    const isMainMark = i % 3 === 0;

    const outer = radius - Math.max(0.5, size * 0.02);
    const markLength = isMainMark ? radius * 0.24 : radius * 0.13;
    const inner = outer - markLength;

    const x1 = center + Math.cos(angle) * inner;
    const y1 = center + Math.sin(angle) * inner;
    const x2 = center + Math.cos(angle) * outer;
    const y2 = center + Math.sin(angle) * outer;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.lineWidth = isMainMark
      ? Math.max(1, size * 0.055)
      : Math.max(0.7, size * 0.032);

    ctx.strokeStyle = "#111827";
    ctx.stroke();
  }

  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();

  const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2;
  const minuteAngle = (minutes * Math.PI) / 30 - Math.PI / 2;

  // 시침
  drawHand(
    ctx,
    center,
    center,
    hourAngle,
    radius * 0.48,
    Math.max(1.4, size * 0.085),
    "#111827"
  );

  // 분침
  drawHand(
    ctx,
    center,
    center,
    minuteAngle,
    radius * 0.72,
    Math.max(1.1, size * 0.065),
    "#2563eb"
  );

  // 중심점
  ctx.beginPath();
  ctx.arc(center, center, Math.max(1.2, size * 0.065), 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

async function updateClock() {
  const now = new Date();

  const imageData = {};

  for (const size of ICON_SIZES) {
    imageData[size] = drawClockIcon(size, now);
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

// service worker가 실행될 때마다 즉시 갱신하고 다음 분 정각 알람 예약
updateClockAndScheduleNextMinute();
