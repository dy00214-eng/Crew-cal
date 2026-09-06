import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TopBar({
  title,
  back,
  backReplace,
  left,
  right,
}: {
  title: ReactNode;
  /** 경로를 주면 그 경로로, '-1' 을 주면 온 길을 되짚어 간다. */
  back?: string;
  /** 되돌아갈 때 히스토리에 새 칸을 쌓지 않는다 (위치 찍기처럼 잠깐 들르는 화면) */
  backReplace?: boolean;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      {back === '-1' ? (
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          ←
        </button>
      ) : back != null ? (
        <Link to={back} replace={backReplace} aria-label="뒤로">
          ←
        </Link>
      ) : null}
      {left}
      <h1>{title}</h1>
      <span className="spacer" />
      {right}
    </header>
  );
}
