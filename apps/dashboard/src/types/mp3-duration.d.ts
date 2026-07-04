declare module 'mp3-duration' {
  /**
   * Retrieves the duration of an mp3 file.
   * @param filePath Path to the mp3 file
   * @param callback Optional callback. If omitted, returns a Promise.
   */
  function mp3Duration(
    filePath: string | Buffer,
    callback?: (err: Error | null, duration: number) => void
  ): Promise<number>;

  export default mp3Duration;
}
