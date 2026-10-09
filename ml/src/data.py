import re
import pandas as pd
from sklearn.model_selection import train_test_split
from ml.src import config


def _clean_content(title_series: pd.Series, text_series: pd.Series) -> pd.Series:
    """Combines title and text, strips surrounding whitespace, and collapses multi-spaces."""
    combined = title_series.fillna("") + " " + text_series.fillna("")
    # Strip whitespace and collapse multiple whitespace characters into single space
    return combined.str.strip().str.replace(r"\s+", " ", regex=True)


def load_isot() -> pd.DataFrame:
    """Loads ISOT dataset, cleans content, dedupes, and returns DataFrame with standard schema.
    
    Returns:
        pd.DataFrame with columns ['content', 'label', 'source_dataset']
    """
    fake_path = config.DATA_RAW / "isot" / "Fake.csv"
    true_path = config.DATA_RAW / "isot" / "True.csv"
    
    fake_df = pd.read_csv(fake_path)
    true_df = pd.read_csv(true_path)
    
    fake_df["label"] = config.FAKE
    true_df["label"] = config.REAL
    
    df = pd.concat([fake_df, true_df], ignore_index=True)
    df["source_dataset"] = "isot"
    
    df["content"] = _clean_content(df["title"], df["text"])
    
    # Drop empty/whitespace-only content
    df = df[df["content"].str.len() >= config.MIN_TEXT_CHARS].copy()
    
    # Drop duplicates on content
    df = df.drop_duplicates(subset=["content"]).reset_index(drop=True)
    
    return df[["content", "label", "source_dataset"]]


def load_second() -> pd.DataFrame:
    """Loads second dataset (Kaggle fake_or_real_news), harmonizes labels, clean content & dedupes.
    
    Returns:
        pd.DataFrame with columns ['content', 'label', 'source_dataset']
    """
    path = config.DATA_RAW / "second" / "fake_or_real_news.csv"
    df = pd.read_csv(path)
    
    # Label mapping string FAKE/REAL -> 1/0
    label_map = {"FAKE": config.FAKE, "REAL": config.REAL}
    df["label"] = df["label"].map(label_map)
    df["source_dataset"] = "kaggle_fake_or_real"
    
    df["content"] = _clean_content(df["title"], df["text"])
    
    # Drop empty/whitespace-only content
    df = df[df["content"].str.len() >= config.MIN_TEXT_CHARS].copy()
    
    # Drop duplicates on content
    df = df.drop_duplicates(subset=["content"]).reset_index(drop=True)
    
    return df[["content", "label", "source_dataset"]]


def train_test(df: pd.DataFrame):
    """Performs stratified train-test split using config parameters.
    
    Returns:
        train_df, test_df
    """
    train_df, test_df = train_test_split(
        df,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_STATE,
        stratify=df["label"]
    )
    return train_df.reset_index(drop=True), test_df.reset_index(drop=True)
