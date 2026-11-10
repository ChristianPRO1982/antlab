import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    // Temporaire : aucune logique scientifique n'existe dans le socle.
    // Retirer cette option dès le premier test unitaire ou d'intégration.
    passWithNoTests: true,
  },
});
