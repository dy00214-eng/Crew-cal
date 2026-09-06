export interface StorageUsage {
  usage?: number;
  quota?: number;
  ratio?: number; // 0~1
  supported: boolean;
}

export async function storageUsage(): Promise<StorageUsage> {
  if (!navigator.storage?.estimate) return { supported: false };
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const ratio = usage != null && quota ? usage / quota : undefined;
    return { usage, quota, ratio, supported: true };
  } catch {
    return { supported: false };
  }
}

/** 사파리는 안 쓰면 지워버린다. 설치형으로 쓸 때 한 번 눌러두면 좋다. */
export async function requestPersist(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
