const REPOSITORY = 'https://github.com/ChristianPRO1982/antlab';

export async function getLatestRelease(fetcher = fetch) {
  const response = await fetcher(
    'https://api.github.com/repos/ChristianPRO1982/antlab/releases/latest',
    {
      signal: AbortSignal.timeout(5000),
      credentials: 'omit',
      headers: { Accept: 'application/vnd.github+json' },
    },
  );
  if (!response.ok)
    throw new Error(`Release GitHub indisponible (HTTP ${response.status}).`);
  const release = await response.json();
  if (
    !release ||
    typeof release.tag_name !== 'string' ||
    !/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.tag_name) ||
    release.draft === true ||
    release.prerelease === true
  )
    throw new TypeError(
      'La réponse GitHub ne désigne pas une release stable valide.',
    );
  return {
    version: release.tag_name.slice(1),
    url: `${REPOSITORY}/releases/tag/${release.tag_name}`,
  };
}

export async function updateReleaseLink(link) {
  try {
    const release = await getLatestRelease();
    link.textContent = release.version;
    link.href = release.url;
    link.setAttribute(
      'aria-label',
      `Dernière release publiée : ${release.version}`,
    );
    link.title = `Voir les notes de la release ${release.version}`;
  } catch (error) {
    // Le lien HTML reste utilisable hors ligne, sans bloquer le laboratoire.
    link.title = `Version indisponible : ${error.message}`;
    link.setAttribute('aria-label', 'Releases — version indisponible');
  }
}
