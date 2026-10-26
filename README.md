# email-address-parser
{Type,Java,ECMA}Script email address parser, based on RFC-5321(+RFC-6531) grammar.

Parse an SMTP (RFC-5321) address.

All of the length checks are based on JS characters, which are UTF-16 code units. Any non-ascii characters will end up using more code units (octets) when UTF-8 encoded. Therefore U-labels may exceede limits when converted to A-labels.

Since email addresses containing Unicode are UTF-8 encoded, the length checks are not exact so may not reject some addresses that would be too long as UTF-8.

Total length limit of an address is 986 characters; based on a 1,000 character SMTP line length.

See <https://tools.ietf.org/html/rfc1035> section 2.3.4. Size limits:

Domain names are limited to 255 octets. When encoded with a length byte before each label, and including the top-level zero length label, the effctive limit (with interstitial dots) is 253 octets.

Labels within a domain name are limited to 63 octets.

The above are limits of the DNS protocol, not any particular implementation.

RFC-5321 section 4.5.3.1. “Size Limits and Minimums” still says:

“To the maximum extent possible, implementation techniques that impose
no limits on the length of these objects should be used.”
