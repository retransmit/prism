export default function sleep(ms: number): Promise<void> {
  return new Promise((success) => {
    setTimeout(success, ms);
  });
}
