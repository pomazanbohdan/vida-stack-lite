export function observeOwnedProcessGroup(pid: number | null): 'gone' | 'present' | 'unknown' {
  if (process.platform === 'win32' || pid === null || !Number.isSafeInteger(pid) || pid <= 1) return 'unknown';
  try {
    process.kill(-pid, 0);
    return 'present';
  } catch (error) {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ESRCH'
      ? 'gone'
      : 'unknown';
  }
}
