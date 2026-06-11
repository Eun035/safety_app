// 천안·아산 통합 랜드마크 단일 소스
// MapSearchBar와 MapContainer가 공통 import 한다.
// region: 'cheonan' | 'asan'

export const LANDMARKS = [
  // ───── 천안 ─────
  {
    id: 'landmark-cityhall',
    title: '천안시청',
    desc: '충청남도 천안시 서북구 번영로 156 (공공기관)',
    lat: 36.815129,
    lng: 127.113893,
    type: 'city_hall',
    badge: '🏢 시청 우선',
    safetyTip: '시청 주변은 자전거 도로 정비가 잘 되어 있으나 보행자가 많으니 안전 속도(시속 20km)를 유지하세요.',
    region: 'cheonan'
  },
  {
    id: 'landmark-seobuk-fire',
    title: '천안서북소방서',
    desc: '충청남도 천안시 서북구 백석동 8 (재난안전)',
    lat: 36.832791,
    lng: 127.113289,
    type: 'fire_station',
    badge: '🚒 소방서 우선',
    safetyTip: '긴급 출동 차량이 수시로 출입하는 구역입니다. 소방서 차고지 앞 주차 및 서성임은 금지됩니다.',
    region: 'cheonan'
  },
  {
    id: 'landmark-dongnam-fire',
    title: '천안동남소방서',
    desc: '충청남도 천안시 동남구 구성동 282-1 (재난안전)',
    lat: 36.802521,
    lng: 127.161877,
    type: 'fire_station',
    badge: '🚒 소방서 우선',
    safetyTip: '소방차량 긴급 출동 동선 확보를 위해 주변 5m 이내에 절대 주차(PM 거치)하지 마세요.',
    region: 'cheonan'
  },
  {
    id: 'landmark-dankook',
    title: '단국대학교 천안캠퍼스',
    desc: '충청남도 천안시 동남구 단대로 119 (대학)',
    lat: 36.832655,
    lng: 127.167888,
    type: 'university',
    badge: '🏫 대학교',
    safetyTip: '단대 호수(안서호) 주변 산책로는 PM 진입이 금지되거나 제한되므로 주의하여 우회하세요.',
    region: 'cheonan'
  },
  {
    id: 'landmark-sangmyung',
    title: '상명대학교 천안캠퍼스',
    desc: '충청남도 천안시 동남구 상명대길 31 (대학)',
    lat: 36.833543,
    lng: 127.179331,
    type: 'university',
    badge: '🏫 대학교',
    safetyTip: '캠퍼스 내 경사 구간이 매우 가파릅니다. 급경사 다운힐 시 반드시 풋브레이크와 전면 감속을 실행하세요.',
    region: 'cheonan'
  },
  {
    id: 'landmark-baekseok',
    title: '백석대학교',
    desc: '충청남도 천안시 동남구 문암로 76 (대학)',
    lat: 36.839843,
    lng: 127.186542,
    type: 'university',
    badge: '🏫 대학교',
    safetyTip: '등하교 시간 대학가 주변 보행자 밀집도가 매우 높습니다. 보행자 보호구역 진입 시 반드시 서행하세요.',
    region: 'cheonan'
  },
  {
    id: 'landmark-cheonan-station',
    title: '천안역 (동부광장)',
    desc: '충청남도 천안시 동남구 대흥로 239 (철도역)',
    lat: 36.811451,
    lng: 127.146522,
    type: 'station',
    badge: '🚉 교통거점',
    safetyTip: '천안역 광장 앞은 유동인구가 매우 조밀한 구역입니다. 하차 후 보행 시 끌고 가시는 것이 안전합니다.',
    region: 'cheonan'
  },
  {
    id: 'landmark-dujeong-station',
    title: '두정역',
    desc: '충청남도 천안시 서북구 두정역길 43 (지하철역)',
    lat: 36.831521,
    lng: 127.148811,
    type: 'station',
    badge: '🚉 교통거점',
    safetyTip: '퇴근 시간 두정역 출구 인근은 PM 반납 혼잡구역입니다. 반드시 지정된 노란색 합법 주차선 안에 주차하세요.',
    region: 'cheonan'
  },
  {
    id: 'landmark-terminal',
    title: '천안종합버스터미널',
    desc: '충청남도 천안시 동남구 만남로 43 (버스터미널)',
    lat: 36.819662,
    lng: 127.155822,
    type: 'terminal',
    badge: '🚉 교통거점',
    safetyTip: '신부동 터미널 앞 도로는 대표적인 사고 다발 지점입니다. 인도 주행은 불가하며, 자전거도로로 서행하세요.',
    region: 'cheonan'
  },

  // ───── 아산 ─────
  {
    id: 'landmark-asan-cityhall',
    title: '아산시청',
    desc: '충청남도 아산시 시민로 456 (공공기관)',
    lat: 36.7898,
    lng: 127.0019,
    type: 'city_hall',
    badge: '🏢 시청 우선',
    safetyTip: '시청 주변은 보행자가 많은 행정 구역입니다. 안전 속도(시속 20km)를 유지하세요.',
    region: 'asan'
  },
  {
    id: 'landmark-cheonan-asan-station',
    title: '천안아산역 (KTX)',
    desc: '충청남도 아산시 배방읍 희망로 100 (고속철도역)',
    lat: 36.7943,
    lng: 127.1045,
    type: 'station',
    badge: '🚉 교통거점',
    safetyTip: 'KTX 환승 거점으로 캐리어를 끄는 보행자가 매우 많습니다. 광장 진입 전 반드시 서행하세요.',
    region: 'asan'
  },
  {
    id: 'landmark-soonchunhyang',
    title: '순천향대학교',
    desc: '충청남도 아산시 신창면 순천향로 22 (대학)',
    lat: 36.7708,
    lng: 126.9322,
    type: 'university',
    badge: '🏫 대학교',
    safetyTip: '캠퍼스 내 경사 구간 및 등하교 보행자 밀집도가 높습니다. 정문 진입 시 반드시 서행하세요.',
    region: 'asan'
  },
  {
    id: 'landmark-onyang-station',
    title: '온양온천역',
    desc: '충청남도 아산시 온천대로 1496 (지하철역)',
    lat: 36.7837,
    lng: 127.0042,
    type: 'station',
    badge: '🚉 교통거점',
    safetyTip: '온천 관광객 보행자가 많은 구역입니다. 역 출구 인근 PM 반납 시 지정 주차선을 준수하세요.',
    region: 'asan'
  },
  {
    id: 'landmark-asan-fire',
    title: '아산소방서',
    desc: '충청남도 아산시 시민로 470 (재난안전)',
    lat: 36.7889,
    lng: 127.0035,
    type: 'fire_station',
    badge: '🚒 소방서 우선',
    safetyTip: '긴급 출동 차량이 수시로 출입합니다. 소방서 차고지 앞 5m 이내 PM 주차 금지.',
    region: 'asan'
  }
];
