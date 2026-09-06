import { useObjectUrl } from '../lib/useObjectUrl.ts';

/** 목록 행 썸네일. 언마운트 시 object URL 을 회수한다. */
export default function Thumb({ blob, alt }: { blob?: Blob; alt: string }) {
  const url = useObjectUrl(blob);
  if (!url) return <div className="thumb thumb-empty" aria-hidden="true">—</div>;
  return <img className="thumb" src={url} alt={alt} loading="lazy" decoding="async" />;
}
