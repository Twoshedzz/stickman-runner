/** What the crash screen saves on its way up (crashSave.ts). */
import { saveBeforeCrash, setCrashSave } from '../loop/crashSave';

describe('saveBeforeCrash', () => {
    it('calls the save the score table left', () => {
        const save = jest.fn();
        setCrashSave(save);
        saveBeforeCrash();
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("doesn't let a failed save get in the way of the crash screen", () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        setCrashSave(() => { throw new Error('storage full'); });
        expect(saveBeforeCrash).not.toThrow();
        warn.mockRestore();
    });
});
