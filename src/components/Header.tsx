type HeaderProps = {
  onRequestOpen: () => void;
  onAddOpen: () => void;
  onLogout: () => void;
};

export default function Header({ onRequestOpen, onAddOpen, onLogout }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/">급해요<span>화장실</span></a>
      <div className="header-actions">
        <button className="request-button" type="button" onClick={onRequestOpen} aria-haspopup="dialog">요청사항</button>
        <button className="service-button" type="button" onClick={onAddOpen} aria-haspopup="dialog">화장실 추가</button>
        <button className="logout-button" type="button" onClick={onLogout}>로그아웃</button>
      </div>
    </header>
  );
}
