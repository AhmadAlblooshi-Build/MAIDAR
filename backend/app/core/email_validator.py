"""
Email validation utilities to prevent spam and disposable email addresses.
"""

import re
from typing import Set

# Comprehensive list of disposable/temporary email domains
DISPOSABLE_EMAIL_DOMAINS: Set[str] = {
    # Popular disposable email services
    "temp-mail.org", "tempmail.com", "tempmail.net", "tempmail.io",
    "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
    "10minutemail.com", "10minutemail.net", "10minutemail.org",
    "mailinator.com", "mailinator2.com", "mailinator.net",
    "throwaway.email", "throwawaymail.com", "trashmail.com",
    "getnada.com", "maildrop.cc", "tempinbox.com",
    "yopmail.com", "yopmail.fr", "yopmail.net",
    "fakeinbox.com", "fakemail.net", "fakemailgenerator.com",
    "sharklasers.com", "grr.la", "guerrillamailblock.com",

    # One-time use emails
    "minuteinbox.com", "mytemp.email", "tempmail.de",
    "emailondeck.com", "mintemail.com", "tempr.email",
    "mohmal.com", "anonbox.net", "anonymbox.com",

    # Burner emails
    "burnermail.io", "getairmail.com", "airmail.cc",
    "dispostable.com", "disposemail.com", "discard.email",

    # Privacy-focused (sometimes abused)
    "mailcatch.com", "mailsac.com", "mailtothis.com",
    "inbox.testmail.app", "mail.tm", "inboxkitten.com",

    # Common spam domains
    "spam4.me", "spambox.us", "spamgourmet.com",
    "spamhole.com", "spamfree24.com", "spamfree.eu",

    # Additional common disposable services
    "jetable.org", "jetable.com", "nowmymail.com",
    "sofort-mail.de", "wegwerfmail.de", "wegwerfemail.de",
    "trashmail.net", "trashmail.org", "trashemail.com",
    "mailexpire.com", "mailfreeonline.com", "mailin8r.com",
    "mailmoat.com", "mailnesia.com", "mailnull.com",

    # Numeric and pattern-based
    "0-mail.com", "0815.ru", "10mail.org", "20mail.it",
    "33mail.com", "3d-painting.com", "4warding.net",

    # Other common ones
    "deadaddress.com", "disbox.net", "disbox.org",
    "e4ward.com", "emailias.com", "emailsensei.com",
    "emltmp.com", "example.com", "fudgerub.com",
    "haltospam.com", "hidemail.de", "incognitomail.com",
    "instant-mail.de", "justonemail.net", "klzlk.com",
    "lifebyfood.com", "lookugly.com", "lopl.co.cc",
    "mailcatch.com", "maileater.com", "meltmail.com",
    "mt2009.com", "mytrashmail.com", "nepwk.com",
    "no-spam.ws", "nobulk.com", "noclickemail.com",
    "nogmailspam.info", "nomail.xl.cx", "nomail2me.com",
    "nospam.ze.tc", "nospamfor.us", "nospamthanks.info",
    "notmailinator.com", "objectmail.com", "obobbo.com",
    "odem.com", "oneoffemail.com", "onewaymail.com",
    "pookmail.com", "proxymail.eu", "punkass.com",
    "putthisinyourspamdatabase.com", "quickinbox.com",
    "rcpt.at", "recode.me", "recursor.net",
    "regbypass.com", "safe-mail.net", "safetymail.info",
    "sandelf.de", "selfdestructingmail.com", "sendspamhere.com",
    "smellfear.com", "snakemail.com", "sneakemail.com",
    "sogetthis.com", "soodonims.com", "spam.la",
    "spamavert.com", "spambob.com", "spambog.com",
    "spamcannon.com", "spamcero.com", "spamcon.org",
    "spamcowboy.com", "spamday.com", "spamex.com",
    "spamhereplease.com", "spamify.com", "spaminator.de",
    "spamkill.info", "spammotel.com", "spamobox.com",
    "spamspot.com", "spamthis.co.uk", "spamtroll.net",
    "speed.1s.fr", "supergreatmail.com", "supermailer.jp",
    "teewars.org", "tempalias.com", "tempe-mail.com",
    "tempemail.biz", "tempemail.com", "tempemail.net",
    "tempinbox.co.uk", "tempmail2.com", "tempmaildemo.com",
    "tempmailer.com", "tempmailer.de", "tempomail.fr",
    "temporarily.de", "temporaryemail.net", "temporaryemail.us",
    "temporaryforwarding.com", "temporaryinbox.com",
    "thanksnospam.info", "thankyou2010.com", "thatim.info",
    "thisisnotmyrealemail.com", "throwawayemailaddress.com",
    "tilien.com", "tmailinator.com", "tradermail.info",
    "trash-amil.com", "trash-mail.at", "trash-mail.com",
    "trash-mail.de", "trash2009.com", "trashdevil.com",
    "trashymail.com", "tyldd.com", "uggsrock.com",
    "upliftnow.com", "venompen.com", "veryrealemail.com",
    "viditag.com", "viewcastmedia.com", "viewcastmedia.net",
    "walkmail.net", "webemail.me", "webm4il.info",
    "whyspam.me", "willselfdestruct.com", "winemaven.info",
    "wronghead.com", "wuzup.net", "wuzupmail.net",
    "xagloo.com", "xemaps.com", "xents.com",
    "yep.it", "yogamaven.com", "yuurok.com",
    "zehnminuten.de", "zippymail.info", "zoemail.org",
}

# Email regex pattern (RFC 5322 simplified)
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)


def is_valid_email_format(email: str) -> bool:
    """
    Validate email format using regex.

    Args:
        email: Email address to validate

    Returns:
        True if format is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def is_disposable_email(email: str) -> bool:
    """
    Check if email domain is a known disposable/temporary email service.

    Args:
        email: Email address to check

    Returns:
        True if disposable, False if legitimate
    """
    if not email or "@" not in email:
        return False

    try:
        domain = email.split("@")[1].lower().strip()
        return domain in DISPOSABLE_EMAIL_DOMAINS
    except (IndexError, AttributeError):
        return False


def is_corporate_email(email: str) -> bool:
    """
    Check if email appears to be from a corporate domain (not free email services).

    Common free email providers are considered non-corporate.

    Args:
        email: Email address to check

    Returns:
        True if likely corporate, False if free email service
    """
    if not email or "@" not in email:
        return False

    free_email_domains = {
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
        "aol.com", "icloud.com", "mail.com", "protonmail.com",
        "zoho.com", "gmx.com", "yandex.com", "mail.ru",
    }

    try:
        domain = email.split("@")[1].lower().strip()
        return domain not in free_email_domains
    except (IndexError, AttributeError):
        return False


def validate_email(email: str, require_corporate: bool = False) -> tuple[bool, str]:
    """
    Comprehensive email validation.

    Args:
        email: Email address to validate
        require_corporate: If True, reject free email services

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check format
    if not is_valid_email_format(email):
        return False, "Invalid email format"

    # Check disposable
    if is_disposable_email(email):
        return False, "Disposable email addresses are not allowed. Please use a permanent email address."

    # Check corporate (optional)
    if require_corporate and not is_corporate_email(email):
        return False, "Please use a corporate email address"

    return True, ""
