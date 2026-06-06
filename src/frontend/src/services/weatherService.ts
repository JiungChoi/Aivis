export interface CityOption {
  key: string;
  name: string;
  englishName: string;
  lat: number;
  lon: number;
}

export const CITIES: CityOption[] = [
  { key: 'seoul',    name: '서울',  englishName: 'Seoul',     lat: 37.5665,  lon: 126.9780 },
  { key: 'busan',    name: '부산',  englishName: 'Busan',     lat: 35.1796,  lon: 129.0756 },
  { key: 'incheon',  name: '인천',  englishName: 'Incheon',   lat: 37.4563,  lon: 126.7052 },
  { key: 'daegu',    name: '대구',  englishName: 'Daegu',     lat: 35.8714,  lon: 128.6014 },
  { key: 'daejeon',  name: '대전',  englishName: 'Daejeon',   lat: 36.3504,  lon: 127.3845 },
  { key: 'gwangju',  name: '광주',  englishName: 'Gwangju',   lat: 35.1595,  lon: 126.8526 },
  { key: 'jeju',     name: '제주',  englishName: 'Jeju',      lat: 33.4996,  lon: 126.5312 },
  { key: 'tokyo',    name: '도쿄',  englishName: 'Tokyo',     lat: 35.6762,  lon: 139.6503 },
  { key: 'osaka',    name: '오사카', englishName: 'Osaka',    lat: 34.6937,  lon: 135.5023 },
  { key: 'beijing',  name: '베이징', englishName: 'Beijing',  lat: 39.9042,  lon: 116.4074 },
  { key: 'shanghai', name: '상하이', englishName: 'Shanghai', lat: 31.2304,  lon: 121.4737 },
  { key: 'newyork',  name: '뉴욕',  englishName: 'New York',  lat: 40.7128,  lon:  -74.0060 },
  { key: 'london',   name: '런던',  englishName: 'London',    lat: 51.5074,  lon:   -0.1278 },
  { key: 'paris',    name: '파리',  englishName: 'Paris',     lat: 48.8566,  lon:    2.3522 },
  { key: 'sydney',   name: '시드니', englishName: 'Sydney',   lat: -33.8688, lon:  151.2093 },
];

const CITY_KEY_LS = 'aivis_weather_city';

export interface WeatherData {
  temperature: number;
  icon: string;
  city: string;
}

function weatherCodeToIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

export const weatherService = {
  getSelectedCityKey(): string {
    return localStorage.getItem(CITY_KEY_LS) ?? 'seoul';
  },

  setSelectedCityKey(key: string) {
    localStorage.setItem(CITY_KEY_LS, key);
  },

  async getCurrent(cityKey?: string): Promise<WeatherData> {
    const key = cityKey ?? this.getSelectedCityKey();
    const city = CITIES.find((c) => c.key === key) ?? CITIES[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('날씨 정보를 불러올 수 없습니다.');
    const json = await res.json();
    const cw = json.current_weather;
    return {
      temperature: Math.round(cw.temperature),
      icon: weatherCodeToIcon(cw.weathercode),
      city: city.name,
    };
  },
};
