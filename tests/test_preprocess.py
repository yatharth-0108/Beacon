from ml.src.preprocess import clean_text

def test_clean_text_dateline():
    text = "WASHINGTON (Reuters) - The president spoke today."
    cleaned = clean_text(text)
    assert cleaned == "the president spoke today."

def test_clean_text_reuters_inline():
    text = "Some news reported by Reuters today."
    cleaned = clean_text(text)
    assert cleaned == "some news reported by today."

def test_clean_text_urls_handles():
    text = "Check this https://t.co/xyz @someone pic.twitter.com/abc"
    cleaned = clean_text(text)
    assert cleaned == "check this"

def test_clean_text_fake_artifacts():
    text = "Featured image via John Doe. 21st Century Wire says this is Getty Images."
    cleaned = clean_text(text)
    assert cleaned == "john doe. this is ."

def test_clean_text_whitespace_and_lower():
    text = "  HELLO   World  "
    cleaned = clean_text(text)
    assert cleaned == "hello world"

def test_clean_text_non_string():
    cleaned = clean_text(None)
    assert cleaned == ""
