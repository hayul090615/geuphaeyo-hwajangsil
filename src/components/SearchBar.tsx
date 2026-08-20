type SearchBarProps = { value:string; onChange:(value:string)=>void };
export default function SearchBar({value,onChange}:SearchBarProps) { return <label className="search-bar"><span aria-hidden="true">⌕</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder="주소나 장소를 검색해보세요" /></label>; }
