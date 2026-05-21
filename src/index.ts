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

    const at_idx = address.lastIndexOf('@'); // One must be found in a valid address.
    if (at_idx === -1) {
        throw new Error("address contains no @");
    }

    const local_part = address.substring(0, at_idx);
    const domain = address.substring(at_idx + 1);

    if (domain.length > 253) {  // The DNS protocol limit for a domain name, an address literal will be shorter.
        throw new Error("domain too long");
    }

    if (domain[0] === '[') {       // An address literal.
        // A v4 or v6 address literal.
    } else {                       // A domain name.
        const labels = domain.split(".");

        labels.sort(function(a: string, b: string) {
            return b.length - a.length;
        });
        if (labels[0].length > 63) {
            throw new Error("domain label too long");
        }
        if (labels[-1].length === 0) {            // Two consecutive dots,
            throw new Error("empty label");       //   or a leading or tailing dot.
        }
    }

    if (local_part[0] === '"' && local_part[-1] === '"') {
    }
}
