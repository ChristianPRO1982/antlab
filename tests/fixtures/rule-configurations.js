export const RULE_CONFIGURATIONS = [
  { central: 'single-flip' },
  { central: 'cross-flip' },
  { central: 'center-master' },
  { central: 'single-flip', optional: ['rotate-branches-clockwise'] },
  ...['inverted-majority', 'majority-wins'].flatMap((central) =>
    [1, 2, 3, 4, 5].map((threshold) => ({ central, threshold })),
  ),
];
