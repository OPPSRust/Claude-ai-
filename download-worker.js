// Downloads the Gemma model file into the browser's private file storage (OPFS).
// Runs in a worker so it can write with a sync access handle: bytes land on disk as
// they arrive, which lets an interrupted download resume from where it stopped.

let controller = null;

self.onmessage = async (event) => {
  const msg = event.data || {};
  if (msg.type === 'cancel') {
    if (controller) controller.abort();
    return;
  }
  if (msg.type !== 'start') return;

  const { url, size, dir, file } = msg;
  controller = new AbortController();
  let handle = null;

  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(dir, { create: true });
    const fileHandle = await folder.getFileHandle(file, { create: true });
    handle = await fileHandle.createSyncAccessHandle();

    let offset = await handle.getSize();
    if (offset > size) {
      await handle.truncate(0);
      offset = 0;
    }
    if (offset === size) {
      await handle.close();
      handle = null;
      self.postMessage({ type: 'done', size });
      return;
    }

    const headers = offset > 0 ? { Range: `bytes=${offset}-` } : {};
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.status === 200) {
      // The server sent the whole file, so start over.
      if (offset > 0) {
        await handle.truncate(0);
        offset = 0;
      }
    } else if (res.status === 206) {
      const range = /bytes (\d+)-/.exec(res.headers.get('content-range') || '');
      if (range && Number(range[1]) !== offset) throw fatal('The download server sent the wrong part of the file.');
    } else {
      throw fatal(`The download server answered ${res.status}.`);
    }

    const reader = res.body.getReader();
    let lastPost = 0;
    let sinceFlush = 0;
    self.postMessage({ type: 'progress', loaded: offset, size });

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      let written = 0;
      while (written < value.byteLength) {
        const n = handle.write(value.subarray(written), { at: offset + written });
        if (!n) throw fatal('Could not write to storage.');
        written += n;
      }
      offset += value.byteLength;
      sinceFlush += value.byteLength;
      if (sinceFlush >= 32 * 1024 * 1024) {
        await handle.flush();
        sinceFlush = 0;
      }
      const now = Date.now();
      if (now - lastPost > 200) {
        self.postMessage({ type: 'progress', loaded: offset, size });
        lastPost = now;
      }
    }

    await handle.flush();
    const finalSize = await handle.getSize();
    await handle.close();
    handle = null;
    self.postMessage({ type: 'progress', loaded: finalSize, size });
    if (finalSize !== size) {
      self.postMessage({ type: 'paused', message: 'The connection closed early. Tap Resume to finish.' });
      return;
    }
    self.postMessage({ type: 'done', size: finalSize });
  } catch (err) {
    try {
      if (handle) {
        await handle.flush();
        await handle.close();
      }
    } catch (e) { /* already closed */ }
    const name = err && err.name;
    if (name === 'AbortError') {
      self.postMessage({ type: 'paused', message: '' });
    } else if (name === 'QuotaExceededError') {
      self.postMessage({ type: 'error', message: 'Your iPhone ran out of space. Free up about 2.5 GB, then tap Resume.' });
    } else if (err && err.fatal) {
      self.postMessage({ type: 'error', message: err.message });
    } else {
      // Network drops land here. The bytes so far are saved, so this is resumable.
      self.postMessage({ type: 'paused', message: 'The connection dropped. Your progress is saved.' });
    }
  } finally {
    controller = null;
  }
};

function fatal(message) {
  const e = new Error(message);
  e.fatal = true;
  return e;
}
