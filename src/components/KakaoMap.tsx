import { useCallback, useEffect, useRef, useState } from "react";
import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY?.trim();
const DEFAULT_POSITION = { lat: 37.566826, lng: 126.9786567 };

type MapPosition = {
  lat: number;
  lng: number;
};

function KakaoMap() {
  if (!KAKAO_MAP_KEY) {
    return (
      <div role="alert">
        <h2>카카오맵 설정이 필요합니다</h2>
        <p>.env 파일에 VITE_KAKAO_MAP_KEY를 설정한 뒤 Vite 서버를 다시 시작해주세요.</p>
      </div>
    );
  }

  return <LoadedKakaoMap appKey={KAKAO_MAP_KEY} />;
}

function LoadedKakaoMap({ appKey }: { appKey: string }) {
  const [currentPosition, setCurrentPosition] = useState<MapPosition | null>(null);
  const [locationMessage, setLocationMessage] = useState("현재 위치를 확인하는 중입니다.");
  const watchIdRef = useRef<number | null>(null);

  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ["services"],
    // 개발 서버가 HTTP여도 SDK는 항상 HTTPS로 요청한다.
    url: "https://dapi.kakao.com/v2/maps/sdk.js",
  });

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저는 현재 위치 기능을 지원하지 않습니다.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setLocationMessage("현재 위치를 확인하는 중입니다.");
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setCurrentPosition({ lat: coords.latitude, lng: coords.longitude });
        setLocationMessage("현재 위치를 실시간으로 표시하고 있습니다.");
      },
      () => {
        setLocationMessage("현재 위치 권한을 허용하면 내 위치를 표시할 수 있습니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  }, []);

  useEffect(() => {
    requestCurrentLocation();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestCurrentLocation]);

  const locationControls = (
    <div className="map-status" role="status">
      <span>{locationMessage}</span>
      <button type="button" onClick={requestCurrentLocation}>
        현재 위치 다시 확인
      </button>
    </div>
  );

  if (loading) {
    return (
      <section aria-label="현재 위치 지도">
        {locationControls}
        <div>카카오맵을 불러오는 중...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="현재 위치 지도">
        {locationControls}
        <div role="alert">
          <h2>카카오맵 SDK를 불러오지 못했습니다</h2>
          <p>현재 접속 주소: {window.location.origin}</p>
          <p>환경변수 키 확인: 완료</p>
          <p>
            카카오 Developers에서 이 주소를 JavaScript SDK 도메인에 등록하고, 카카오맵 API 사용
            설정을 ON으로 변경한 뒤 페이지를 새로고침해주세요.
          </p>
          <p>
            계속 실패하면 브라우저 개발자 도구의 Network에서 dapi.kakao.com SDK 요청이 차단되지
            않았는지 확인해주세요.
          </p>
        </div>
      </section>
    );
  }

  const mapCenter = currentPosition ?? DEFAULT_POSITION;

  return (
    <section aria-label="현재 위치 지도">
      {locationControls}
      <Map
        center={mapCenter}
        style={{ width: "100%", height: "500px" }}
        level={3}
      >
        {currentPosition && (
          <MapMarker position={currentPosition} title="현재 위치" />
        )}
      </Map>
    </section>
  );
}

export default KakaoMap;
