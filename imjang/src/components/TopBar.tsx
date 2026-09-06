import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function TopBar({
  title,
  back,
  right,
}: {
  title: ReactNode;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      {back != null && (
        <Link to={back} aria-label="뒤로">
          ←
        </Link>
      )}
      <h1>{title}</h1>
      <span className="spacer" />
      {right}
    </header>
  );
}
