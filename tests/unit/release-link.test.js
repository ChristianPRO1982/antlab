import { expect, test, vi } from 'vitest';
import { getLatestRelease } from '../../src/release-link.js';

test('lit la release stable et construit le lien depuis son tag validé', async () => {
  const fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      tag_name: 'v1.5.0',
      html_url: 'https://example.invalid',
    }),
  }));
  await expect(getLatestRelease(fetcher)).resolves.toEqual({
    version: '1.5.0',
    url: 'https://github.com/ChristianPRO1982/antlab/releases/tag/v1.5.0',
  });
  expect(fetcher).toHaveBeenCalledWith(
    'https://api.github.com/repos/ChristianPRO1982/antlab/releases/latest',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
});

test.each(['v1.6.0', 'v2.0.0', 'v1.5.1'])(
  'suit automatiquement une nouvelle release %s',
  async (tag_name) => {
    const release = await getLatestRelease(async () => ({
      ok: true,
      json: async () => ({ tag_name }),
    }));
    expect(release.version).toBe(tag_name.slice(1));
    expect(release.url.endsWith(`/tag/${tag_name}`)).toBe(true);
  },
);

test.each([
  null,
  {},
  { tag_name: 'v01.5.0' },
  { tag_name: 'v1.5.0-beta.1' },
  { tag_name: '<script>' },
  { tag_name: 'v1.5.0', draft: true },
  { tag_name: 'v1.5.0', prerelease: true },
])('refuse une réponse de release invalide : %j', async (body) => {
  await expect(
    getLatestRelease(async () => ({ ok: true, json: async () => body })),
  ).rejects.toThrow(/release/i);
});

test('signale un refus HTTP et une panne réseau', async () => {
  await expect(
    getLatestRelease(async () => ({ ok: false, status: 403 })),
  ).rejects.toThrow(/403/);
  await expect(
    getLatestRelease(async () => {
      throw new Error('Hors ligne');
    }),
  ).rejects.toThrow('Hors ligne');
});
