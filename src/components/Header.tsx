type HeaderProps = {
  onRequestOpen: () => void;
  onAddOpen: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
};

export default function Header({ onRequestOpen, onAddOpen, onLogout, isDarkMode, onThemeToggle }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/">급해요<span>화장실</span></a>
      <div className="header-actions">
        <button className="theme-toggle" type="button" onClick={onThemeToggle} aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}>
          <span aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>{isDarkMode ? '라이트' : '다크'}
        </button>
        <button className="request-button" type="button" onClick={onRequestOpen} aria-haspopup="dialog">요청사항</button>
        <button className="service-button" type="button" onClick={onAddOpen} aria-haspopup="dialog">화장실 추가</button>
        <button className="logout-button" type="button" onClick={onLogout}>로그아웃</button>
      </div>
    </header>
  );
}
