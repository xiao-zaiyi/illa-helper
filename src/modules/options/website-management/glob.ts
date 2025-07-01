/**
 * There are some characters which have a special meaning in a glob pattern.
 * We need to escape them to make them "normal" characters.
 */
const specials = [
    '\\',
    '/',
    '.',
    '*',
    '+',
    '?',
    '|',
    '(',
    ')',
    '[',
    ']',
    '{',
    '}',
    '$',
    '^',
];

const globToRegexp = (glob: string): RegExp => {
    let regexp = '';
    let i = 0;
    while (i < glob.length) {
        const c = glob[i++];
        switch (c) {
            case '*':
                regexp += '.*';
                break;
            case '?':
                regexp += '.';
                break;
            case '[':
                let cls = '';
                let lo = '';
                if (glob[i] === '!') {
                    cls = '^';
                    i++;
                }
                while (glob[i] !== ']' && glob[i]) {
                    const c_ = glob[i++];
                    if (c_ === '-') {
                        if (glob[i] && lo) {
                            cls += lo + '-' + glob[i++];
                            lo = '';
                        } else {
                            cls += '\\-';
                            lo = '';
                        }
                    } else {
                        cls += c_;
                        lo = c_;
                    }
                }
                if (lo && lo !== '^') {
                    // Handle remaining characters
                }
                i++; // Closing brace
                regexp += '[' + cls + ']';
                break;
            case '\\':
                regexp += '\\' + glob[i++];
                break;
            default:
                if (specials.indexOf(c) > -1) {
                    regexp += '\\';
                }
                regexp += c;
                break;
        }
    }
    return new RegExp('^' + regexp + '$');
};

/**
 * The public interface
 */
export const glob = {
    /**
     * Match a string against a glob pattern.
     * @param pattern The glob pattern to match against
     * @param string The string to match
     * @return true if the string matches the pattern, false if not.
     */
    match: (pattern: string, string: string): boolean => {
        return globToRegexp(pattern).test(string);
    },
};

export default glob;