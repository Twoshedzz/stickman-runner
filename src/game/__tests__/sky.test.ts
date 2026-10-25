import { moonAt, getTheme } from '../sky';
import { STAGES } from '../stages';

/**
 * The sky at about 200 moments through each stage, including after the finish (the Stage
 * Clear screen) and the edges of each stage's special cases. The snapshot was taken from
 * the sky maths as it was in GameCanvas, before it moved here: a change to how the sky
 * works shows up as a difference. If you change a stage's sky on purpose, look over the
 * difference and update the snapshot (npx jest sky -u).
 */
const momentsFor = (courseLength: number) => {
    const end = courseLength * 1.15;
    const even = Array.from({ length: 200 }, (_, i) => (end * i) / 199);
    const edges = [2999, 3000, 3001, 4999, 5000, 5001, 9999, 10000, 31999, 32000, 32001,
        courseLength - 1, courseLength, courseLength + 1, 999999];
    return [...even, ...edges].sort((a, b) => a - b);
};

describe('sky', () => {
    for (const stage of STAGES) {
        it(`${stage.name} looks the same as before`, () => {
            const samples = momentsFor(stage.courseLength).map((distance) => {
                const theme = getTheme(distance, stage);
                const moon = moonAt(distance, stage, theme);
                return `${distance.toFixed(1)}: ${JSON.stringify({ ...theme, moon })}`;
            });
            expect(samples).toMatchSnapshot();
        });
    }
});
