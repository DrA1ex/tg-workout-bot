import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const PWA_ASSET_DIR = 'pwa-assets';

const ICON_SIZES = [192, 512];
const APPLE_TOUCH_ICON_SIZE = 180;

const VIEWPORTS = [
    // iPhone 11 Pro,
    // iPhone 12 mini / 13 mini
    {width: 375, height: 812, ratio: 3},

    // iPhone 12 / 12 Pro,
    // iPhone 13 / 13 Pro,
    // iPhone 14,
    // iPhone 16e / 17e
    {width: 390, height: 844, ratio: 3},

    // iPhone 14 Pro,
    // iPhone 15 / 15 Pro,
    // iPhone 16
    {width: 393, height: 852, ratio: 3},

    // iPhone 16 Pro,
    // iPhone 17 / 17 Pro
    {width: 402, height: 874, ratio: 3},

    // iPhone 11
    {width: 414, height: 896, ratio: 2},

    // iPhone 11 Pro Max
    {width: 414, height: 896, ratio: 3},

    // iPhone Air
    {width: 420, height: 912, ratio: 3},

    // iPhone 12 Pro Max / 13 Pro Max,
    // iPhone 14 Plus
    {width: 428, height: 926, ratio: 3},

    // iPhone 14 Pro Max,
    // iPhone 15 Plus / 15 Pro Max,
    // iPhone 16 Plus
    {width: 430, height: 932, ratio: 3},

    // iPhone 16 Pro Max,
    // iPhone 17 Pro Max
    {width: 440, height: 956, ratio: 3},

    // iPad mini 6th gen / 7th gen
    {width: 744, height: 1133, ratio: 2},

    // iPad 10th / 11th gen,
    // iPad Air 5th gen,
    // iPad Air 11" 6th / 7th / 8th gen
    {width: 820, height: 1180, ratio: 2},

    // iPad Pro 11" 5th / 6th gen
    {width: 834, height: 1194, ratio: 2},

    // iPad Pro 11" M4 / newer 11" Pro
    {width: 834, height: 1210, ratio: 2},

    // iPad Pro 12.9" 5th / 6th gen,
    // iPad Air 13" 6th / 7th / 8th gen
    {width: 1024, height: 1366, ratio: 2},

    // iPad Pro 13" M4 / newer 13" Pro
    {width: 1032, height: 1376, ratio: 2},
];

const THEMES = {
    light: {
        background: '#f8fafc',
        text: '#64748b',
    },
    dark: {
        background: '#151b23',
        text: '#94a3b8',
    },
};

function getIconSvg({standalone = true} = {}) {
    const rootAttributes = [
        'xmlns="http://www.w3.org/2000/svg"',
        'viewBox="0 0 512 512"',
        standalone ? 'role="img"' : '',
        standalone ? 'aria-label="Workout app icon"' : '',
    ].filter(Boolean).join(' ');

    return `<svg ${rootAttributes}>
  <defs>
    <linearGradient id="bg" x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2f7cff"/>
      <stop offset="1" stop-color="#0d48d8"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <rect x="142" y="238" width="228" height="36" rx="18" fill="#ffffff"/>

  <rect x="82" y="210" width="26" height="92" rx="13" fill="#ffffff"/>
  <rect x="116" y="184" width="38" height="144" rx="19" fill="#ffffff"/>
  <rect x="164" y="202" width="30" height="108" rx="15" fill="#ffffff"/>

  <rect x="404" y="210" width="26" height="92" rx="13" fill="#ffffff"/>
  <rect x="358" y="184" width="38" height="144" rx="19" fill="#ffffff"/>
  <rect x="318" y="202" width="30" height="108" rx="15" fill="#ffffff"/>

  <path
    d="M144 384
       H368
       C386 384 400 370 400 352
       V334
       H352
       V344
       C352 350 348 354 342 354
       H170
       C164 354 160 350 160 344
       V334
       H112
       V352
       C112 370 126 384 144 384Z"
    fill="#b9d5ff"
    opacity="0.95"
  />
</svg>
`;
}

function startupImageName({width, height, ratio, orientation, theme}) {
    return `launch-${width}x${height}@${ratio}x-${orientation}-${theme}.png`;
}

