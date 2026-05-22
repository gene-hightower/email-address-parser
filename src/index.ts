/*

From <https://datatracker.ietf.org/doc/html/rfc5321#section-4.5.3>

4.5.3.  Sizes and Timeouts

4.5.3.1.  Size Limits and Minimums

   There are several objects that have required minimum/maximum sizes.
   Every implementation MUST be able to receive objects of at least
   these sizes.  Objects larger than these sizes SHOULD be avoided when
   possible.  However, some Internet mail constructs such as encoded
   X.400 addresses (RFC 2156 [35]) will often require larger objects.
   Clients MAY attempt to transmit these, but MUST be prepared for a
   server to reject them if they cannot be handled by it.  To the
   maximum extent possible, implementation techniques that impose no
   limits on the length of these objects should be used.

*/

export function parse_email_address(address: string) {

    // An insane length, to protect the parsing code from huge input. SMTP line limit, minus command size.
    const insane_length = 1000 - "MAIL FROM:<>\r\n".length;

    if (address.length > insane_length) {
        throw new Error("address too long");
    }

    const at_idx = address.lastIndexOf('@')    // One must be found in a valid address.
    if (at_idx === -1) {
        throw new Error("address contains no @");
    }

    const local_part = address.substring(0, at_idx);
    const domain = address.substring(at_idx + 1);

    if (domain.length === 0) {
        throw new Error("no domain");
    }
    if (domain.length > 253) {        // The DNS protocol limit for a domain name, an address literal will be shorter.
        throw new Error("domain too long");
    }

    if (domain[0] === '[' && domain.at(-1) === ']') {        // A v4 or v6 address literal.
        // FIXME
    } else {        // A domain name.

        /* FIXME: A domain in an email address may not contain underscore?
         */

        const labels = domain.split(".");

        labels.forEach((label) => {
            if (label[0] === '-' || label.at(-1) === '-') {
                throw new Error("label may not start or end with a ('-') hyphen");
            }
            // Valid chars are letter, digit, or hyphen, plus any Unicode.
            const bad = label.match(/[^A-Za-z0-9\u{80}-\u{10FFFF}-]/u);
            if (bad.length) {
                throw new Error(`label may not contain any of "${bad}"`);
            }
        });

        labels.sort(function(a: string, b: string) {
            return b.length - a.length;
        })
        if (labels[0].length > 63) {
            throw new Error("domain label too long");
        }
        if (labels.at(-1).length === 0) {      // Two consecutive dots,
            throw new Error("empty label");    //   or a leading or tailing dot.
        }
    }

    if (local_part.length === 0) {
        throw new Error("no local part");
    }

    if (local_part[0] === '"' && local_part.at(-1) === '"') {
        // A Quoted-string.
        const content = local_part.substring(1, local_part.length - 2);
        const bad = content.match(/\u{0}-\u{1F}\u{22}/u); // FIXME... more chars
        if (bad.length) {
            throw new Error(`Quoted-string may not contain any of "${bad}"`);
        }
    } else {
        // A Dot-string.
        const atoms = domain.split(".");
        atoms.forEach((atom) => {
            if (atom.length === 0) {
                throw new Error("zero length atom in Local-part");
            }
            // An atom must not conatin any 'special' chars.
            const bad = atom.match(/\(\)<>\[\]:;@\\,\./u);
            if (bad.length) {
                throw new Error(`atom may not contain any of "${bad}"`);
            }
        });
    }
}
