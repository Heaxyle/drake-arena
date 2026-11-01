// A small PNG / APNG reader and writer for the icon tools (plain Node, no packages): design/icons/test.js reads the V2 set
// with it (sizes, the loops' frames and timing, the stills' pixels), design/icons/export-twitch.js writes the reward images.
// Reads 8-bit RGBA, non-interlaced PNGs (every file in design/icons/v2/); anything else throws.
const zlib = require('zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const crc32 = buf => {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};

// The file's chunks, in order ({ type, data }), each checked against its CRC
function chunks(buf) {
    if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
    const out = [];
    for (let p = 8; p < buf.length;) {
        const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
        if (crc32(buf.subarray(p + 4, p + 8 + len)) !== buf.readUInt32BE(p + 8 + len)) throw new Error(`${type}: bad CRC`);
        out.push({ type, data });
        p += 12 + len;
        if (type === 'IEND') break;
    }
    return out;
}

// Size and format, and for an APNG its animation: the frame count, how many times it plays (0 = forever) and each
// frame's time in ms (a zero denominator means 1/100 s, as the APNG spec says)
function info(buf) {
    const cs = chunks(buf), ih = cs[0].type === 'IHDR' ? cs[0].data : null;
    if (!ih) throw new Error('no IHDR first');
    const actl = cs.find(c => c.type === 'acTL');
    const fctl = cs.filter(c => c.type === 'fcTL').map(c => ({
        width: c.data.readUInt32BE(4), height: c.data.readUInt32BE(8), x: c.data.readUInt32BE(12), y: c.data.readUInt32BE(16),
        ms: 1000 * c.data.readUInt16BE(20) / (c.data.readUInt16BE(22) || 100),
    }));
    const first = cs.findIndex(c => c.type === 'fcTL'), idat = cs.findIndex(c => c.type === 'IDAT');
    return {
        width: ih.readUInt32BE(0), height: ih.readUInt32BE(4), bitDepth: ih[8], colorType: ih[9], interlace: ih[12],
        apng: actl ? { frames: actl.data.readUInt32BE(0), plays: actl.data.readUInt32BE(4), fctl, firstFrameIsImage: first !== -1 && first < idat } : null,
    };
}

// Undoes the per-row filters (PNG filter types 0–4) of 8-bit RGBA rows
function unfilter(raw, w, h) {
    const bpp = 4, stride = w * bpp, out = Buffer.alloc(stride * h);
    if (raw.length !== (stride + 1) * h) throw new Error('image data has the wrong length');
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], row = y * stride, src = y * (stride + 1) + 1;
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[row - stride + x] : 0, c = x >= bpp && y ? out[row - stride + x - bpp] : 0;
            let v = raw[src + x];
            if (f === 1) v += a;
            else if (f === 2) v += b;
            else if (f === 3) v += (a + b) >> 1;
            else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
            else if (f !== 0) throw new Error(`unknown filter ${f}`);
            out[row + x] = v & 255;
        }
    }
    return out;
}

// The image (an APNG's default image, its first frame) as RGBA bytes, row by row
function decode(buf) {
    const i = info(buf);
    if (i.bitDepth !== 8 || i.colorType !== 6 || i.interlace !== 0) throw new Error('not an 8-bit RGBA, non-interlaced PNG');
    const idat = Buffer.concat(chunks(buf).filter(c => c.type === 'IDAT').map(c => c.data));
    return { width: i.width, height: i.height, data: unfilter(zlib.inflateSync(idat), i.width, i.height) };
}

// An 8-bit RGBA PNG from RGBA bytes (no filtering: the reward images are small)
function encode(width, height, data) {
    const chunk = (type, body) => {
        const head = Buffer.alloc(8), tail = Buffer.alloc(4);
        head.writeUInt32BE(body.length, 0);
        head.write(type, 4, 'latin1');
        tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
        return Buffer.concat([head, body, tail]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.set([8, 6, 0, 0, 0], 8);
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
    return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { chunks, info, decode, encode, crc32 };
