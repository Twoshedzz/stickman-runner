/** A ref that always holds the latest value, for handlers set up once that need today's version. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import { useRef } from 'react';

export const useLatest = <T,>(value: T) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
};
