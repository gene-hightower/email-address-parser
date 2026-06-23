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


/**
 * Validates IPv4 address (0-255 for each octet)
 */
function isValidIPv4(ipv4String: string) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
  return ipv4Regex.test(ipv4String);
}

/**
 * Validates IPv6 address according to RFC 4291 rules
 * Supports all valid forms: full, compressed, IPv4-embedded
 */
function isValidIPv6(ipv6String: string) {
  const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Regex.test(ipv6String);
}

export function parse(address: string) {

    // An insane length, to protect the parsing code from huge input. SMTP line limit, minus command size.
    const insane_length = 1000 - "MAIL FROM:<>\r\n".length;

    if (address.length > insane_length) {
        //console.log(`${address} too long`);
        throw new Error("address too long");
    }
    const at_idx = address.lastIndexOf("@");    // One must be found in a valid address.
    if (at_idx === -1) {
        //console.log(`${address} contains no @`);
        throw new Error("address contains no @");
    }

    if ( address !== address.normalize('NFC') ) {
        //console.log(`${address} is not in Normalization Form C (NFC)`);
        throw new Error("address is not in Normalization Form C (NCF)");
    }

    const local_part = address.substring(0, at_idx);
    const domain = address.substring(at_idx + 1);

    // console.log(`local_part ${local_part}`);
    // console.log(`domain ${domain}`);

    /*
      Check Domain.

      <https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2>

     */

    if (domain.length === 0) {
        //console.log(`${address} no domain`);
        throw new Error("no domain");
    }
    if ((domain[0] === '[') && (domain.at(-1) === ']')) {            // A v4 or v6 address literal.
        const content = domain.slice(1, -1);
        if (content.match(/^IPv6:/i)) {
            const ipv6Addr = content.slice(5);
            if (!isValidIPv6(ipv6Addr)) {
                //console.log(`${ipv6Addr} is not a valid ipv6 address`);
                throw new Error("invalid IPv6 address literal");
            }
        } else if (!isValidIPv4(content)) {
            //console.log(`${content} is not a valid ipv4 address`);
            throw new Error("invalid IPv4 address literal");
        }
        // At some point there may be other types of address literals.
    } else {                                            // A domain name.
        const labels = domain.split(".");

        labels.forEach((label) => {
            if (label.length === 0) {           // Two consecutive dots,
                //console.log(`${domain} has empty label`);
                throw new Error("empty label"); //   or a leading or tailing dot.
            }
            /*
            if (labels[0].length > 63) {
                throw new Error("domain label too long");
            }
            */
            if (label[0] === '-' || label.at(-1) === '-') {
                //console.log(`${label} may not start or end with hyphen`);
                throw new Error("label may not start or end with a ('-') hyphen");
            }
            // Valid chars are letter, digit, or hyphen, plus any Unicode.
            // A domain in an email address may not contain underscore.
            if (label.match(/[^A-Za-z0-9\u0080-\uFFFF-]/)) {
                //console.log(`${label} has bad char`);
                throw new Error("bad char in label");
            }
        });
    }

    /*
      Check Local-part.

      <https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2>

     */

    if (local_part.length === 0) {
        //console.log("no local part");
        throw new Error("no local part");
    }

    if (local_part[0] !== '"') {        // A Dot-string.
        const atoms = local_part.split(".");

        atoms.forEach((atom) => {
            if (atom.length === 0) {
                //console.log("zero length atom in local part");
                throw new Error("zero length atom in Local-part");
            }
            // An atom must not conatin any chars not in 'atext'.
            const spec = atom.match(/[^A-Za-z0-9!#\$%&'\*\+\-\/=\?\^_`\{\|\}~\u0080-\uFFFF]/);
            if (spec) {
                //console.log(`special "${spec[0]}" char in "${atom}" atom local part`);
                throw new Error("atom may not contain any special chars");
            } else {
                //console.log(`atom "${atom}" is fine`);
            }
        });

        if (domain[0] === '[') {
            return {
                localPart: { DotString: local_part },
                domainPart: { AddressLiteral: domain }
            };
        } else {
            return {
                localPart: { DotString: local_part },
                domainPart: { DomainName: domain }
            };
        };

    } else {                            // A Quoted-string.
        const rfc5321QuotedStringRE = /^"(?:[ !#-\[\]-~]|\\[\u0020-\u007e\u0080}-\uFFFF])*"$/;
        if (!local_part.match(rfc5321QuotedStringRE)) {
            //console.log(`${local_part} is not a valid Quoted-string`);
            throw new Error("invalid Quoted-string");
        }
        // Remove double quotes.
        const content = local_part.slice(1, -1);
        // Unescape quoted-pairSMTPs.
        content.replace(/\\([\u0020-\u007e\u0080-\uFFFF])/g, (_, ch) => ch);
        // Escape only backslash and double-quote.
        content.replace("\\", "\\\\");
        content.replace("\"", "\\\"");
        const qs = `"${content}"`; // requote

        if (domain[0] === '[') {
            return {
                localPart: { QuotedString: qs },
                domainPart: { AddressLiteral: domain }
            };
        } else {
            return {
                localPart: { QuotedString: qs },
                domainPart: { DomainName: domain }
            };
        };
    }
    
}

export function domain_is_valid_for_dns(address: string) {
    var domain;
    const at_idx = address.lastIndexOf("@");
    if (at_idx === -1) {
        domain = address;
    } else {
        domain = address.substring(at_idx + 1);
    }

    if (domain.length === 0) {
        //console.log(`${address} no domain`);
        return false;
    }
    if (domain.length > 253) {          // The DNS protocol limit for a domain name, an address literal will be shorter.
        //console.log("domain too long");
        return false;
    }

    const labels = domain.split(".");

    // Is domain fully qualified?
    if (labels.length < 2) {
        //console.log("domain not fully qualified");
        return false;
    }
    if (labels[labels.length - 1].length < 2) {
        //console.log("top level domain label too short");
        return false;
    }

    labels.forEach((label) => {
        if (label.length === 0) {       // Two consecutive dots,
            //console.log(`${domain} has empty label`);
            return false;
        }
        if (labels[0].length > 63) {
            //console.log("domain label too long");
            return false;
        }
        if (label[0] === '-' || label.at(-1) === '-') {
            //console.log(`${label} may not start or end with hyphen`);
            return false;
        }
        // Valid chars are letter, digit, or hyphen, plus any Unicode.
        // A domain in an email address may not contain underscore.
        if (label.match(/[^A-Za-z0-9\u0080-\uFFFF-]/)) {
            //console.log(`${label} has bad char`);
            return false;
        }
    });

    return true;
}


/** Strip +something, strip '.'s, and map to lower case.
 */
export function normalize_dot_string(dot_string: string) {
    const tagless = (function () {
        const plus_loc = dot_string.indexOf("+");
        if (plus_loc === -1) {
            return dot_string;
        }
        return dot_string.substr(0, plus_loc);
    })();
    const dotless = tagless.replace(/\./g, "");
    return dotless.toLowerCase();
}

/** The G style address normalization.
 */
export function normalize(address: string) {
    const a = parse(address);
    const domain = a.domainPart.AddressLiteral ?? a.domainPart.DomainName.toLowerCase();
    const local = a.localPart.QuotedString ?? normalize_dot_string(a.localPart.DotString);
    return `${local}@${domain}`;
}

export function canonicalize_quoted_string(quoted_string: string) {
    const unquoted = quoted_string.substr(1).substr(0, quoted_string.length - 2);
    const unescaped = unquoted.replace(/(?:\\(.))/g, "$1");
    const reescaped = unescaped.replace(/(?:(["\\]))/g, "\\$1");
    return `"${reescaped}"`; // re-quote
}

/**
 * Apply a canonicalization consistent with standards to support
 * comparison as a string.
 */
export function canonicalize(address: string) {
    const a = parse(address);
    const domain = a.domainPart.AddressLiteral ?? a.domainPart.DomainName.toLowerCase();
    const local = a.localPart.QuotedString
        ? canonicalize_quoted_string(a.localPart.QuotedString)
        : a.localPart.DotString;
    return `${local}@${domain}`;
}
