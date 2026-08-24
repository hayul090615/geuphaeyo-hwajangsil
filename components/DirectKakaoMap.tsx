import { useCallback, useEffect, useRef, useState } from "react";

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY?.trim();
const DEFAULT_POSITION = { lat: 37.566826, lng: 126.9786567 };
const SDK_SCRIPT_ID = "kakao-map-sdk";

type MapPosition = {
  lat: number;
  lng: number;
};

type KakaoMapInstance = {
  setCenter(center: unknown): void;
};

type KakaoMapsApi = {
  LatLng: new (lat: number, lng: number) => unknown;
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMapInstance;
  Marker: new (options: { position: unknown; title?: string }) => { setMap(map: KakaoMapInstance): void };
  load?: (callback: () => void) => void;
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

function loadKakaoSdk(appKey: string): Promise<void> {
  if (window.kakao?.maps?.Map) {
    return Promise.resolve();
  }

  if (window.kakao?.maps?.load) {
    return new Promise((resolve) => window.kakao?.maps.load?.(resolve));
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(resolve);
        return;
      }
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Kakao map SDK load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao map SDK load failed"));
    document.head.appendChild(script);
  });
}

function DirectKakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markerRef = useRef<{ setMap(map: KakaoMapInstance): void } | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<MapPosition | null>(null);
  const [locationMessage, setLocationMessage] = useState("현재 위치를 확인하는 중입니다.");

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저는 현재 위치 기능을 지원하지 않습니다.");
      return;
    }

    setLocationMessage("현재 위치를 확인하는 중입니다.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentPosition({ lat: coords.latitude, lng: coords.longitude });
        setLocationMessage("현재 위치를 지도 위에 표시했습니다.");
      },
      () => setLocationMessage("위치 권한을 허용하면 현재 위치를 표시할 수 있습니다."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!KAKAO_MAP_KEY) {
      setSdkError(true);
      return;
    }

    loadKakaoSdk(KAKAO_MAP_KEY).then(() => setSdkReady(true)).catch(() => setSdkError(true));
  }, []);

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) {
      return;
    }

    const maps = window.kakao.maps;
    const position = currentPosition ?? DEFAULT_POSITION;
    const center = new maps.LatLng(position.lat, position.lng);

    if (!mapRef.current) {
      mapRef.current = new maps.Map(containerRef.current, { center, level: 3 });
    } else {
      mapRef.current.setCenter(center);
    }

    if (currentPosition && !markerRef.current) {
      markerRef.current = new maps.Marker({ position: center, title: "현재 위치" });
      markerRef.current.setMap(mapRef.current);
    }
  }, [currentPosition, sdkReady]);

  if (sdkError) {
    return <div role="alert">카카오맵을 불러오지 못했습니다. 잠시 후 새로고침해주세요.</div>;
  }

  return (
    <section aria-label="현재 위치 지도">
      <div className="map-status" role="status">
        <span>{locationMessage}</span>
        <button type="button" onClick={requestCurrentLocation}>현재 위치 사용하기</button>
      </div>
      {!sdkReady && <div>카카오맵을 불러오는 중...</div>}
      <div ref={containerRef} style={{ width: "100%", height: "500px", display: sdkReady ? "block" : "none" }} />
    </section>
  );
}

export default DirectKakaoMap;
