# Analog Toolbar Clock

Chrome toolbar에 작은 아날로그 시계를 표시하는 Manifest V3 확장프로그램입니다.

## 기능

- 툴바 아이콘에 아날로그 시계 표시
- 시침 / 분침만 표시
- 초침 없음
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
* 아이콘은 `OffscreenCanvas`로 직접 그린 뒤 `chrome.action.setIcon()`으로 적용합니다.
* tooltip은 `chrome.action.setTitle()`로 적용합니다.
* 갱신 후 `chrome.alarms.create({ when })`으로 다음 분 정각에 1회성 알람을 예약합니다.
* 알람이 울리면 다시 현재 시간으로 갱신하고, 다음 분 정각 알람을 재예약합니다.

## 제한사항

Chrome toolbar icon hover 이벤트는 없기 때문에 마우스를 올리는 순간 새로 계산할 수는 없습니다.

또한 Chrome alarms는 성능상 지연될 수 있고, 현재 시각으로부터 30초 미만 뒤의 `when`을 지정해도 실제 실행은 최소 30초 뒤가 될 수 있습니다. 따라서 대부분의 경우 분 단위로 맞지만, Chrome 내부 스케줄링에 따라 약간 늦게 갱신될 수 있습니다.
