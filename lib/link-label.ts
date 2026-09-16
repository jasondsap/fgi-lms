// Display label for an external link: the bare host, so a deep URL like
// https://www.pew.org/en/about/experts/brandee-izquierdo reads "www.pew.org"
// (Jason, 9-16-26). Homepage URLs are unchanged from the old strip-the-
// protocol rendering.
export function linkLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}
