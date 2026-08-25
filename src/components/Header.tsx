type HeaderProps = { onAddOpen: () => void };

export default function Header({ onAddOpen }: HeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="/">급해요<span>화장실</span></a>
      <button className="service-button" type="button" onClick={onAddOpen} aria-haspopup="dialog">화장실 추가</button>
    </header>
  );
}
