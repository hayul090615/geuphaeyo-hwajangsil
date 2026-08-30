type ServiceFooterProps = {
  onMapOpen: () => void;
  onRequestOpen: () => void;
  onToiletAdd: () => void;
};

export default function ServiceFooter({ onMapOpen, onRequestOpen, onToiletAdd }: ServiceFooterProps) {
  return (
    <footer className="service-footer">
      <div className="service-footer-main">
        <div className="service-footer-brand">
          <button type="button" onClick={onMapOpen}>급해요<span>화장실</span></button>
          <p>필요한 순간, 가장 가까운 화장실까지 빠르게 안내합니다.</p>
        </div>

        <nav className="service-footer-links" aria-label="푸터 서비스 메뉴">
          <strong>서비스</strong>
          <button type="button" onClick={onRequestOpen}>정보 수정 요청</button>
          <button type="button" onClick={onToiletAdd}>화장실 제보</button>
        </nav>

        <div className="service-footer-project">
          <strong>프로젝트</strong>
          <span>React · TypeScript</span>
          <span>Kakao Map SDK</span>
          <span>Node.js · PostgreSQL</span>
        </div>
      </div>

      <div className="service-footer-bottom">
        <span>© {new Date().getFullYear()} 급해요 화장실</span>
        <span>함께 만드는 정확한 화장실 정보</span>
      </div>
    </footer>
  );
}
