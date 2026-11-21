// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the exported cover alone, full-viewport.
// `photo` picks the sample (samples/<photo>.png) and `caption` the title.
// window.__shotReady is set once painted (by main.js after render).
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const title = document.getElementById('title');
  if (title) title.value = caption;
  await load(photo);
}
