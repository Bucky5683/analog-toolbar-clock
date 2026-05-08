# Analog Toolbar Clock

Chrome toolbar에 배경과 테두리 없는 미니멀 아날로그 시계를 표시하는 Manifest V3 확장프로그램입니다.

## 기능

- 툴바 아이콘에 미니멀 아날로그 시계 표시
- 시침 / 분침만 표시
- 초침 없음
- 숫자 없음
- 배경 원과 외곽 테두리 없음
- 12 / 3 / 6 / 9 위치에 작은 점 4개만 표시
- 라이트모드에서는 검정 계열 `#111111`, 다크모드에서는 흰색 `#ffffff`으로 자동 전환
- popup 없음
- 외부 라이브러리 없음
- 아이콘 hover tooltip에 `5월 26일 18:38` 형식 표시
- `chrome.alarms.create({ when })`으로 다음 분 정각 갱신 예약

## 설치 방법

1. Chrome 주소창에 아래 주소 입력

```txt
chrome://extensions
```

2. 오른쪽 위 `Developer mode` 활성화
3. `Load unpacked` 클릭
4. 이 프로젝트 폴더 선택
5. 확장프로그램을 툴바에 고정

## 동작 방식

* service worker가 실행되면 즉시 현재 시간으로 아이콘과 tooltip을 갱신합니다.
* 아이콘은 투명 배경의 `OffscreenCanvas`에 4개 점, 시침, 분침, 작은 중심점만 직접 그린 뒤 `chrome.action.setIcon()`으로 적용합니다.
* tooltip은 `chrome.action.setTitle()`로 적용합니다.
* service worker에서는 `window.matchMedia()`를 직접 사용할 수 없기 때문에 `offscreen.html` 문서를 만들고, `offscreen.js`에서 `window.matchMedia("(prefers-color-scheme: dark)")`로 시스템 색상 모드를 감지합니다.
* 라이트/다크 모드가 바뀌면 offscreen 문서가 background service worker로 `COLOR_SCHEME_CHANGED` 메시지를 보내고, background는 아이콘을 즉시 다시 그립니다.
* 갱신 후 `chrome.alarms.create({ when })`으로 다음 분 정각에 1회성 알람을 예약합니다.
* 알람이 울리면 다시 현재 시간으로 갱신하고, 다음 분 정각 알람을 재예약합니다.

## 제한사항

Chrome toolbar icon hover 이벤트는 없기 때문에 마우스를 올리는 순간 새로 계산할 수는 없습니다.

또한 Chrome alarms는 성능상 지연될 수 있고, 현재 시각으로부터 30초 미만 뒤의 `when`을 지정해도 실제 실행은 최소 30초 뒤가 될 수 있습니다. 따라서 대부분의 경우 분 단위로 맞지만, Chrome 내부 스케줄링에 따라 약간 늦게 갱신될 수 있습니다.
