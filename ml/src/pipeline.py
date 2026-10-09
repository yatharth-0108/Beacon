from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import FunctionTransformer
from ml.src import config
from ml.src.preprocess import clean_text


def build_baseline() -> Pipeline:
    """Builds baseline NLP classification pipeline combining TF-IDF vectorization and Logistic Regression.
    
    Why: Wrapping TF-IDF and Logistic Regression in a single scikit-learn Pipeline prevents
    data leakage by ensuring the vectorizer vocabulary and IDF weights are fit ONLY on 
    the training split when Pipeline.fit(X_train, y_train) is called.
    """
    return Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, max_features=50_000)),
        ("clf", LogisticRegression(max_iter=1000, random_state=config.RANDOM_STATE)),
    ])


def build_pipeline(clean=True, ngram_range=(1,1), stop_words=None, min_df=1, classifier=None) -> Pipeline:
    """Builds NLP classification pipeline with optional custom preprocessing.
    
    Args:
        clean: If True, uses custom clean_text function for preprocessing.
        ngram_range: Tuple for TF-IDF ngram range.
        stop_words: String or list for TF-IDF stop words.
        min_df: Minimum document frequency for TF-IDF vectorizer.
        classifier: Sklearn estimator. If None, defaults to LogisticRegression.
    """
    preprocessor = clean_text if clean else None
    
    clf = classifier if classifier is not None else LogisticRegression(max_iter=1000, random_state=config.RANDOM_STATE)
    
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            preprocessor=preprocessor,
            lowercase=True, # Will be ignored if preprocessor is not None since preprocessor lowercases.
            max_features=50_000,
            ngram_range=ngram_range,
            stop_words=stop_words,
            min_df=min_df
        )),
        ("clf", clf),
    ])


def build_final_pipeline() -> Pipeline:
    """Builds final NLP classification pipeline (P2_LR) using clean_text preprocessing,
    TF-IDF unigrams (max_features=50,000), and Logistic Regression.
    
    Why: P2_LR achieved top cross-dataset F1 generalization score (69.13%) among leakage-cleaned
    pipelines, preserves explainability, and natively outputs calibrated class probabilities.
    """
    return build_pipeline(clean=True, ngram_range=(1, 1), stop_words=None, min_df=1)


