// Covers the whole parent. React Native 0.85 dropped StyleSheet.absoluteFillObject; these are
// the same five values it held, on the phone and on the web.
export const fillParent = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;
