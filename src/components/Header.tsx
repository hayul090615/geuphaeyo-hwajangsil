type HeaderProps = {
  isDarkMode: boolean;
  onThemeToggle: () => void;
};

export default function Header({ isDarkMode, onThemeToggle }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/">급해요<span>화장실</span></a>
      <div className="header-actions">
        <button className="theme-toggle" type="button" onClick={onThemeToggle} aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}>
          <span aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
          {isDarkMode ? '라이트' : '다크'}
        </button>
      </div>
    </header>
  );
}
