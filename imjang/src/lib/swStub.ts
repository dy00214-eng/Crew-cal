/**
 * 아티팩트(단일 파일) 미리보기용 스텁.
 * 그 빌드에는 서비스워커가 없으므로 virtual:pwa-register 자리를 이걸로 채운다.
 */
export function registerSW(_options?: unknown): (reload?: boolean) => Promise<void> {
  return async () => {};
}
