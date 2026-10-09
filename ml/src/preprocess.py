import re

def clean_text(text: str) -> str:
    """
    Removes obvious publisher artifacts and leakage indicators from news text.
    Operations are performed on the original casing first, and lowercase is applied last.
    """
    if not isinstance(text, str):
        return ""

    # 1. Remove leading dateline + agency tag (e.g., "WASHINGTON (Reuters) - ")
    # Matches a capitalized city/string up to 40 chars, followed by (Reuters), optional hyphens and spaces
    text = re.sub(r"^[A-Z][A-Za-z .,/'-]{1,40}\(Reuters\)\s*-?\s*", " ", text)
    
    # 2. Remove any remaining isolated (Reuters) or Reuters tag
    text = re.sub(r"\(Reuters\)", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\breuters\b", " ", text, flags=re.IGNORECASE)

    # 3. Remove URLs and twitter pic links
    text = re.sub(r"https?://\S+|www\.\S+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"pic\.twitter\.com/\S+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"twitter\.com/\S+", " ", text, flags=re.IGNORECASE)

    # 4. Remove @handles
    text = re.sub(r"@\w+", " ", text)

    # 5. Remove specific FAKE news source phrases observed in EDA
    text = re.sub(r"featured image via", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\bvia\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"21st century wire says", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"21st century wire", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"getty images?", " ", text, flags=re.IGNORECASE)

    # 6. Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 7. Lowercase as the final step
    return text.lower()
