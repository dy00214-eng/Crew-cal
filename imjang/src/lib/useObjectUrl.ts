import { useEffect, useState } from 'react';

/**
 * Blob -> object URL. 언마운트·교체 시 반드시 revoke 한다.
 * 안 그러면 목록을 오르내리는 동안 메모리가 샌다.
 */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

/** 배열은 호출하는 쪽에서 useMemo 로 고정해 넘긴다. 안 그러면 렌더마다 URL 을 다시 만든다. */
export function useObjectUrls(blobs: Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = blobs.map((b) => URL.createObjectURL(b));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);
  return urls;
}