function getStartupImageEntries() {
    return VIEWPORTS.flatMap(viewport => (
        ['portrait', 'landscape'].flatMap(orientation => (
            Object.keys(THEMES).map(theme => ({
                ...viewport,
                orientation,
                theme,
                fileName: startupImageName({...viewport, orientation, theme}),
            }))
        ))
    ));
}

export function getStartupImageLinks({basePath = ''} = {}) {
    const normalizedBasePath = basePath.replace(/\/$/, '');

    return getStartupImageEntries()
        .map(({width, height, ratio, orientation, theme, fileName}) => {
            const href = `${normalizedBasePath}/${PWA_ASSET_DIR}/${fileName}`;

            const media = [
                'screen',
                `(device-width: ${width}px)`,
                `(device-height: ${height}px)`,
                `(-webkit-device-pixel-ratio: ${ratio})`,
                `(orientation: ${orientation})`,
                `(prefers-color-scheme: ${theme})`,
            ].join(' and ');

            return `    <link rel="apple-touch-startup-image" href="${href}" media="${media}">`;
        })
        .join('\n');
}

function getStartupImageSvg({width, height, ratio, orientation, theme}) {
    const pixelWidth = width * ratio;
    const pixelHeight = height * ratio;
    const imageWidth = orientation === 'portrait' ? pixelWidth : pixelHeight;
    const imageHeight = orientation === 'portrait' ? pixelHeight : pixelWidth;
    const baseSize = Math.min(imageWidth, imageHeight);
    const tileSize = Math.round(baseSize * 0.17);
    const tileLeft = Math.round((imageWidth - tileSize) / 2);
    const tileTop = Math.round((imageHeight - tileSize) / 2 - baseSize * 0.035);
    const labelTop = tileTop + tileSize + Math.round(tileSize * 0.24);
    const lineHeight = Math.max(5, Math.round(baseSize * 0.008));
    const firstLineWidth = Math.round(imageWidth * 0.28);
    const secondLineWidth = Math.round(imageWidth * 0.18);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">
  <rect width="${imageWidth}" height="${imageHeight}" fill="${THEMES[theme].background}"/>

  <svg x="${tileLeft}" y="${tileTop}" width="${tileSize}" height="${tileSize}" viewBox="0 0 512 512">
    ${getIconSvg({standalone: false})
        .replace(/^<svg\b[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')}
  </svg>

  <rect
    x="${Math.round((imageWidth - firstLineWidth) / 2)}"
    y="${labelTop}"
    width="${firstLineWidth}"
    height="${lineHeight}"
    rx="${lineHeight / 2}"
    fill="${THEMES[theme].text}"
    opacity="0.55"
  />

  <rect
    x="${Math.round((imageWidth - secondLineWidth) / 2)}"
    y="${labelTop + lineHeight * 3}"
    width="${secondLineWidth}"
    height="${lineHeight}"
    rx="${lineHeight / 2}"
    fill="${THEMES[theme].text}"
    opacity="0.28"
  />
</svg>
`;
}

async function renderSvgPng(svg) {
    return sharp(Buffer.from(svg))
        .png()
        .toBuffer();
}

async function renderIcon(size) {
    return sharp(Buffer.from(getIconSvg()))
        .resize(size, size)
        .png()
        .toBuffer();
}

async function renderStartupImage(entry) {
    return renderSvgPng(getStartupImageSvg(entry));
}

export async function generatePwaAssets(outputDir) {
    const targetDir = path.join(outputDir, PWA_ASSET_DIR);
    await mkdir(targetDir, {recursive: true});

    await writeFile(path.join(targetDir, 'icon.svg'), getIconSvg());

    await writeFile(
        path.join(targetDir, 'apple-touch-icon.png'),
        await renderIcon(APPLE_TOUCH_ICON_SIZE),
    );

    await Promise.all(ICON_SIZES.map(async size => {
        const icon = await renderIcon(size);

        await Promise.all([
            writeFile(path.join(targetDir, `icon-${size}.png`), icon),
            writeFile(path.join(targetDir, `maskable-${size}.png`), icon),
        ]);
    }));

    await Promise.all(getStartupImageEntries().map(async entry => {
        await writeFile(path.join(targetDir, entry.fileName), await renderStartupImage(entry));
    }));
}