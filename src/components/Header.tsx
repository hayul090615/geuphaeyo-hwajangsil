type HeaderProps = {
  onMapOpen: () => void;
};

export default function Header({ onMapOpen }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/">급해요<span>화장실</span></a>
      <button className="map-button" type="button" onClick={onMapOpen} aria-haspopup="dialog">
        지도 보기
      </button>
    </header>
  );
}
