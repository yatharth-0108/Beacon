# Learning.md: everything you need to understand this project

**Who this is for:** you know web development, React, and general backend work, and you have basic Python. So web topics get a few lines and the AI/ML parts get full treatment. Each section says where in the project you will meet the concept.

**How to read it:** in order, the first time. Later, use it as a reference. You do not need to finish it before building. Read the part matching your current phase (see the map in Part 12), then come back for the rest.

| Part | Topic                                            | You need it in  |
| ---- | ------------------------------------------------ | --------------- |
| 1    | The big picture: AI, ML, NLP, classification     | Phase 0 to 2    |
| 2    | Python toolkit used in this project              | Phase 0 to 2    |
| 3    | Data: datasets, features, labels, splits         | Phase 1 to 2    |
| 4    | NLP: turning text into numbers (TF-IDF)          | Phase 2 to 4    |
| 5    | Models: logistic regression, Naive Bayes, SVM    | Phase 2 to 4    |
| 6    | Evaluation: metrics, baselines, cross-validation | Phase 2 to 4    |
| 7    | Data leakage and generalization                  | Phase 3         |
| 8    | scikit-learn Pipelines and saving models         | Phase 3 to 5    |
| 9    | Scores, probabilities, and calibration           | Phase 5 to 7    |
| 10   | Python backend for people who know Express       | Phase 6         |
| 11   | Frontend in a few lines                          | Phase 7         |
| 12   | Concept-to-phase map                             | any time        |
| 13   | Beyond TF-IDF: what comes next                   | Phase 9 (viva)  |
| 14   | Glossary                                         | any time        |
| 15   | Self-test questions                              | before the viva |

---

# Part 1: The big picture

## 1.1 AI, machine learning, deep learning, NLP

- **Artificial Intelligence (AI):** any technique that makes computers do tasks that normally need human intelligence.
- **Machine Learning (ML):** a subset of AI where, instead of writing rules by hand, you show a program many examples and it _learns the rules itself_ as numbers (parameters).
- **Deep Learning:** ML using large neural networks (e.g. BERT, GPT). Not used in the MVP.
- **Natural Language Processing (NLP):** ML/AI applied to human language text.

Classic programming: `rules + data -> answers`. Machine learning: `data + answers -> rules`. Those learned rules are the **model**.

## 1.2 Supervised learning

You have examples with known answers (**labels**). The model learns a mapping from input to label, then predicts labels for new inputs.

- **Classification:** the label is a category (FAKE/REAL). This project.
- **Regression:** the label is a number (house price). Not this project.
- Unsupervised learning (no labels, e.g. clustering) and reinforcement learning are not used here.

Our problem is **binary text classification**: input = article text, output = one of two classes.

## 1.3 The ML workflow (this is the shape of every phase)

```text
1. Collect labeled data         (Phase 1)
2. Represent it as numbers      (TF-IDF, Phase 2)
3. Split into train / test      (Phase 2)
4. Train a model on train       (Phase 2)
5. Evaluate on unseen test      (Phase 2, 4)
6. Check for cheating/leakage   (Phase 3)
7. Compare alternatives         (Phase 4)
8. Save the best, serve it      (Phase 5, 6)
```

Training happens once, offline. **Inference** (predicting) happens per request, online. The two must transform text identically (Part 8).

## 1.4 What this model actually learns (be honest about it)

The model does **not** know facts. It learns statistical associations between words/phrases and the label in its training data. If fake articles in the dataset often use emotional words and real ones use agency phrasing, the model learns that. So:

- It detects **writing style and vocabulary patterns of the dataset's sources**, not truth.
- It can be confidently wrong on a true article written in a "fake-like" style, or on a fake one written in a formal style.
- This is why the project describes itself as a _text classifier_, not a _fact-checker_. Examiners often ask about this.

---

# Part 2: Python toolkit used here

You know basic Python, so this covers only what the project relies on.

## 2.1 Environment and packages

- **Virtual environment (`.venv`)**: an isolated folder of packages per project, like a project-local `node_modules`. `pip install -r requirements.txt` is `npm install`. `requirements.txt` is `package.json` (dependencies only).
- **Module vs script:** `python -m ml.src.train` runs `ml/src/train.py` as part of the package `ml.src`, so imports like `from ml.src import config` work. Run from the repo root. `python ml/src/train.py` would break those imports.
- `__init__.py` marks a folder as a package. Empty is fine.
- `if __name__ == "__main__":` runs code only when the file is executed, not when imported.

## 2.2 Language features you'll see

```python
from pathlib import Path             # paths as objects: Path("a") / "b"
def f(text: str) -> dict: ...        # type hints: documentation, not enforced at runtime
scores = [len(t) for t in texts]     # list comprehension = map/filter in one line
with open(p) as fh: ...              # context manager: auto-closes the file
class Predictor: ...                 # classes; @classmethod = static factory like Predictor.load()
@decorator                           # wraps a function; FastAPI uses them to register routes
```

## 2.3 NumPy, pandas, SciPy in one page

- **NumPy array:** a fast typed n-dimensional array. ML libraries speak arrays. `y == 1` gives a boolean array; `y.mean()` gives a fraction.
- **pandas DataFrame:** a table (rows = articles, columns = fields), like a spreadsheet or array of objects with column-wise operations.
  ```python
  df = pd.read_csv("Fake.csv")
  df.shape; df.columns; df.head()          # look at it
  df["label"].value_counts()               # class balance
  df.isna().sum()                          # missing values per column
  df.duplicated(subset="content").sum()    # duplicates
  df = df.drop_duplicates(subset="content")
  df["content"] = (df["title"] + " " + df["text"]).str.strip()   # vectorized string ops
  pd.concat([fake, real], ignore_index=True)
  ```
- **SciPy sparse matrix:** TF-IDF output is a huge table (documents × vocabulary) that is >99% zeros. A sparse matrix stores only the non-zero entries, so 40,000 articles × 100,000 words fits in memory. You rarely touch it directly.

## 2.4 Notebooks vs scripts

Jupyter notebooks are for _exploring_ (EDA, plots, top features). Scripts/modules in `ml/src/` are for _reproducible_ work (training, saving). Rule: explore in notebooks, then move stable logic into `src/`.

---

# Part 3: Data fundamentals

## 3.1 Vocabulary

| Term              | Meaning                        | In this project          |
| ----------------- | ------------------------------ | ------------------------ |
| Sample / instance | One row                        | One article              |
| Feature           | An input measurement           | TF-IDF weights of words  |
| Label / target    | The answer to predict          | `label` (FAKE=1, REAL=0) |
| Dataset           | Collection of samples          | ISOT, second dataset     |
| Corpus            | A collection of text documents | All articles             |
| Document          | One text item in NLP           | One `content` string     |
| Class balance     | Ratio of labels                | ISOT is roughly balanced |
| Positive class    | The class metrics focus on     | FAKE                     |

## 3.2 Where the dataset comes from matters

A dataset is a **sample of the world collected in a specific way**. ISOT's real articles come from one news agency and its fake articles from sites flagged as unreliable, over a limited time period, mainly about politics. Everything the model learns is relative to that. Hence Part 7.

## 3.3 Exploratory Data Analysis (EDA), Phase 1

Before modeling, look at the data. Checklist and why:

- **Shape, columns, dtypes:** know what you have.
- **Missing/empty values:** empty articles teach nothing (and break some steps).
- **Duplicates:** the same article twice can land in both train and test, so the model "predicts" something it memorized. This inflates scores. Always dedupe **before** splitting.
- **Class balance:** severe imbalance makes accuracy misleading (Part 6.2).
- **Length distributions:** if fake articles are systematically much shorter/longer, length itself becomes a shortcut.
- **Metadata columns (`subject`, `date`):** in ISOT, subject categories differ between fake and real files, so a model could predict from `subject` alone. We do **not** use them as features, and we use only text.
- **Read real samples.** Ten minutes of reading articles reveals more than any statistic.
- **Verify labels.** Never trust "0 = fake" from documentation without reading rows. Some public datasets have inverted or contradictory label descriptions.

## 3.4 Train/test split, the most important habit in ML

You want to know how the model does on data it has **never seen**, because that is how it will be used. So you hide part of the data.

```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)
```

- `test_size=0.2`: 80% train, 20% test.
- **`stratify=y`:** keeps the same FAKE/REAL ratio in both parts, which matters for stability and honest metrics.
- **`random_state=42`:** makes the shuffle repeatable, so your results are reproducible. 42 is just a convention.
- **Golden rule:** the test set is used **only to report**, never to make decisions (choosing models, features, or thresholds). Decisions use cross-validation on the training data (Part 6.5). If you tune on the test set, it silently becomes training data and your numbers become optimistic.
- **Fit on train only:** anything that learns from data (the TF-IDF vocabulary and IDF values, the classifier) must see only training data. If the vectorizer learns its vocabulary from the whole dataset, test information leaks into training. A `Pipeline` prevents this automatically (Part 8).

Split terms: **train** (learn parameters), **validation** (choose between options; CV plays this role), **test** (final, once).

## 3.5 Parameters vs hyperparameters

- **Parameters:** numbers the model learns from data (e.g. logistic regression weights).
- **Hyperparameters:** settings you choose before training (`ngram_range`, `C`, `max_features`). You compare them via experiments (Phase 4).

---

# Part 4: NLP, turning text into numbers

Models do math; text is not numbers. NLP for classification is mostly about **how to represent text numerically without losing the useful signal**.

## 4.1 Text preprocessing (the standard toolbox)

| Step                              | What it does                                               | Example                                              | Notes for this project                                                                                      |
| --------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Lowercasing                       | Merge "Trump", "TRUMP", "trump"                            | `The Senate` -> `the senate`                         | Almost always useful.                                                                                       |
| Tokenization                      | Split text into units (tokens), usually words              | `"it's fine"` -> `["it", "s", "fine"]`               | sklearn's default token pattern keeps words of 2+ letters/digits.                                           |
| Stopword removal                  | Drop very common words (the, is, and)                      | `the senate passed the bill` -> `senate passed bill` | Helps sometimes, can _hurt_ here: style words like "the" or "said" can carry signal. We test it in Phase 4. |
| Stemming                          | Chop suffixes crudely                                      | `running, runs` -> `run`                             | Fast, sometimes produces non-words. Not in the MVP.                                                         |
| Lemmatization                     | Reduce to dictionary form using grammar                    | `better` -> `good`                                   | Needs NLTK/spaCy. Optional extension.                                                                       |
| Punctuation / URL / noise removal | Remove characters that carry no meaning or leak the source | `pic.twitter.com/x`                                  | Our `clean_text` (Phase 3) targets **source artifacts**, not general noise.                                 |
| N-grams                           | Use word _sequences_ as units                              | bigrams: `white house`, `fake news`                  | Capture short phrases; grows the vocabulary fast.                                                           |

**Principle:** don't apply a technique because a tutorial does. Treat each as a hypothesis, test it (Phase 4), keep it only if the numbers (ideally cross-dataset) support it.

## 4.2 Bag of Words (BoW)

Represent a document as **how many times each vocabulary word appears**, ignoring order.

- **Vocabulary:** the list of all distinct tokens seen in the training corpus.
- Each document becomes a vector with one position per vocabulary word.

Corpus:

```text
d1: "the senate passed the budget"
d2: "the senate rejected the bill"
d3: "aliens control the budget"
```

Vocabulary (alphabetical): `aliens, bill, budget, control, passed, rejected, senate, the`

BoW counts:

```text
       aliens bill budget control passed rejected senate the
d1       0     0     1      0       1       0       1     2
d2       0     1     0      0       0       1       1     2
d3       1     0     1      1       0       0       0     1
```

Weakness: "the" gets a big number in every document and tells you nothing. Raw counts overweight common words.

## 4.3 TF-IDF

**Term Frequency - Inverse Document Frequency** gives high weight to words that are frequent in _this_ document but rare across _all_ documents.

- **TF(t, d):** how often term `t` occurs in document `d` (sklearn uses the raw count by default).
- **DF(t):** in how many documents `t` appears.
- **IDF(t):** how rare `t` is across the corpus. sklearn's default (with `smooth_idf=True`):

  `idf(t) = ln((1 + n) / (1 + df(t))) + 1`, where `n` is the number of documents.

- **TF-IDF = TF × IDF**, then each document vector is **L2-normalized** (scaled to length 1) so long and short articles are comparable.

### Worked example (same 3 documents, n = 3)

| Word                                    | df  | idf = ln(4/(1+df)) + 1 |
| --------------------------------------- | --- | ---------------------- |
| aliens, bill, control, passed, rejected | 1   | ln(4/2)+1 = **1.693**  |
| budget, senate                          | 2   | ln(4/3)+1 = **1.288**  |
| the                                     | 3   | ln(4/4)+1 = **1.000**  |

Document d1 counts: the=2, senate=1, passed=1, budget=1.
Raw TF-IDF: the = 2×1.000 = 2.000; senate = 1.288; passed = 1.693; budget = 1.288.
L2 norm = √(2.000² + 1.288² + 1.693² + 1.288²) = √10.183 = 3.191.
Normalized vector for d1:

```text
the 0.627 | senate 0.404 | passed 0.531 | budget 0.404 | (all other words 0)
```

Two lessons: (1) rare words like "passed" get boosted relative to "senate"; (2) with a tiny corpus "the" still ranks high because its count is 2, IDF only _reduces_ the weight of common words, it doesn't delete them. With thousands of documents and `sublinear_tf` or stopwords, that effect shrinks.

### Why TF-IDF works for this task

The classifier will see each article as a sparse point in a very high-dimensional space (tens of thousands of dimensions, one per word). Words specific to certain writing styles get large weights, and a linear model can separate the classes with them.

### `TfidfVectorizer` parameters you'll use

| Parameter       | Default     | Meaning                                                                                                                                                                       | Where it matters                    |
| --------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `lowercase`     | True        | Lowercase before tokenizing. **If you pass your own `preprocessor`, sklearn's default preprocessing (including lowercasing) is replaced, so lowercase inside your function.** | Phase 3 gotcha                      |
| `ngram_range`   | (1,1)       | (1,2) = words + word pairs                                                                                                                                                    | Phase 4, P3                         |
| `stop_words`    | None        | `"english"` removes a built-in list                                                                                                                                           | Phase 4, P4                         |
| `min_df`        | 1           | Ignore words in fewer than N documents (removes typos, rare names, shrinks vocab)                                                                                             | Phase 4                             |
| `max_df`        | 1.0         | Ignore words in more than this fraction of docs                                                                                                                               | rarely                              |
| `max_features`  | None        | Keep only the top-N words by frequency                                                                                                                                        | Phase 2 uses 50,000 to bound memory |
| `sublinear_tf`  | False       | Use `1 + ln(tf)` so repeated words don't dominate                                                                                                                             | optional experiment                 |
| `norm`          | `"l2"`      | Vector length normalization                                                                                                                                                   | leave default                       |
| `preprocessor`  | None        | Your function applied to each raw document string                                                                                                                             | our `clean_text`                    |
| `token_pattern` | `\b\w\w+\b` | Regex defining a token                                                                                                                                                        | leave default                       |

### The two vectorizer methods

- `fit(train_texts)`: **learns** vocabulary and IDF values from training text only.
- `transform(texts)`: converts any text using the learned vocabulary. Words never seen in training are silently ignored. This is a real limitation: brand-new names/events in future news have no representation.
- Inside a `Pipeline`, `pipeline.fit(X_train, y_train)` calls `fit_transform` on the vectorizer for train and `transform` for anything you predict later.

## 4.4 Limits of bag-of-words/TF-IDF

- No word order beyond n-grams, so "dog bites man" = "man bites dog".
- No meaning: "car" and "automobile" are unrelated columns.
- No context: sarcasm, negation ("not true"), and satire are mostly invisible.
- Vocabulary is frozen at training time.
  These limits are why transformers exist (Part 13), and why you present TF-IDF as a strong, transparent _baseline_.

---

# Part 5: The models

All three classifiers here are **linear-ish text classifiers** that work well on sparse high-dimensional TF-IDF features. They take the TF-IDF vector `x` and output a class.

## 5.1 The core idea: a linear decision rule

Give every vocabulary word a **weight** `w_i`. For an article compute a score:

`z = b + w_1·x_1 + w_2·x_2 + ... + w_n·x_n`

Positive weights push toward FAKE, negative toward REAL. `b` is the bias/intercept. Training means finding weights that separate the classes on the training set. Geometrically this is drawing a flat boundary (a **hyperplane**) through the feature space. Text is high-dimensional, so classes are often nearly linearly separable, which is why simple linear models are strong for text.

## 5.2 Logistic regression (our main model)

Despite the name, it is a **classification** model.

**Step 1, score:** `z = b + Σ w_i·x_i` (as above).
**Step 2, sigmoid:** convert `z` into a number between 0 and 1:

`p = 1 / (1 + e^(-z))`

| z   | p     |
| --- | ----- |
| -2  | 0.119 |
| 0   | 0.500 |
| 1.2 | 0.769 |
| 4   | 0.982 |

`p` is interpreted as the model's score for class FAKE. **Step 3, decide:** predict FAKE if `p >= 0.5` (equivalently `z >= 0`). The **threshold** 0.5 is a choice; lowering it catches more fakes (higher recall) but flags more real articles (lower precision).

**How training works (intuition):**

1. Start with all weights near zero.
2. For each training article compute `p` and compare with the true label using **log loss** (cross-entropy):

   `loss = -[y·ln(p) + (1-y)·ln(1-p)]`

   For a true FAKE (y=1): p=0.9 gives loss 0.105; p=0.1 gives loss 2.303. Confident and right is cheap, confident and wrong is expensive.

3. **Gradient descent (or a variant such as L-BFGS, sklearn's default):** compute in which direction each weight should change to reduce total loss, nudge the weights, repeat until the loss stops improving. `max_iter=1000` caps the number of rounds; a `ConvergenceWarning` means it needed more.

**Regularization:** with tens of thousands of features the model can memorize training quirks (**overfitting**). Regularization adds a penalty for large weights so the model prefers simple explanations. sklearn's default is **L2** (penalize squared weights). The strength is controlled by **`C`, the inverse of regularization strength**: small `C` = strong regularization (simpler model), large `C` = weak. Default `C=1.0`.

**Interpretability (why we like it):** each word has one weight. After training, `clf.coef_[0]` aligned with `tfidf.get_feature_names_out()` shows which words push toward FAKE or REAL. That is how you catch leakage in Phase 3.

```python
names = pipe.named_steps["tfidf"].get_feature_names_out()
coefs = pipe.named_steps["clf"].coef_[0]          # weights for the positive class
top_fake = names[coefs.argsort()[-30:][::-1]]     # largest positive weights
top_real = names[coefs.argsort()[:30]]            # most negative weights
```

The positive class is `classes_[1]`. Make sure that equals `FAKE=1` (it does because labels are 0/1 and sklearn sorts classes).

## 5.3 Multinomial Naive Bayes

Based on **Bayes' rule**: `P(class | words) ∝ P(class) × Π P(word | class)`.

- "Naive" = it assumes words are independent given the class (false, but works surprisingly well for text).
- Training is just **counting**: how often each word appears in FAKE vs REAL articles. No iterative optimization, so it is extremely fast.
- **Laplace/additive smoothing (`alpha`, default 1):** adds a small count to every word so an unseen word doesn't give probability 0 and wipe out the product.
- Works with TF-IDF values even though it was designed for counts. **ComplementNB** is a variant that often works better on imbalanced text.
- Its probabilities tend to be extreme (close to 0 or 1) and poorly calibrated.

## 5.4 Linear SVM (`LinearSVC`)

A Support Vector Machine finds the boundary with the **largest margin**, meaning the widest empty gap between the two classes. Only the examples closest to the boundary (support vectors) shape it. Training minimizes **hinge loss**: `max(0, 1 - y·f(x))` (with y as ±1), meaning examples already correctly classified beyond the margin cost nothing.

- Often the best or tied-best classical model on text.
- It outputs a signed distance from the boundary (`decision_function`), **not a probability**. To get probabilities you must wrap it in `CalibratedClassifierCV`. That extra complexity is why the project prefers logistic regression unless SVM wins clearly.

## 5.5 Comparison

|                       | Logistic Regression     | Multinomial NB          | Linear SVM              |
| --------------------- | ----------------------- | ----------------------- | ----------------------- |
| Idea                  | Weighted sum -> sigmoid | Count-based Bayes rule  | Maximum-margin boundary |
| Training              | Iterative optimization  | One pass of counting    | Iterative optimization  |
| Speed                 | Fast                    | Fastest                 | Fast                    |
| Gives probabilities   | Yes (`predict_proba`)   | Yes (overconfident)     | No (needs calibration)  |
| Interpretable weights | Yes                     | Yes (log-probabilities) | Yes                     |
| Key hyperparameter    | `C`                     | `alpha`                 | `C`                     |
| Weakness              | Needs enough iterations | Independence assumption | No native probability   |

You will _measure_ which wins in Phase 4; do not assume.

---

# Part 6: Evaluation

## 6.1 The confusion matrix

For binary classification with FAKE as the positive class:

|                   | Predicted FAKE                                      | Predicted REAL                     |
| ----------------- | --------------------------------------------------- | ---------------------------------- |
| **Actually FAKE** | TP (true positive)                                  | FN (false negative, a missed fake) |
| **Actually REAL** | FP (false positive, a real article wrongly flagged) | TN (true negative)                 |

Worked example with 1000 test articles (500 fake, 500 real): TP=470, FN=30, FP=20, TN=480.

## 6.2 Metrics

| Metric           | Formula                     | Example          | Meaning                                         |
| ---------------- | --------------------------- | ---------------- | ----------------------------------------------- |
| Accuracy         | (TP+TN)/all                 | 950/1000 = 0.950 | Fraction correct overall                        |
| Precision (FAKE) | TP/(TP+FP)                  | 470/490 = 0.959  | Of everything flagged FAKE, how much really was |
| Recall (FAKE)    | TP/(TP+FN)                  | 470/500 = 0.940  | Of all real fakes, how many we caught           |
| F1               | 2PR/(P+R) = 2TP/(2TP+FP+FN) | 940/990 = 0.950  | Harmonic mean of precision and recall           |

**Which matters more?** Depends on cost. Low precision means real journalism is labeled fake (harm to credibility). Low recall means misinformation slips through. There's no universal answer; report both and explain your view. F1 balances them.

**Accuracy paradox:** if 95% of articles are REAL, a "model" that always says REAL scores 95% accuracy with recall 0 for FAKE. This is why we always compute a **majority-class baseline** (`DummyClassifier(strategy="most_frequent")`) and require the real model to beat it on precision/recall/F1, not just accuracy. ISOT is roughly balanced, but the habit matters, and the second dataset may differ.

**Macro vs binary averaging:** we report the _binary_ metrics for the FAKE class (`pos_label=1`). Macro average = unweighted mean over both classes.

## 6.3 Threshold and the precision/recall trade-off

`predict()` uses 0.5. If you sweep the threshold from 0 to 1 you get a **precision-recall curve**: raise the threshold and precision rises while recall falls. Picking a threshold is a product decision. We keep 0.5 and note the trade-off.

## 6.4 Overfitting and underfitting

- **Underfitting:** the model is too simple; poor on train _and_ test.
- **Overfitting:** the model memorizes train quirks; excellent on train, worse on test.
- **Symptom check:** compare train vs test scores. A big gap means overfitting.
- **Levers:** regularization (`C`), fewer features (`max_features`, `min_df`), more data. Bigger n-gram ranges increase overfitting risk.
- A subtler failure is _good test score, bad real-world score_, which is leakage/domain shift (Part 7). A random test split from the same dataset cannot detect that.

## 6.5 Cross-validation (CV)

Instead of one train/validation split, **k-fold CV** splits the training data into k parts (we use 5). It trains k times, each time holding out a different part for validation, and averages the scores. Use **stratified** k-fold to keep class ratios per fold.

```text
fold 1: [V][T][T][T][T]
fold 2: [T][V][T][T][T]  ... each part is validation exactly once
```

Reporting **mean ± std** of F1 tells you not just how good but how _stable_ a configuration is. Large std = results depend on luck. CV is how we compare configurations in Phase 4 without touching the test set.

```python
from sklearn.model_selection import cross_val_score, StratifiedKFold
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipe, X_train, y_train, scoring="f1", cv=cv)   # f1 for label 1 (FAKE)
print(scores.mean(), scores.std())
```

Because CV runs on a Pipeline, the vectorizer is re-fit inside every fold, with no leakage between folds.

## 6.6 Error analysis

Numbers say _how much_ the model is wrong; reading the mistakes says _why_. In Phase 4 you print 20 false positives and 20 false negatives and look for patterns: very short texts, opinion/satire, unusual formatting, topics absent from training data. This is the most valuable 30 minutes of the project and a great viva story.

---

# Part 7: Data leakage and generalization (the credibility part)

## 7.1 What "leakage" means

Leakage is when the model gets access to information in training that lets it predict the label **for reasons that won't exist in real use**. It scores great in testing and fails in the real world.

Forms you should know:
| Type | Example | Defense |
|---|---|---|
| Train/test contamination | Duplicates across the split; vectorizer fit on all data | Dedupe first; fit inside a Pipeline |
| Metadata leakage | `subject` or `date` columns differ by class | Use text only |
| **Source artifacts / shortcut learning** | All REAL articles start with "WASHINGTON (Reuters) -" | Inspect top features; clean artifacts |
| Target leakage | A feature computed using the label | Never let preprocessing see the label |

## 7.2 Shortcut learning: the ISOT case

In the ISOT dataset, as commonly reported, real articles come largely from one news agency and often begin with a dateline like "CITY (Reuters) -", while fake articles come from other sites with their own habits ("21st Century Wire", "Featured image via ...", Twitter embeds). A model can reach ~99% just by learning "(Reuters) means REAL". That is a _true statement about this dataset_ and a _useless rule for judging other news_. **You verify this yourself in Phase 1 (counts) and Phase 3 (top features)** rather than taking it on trust.

The model isn't "cheating" on purpose. It optimizes the training objective, and the shortcut is the cheapest way to lower loss. Preventing that is your job.

## 7.3 How to detect it

1. **Suspiciously high scores** (>98%) on a hard-sounding task.
2. **Top features:** print the highest-weight words for each class (Part 5.2 snippet). Source names, agency tags, city names, URLs, "via", and formatting words are red flags; topic/style words are more legitimate.
3. **Ablation:** remove suspected artifacts, retrain, see how much the score drops. A big drop = it was leaning on them.
4. **Cross-dataset evaluation:** train on dataset A, test on dataset B from different sources. This is the strongest test of generalization.

## 7.4 Domain shift

Even after cleaning, expect a large drop on another dataset because sources, topics, time period, article length, and writing conventions differ. That is **domain shift** (the distribution at test time differs from training). A statement like "99% in-domain, ~X% cross-dataset, and here's why" is stronger than a bare 99%. **The drop is a finding to report, not a failure to hide.**

Also remember **concept drift**: news topics change over time (new names, events), and TF-IDF vocabulary is frozen at training time, so a model trained on 2016 to 2017 politics will be weaker on today's news.

## 7.5 What `clean_text` does and its limits

It removes artifacts you can _justify_ (dateline and agency tags, URLs, handles, boilerplate phrases you actually observed), then lowercases. It cannot remove _all_ source-specific style (vocabulary, sentence patterns, topics), so cross-dataset performance will still be well below in-domain. That's expected. Do not keep deleting words just to raise a score.

**Important sklearn detail:** if you pass `preprocessor=clean_text` to `TfidfVectorizer`, it _replaces_ sklearn's default preprocessing, and lowercasing is part of that default. So `clean_text` must lowercase at the end (after regexes that rely on capital letters, like the dateline pattern).

## 7.6 What a credible result looks like

```text
Model                  In-domain F1   Cross-dataset F1
baseline (raw)            0.99           (much lower)
cleaned                   0.98           (still lower, but honest)
```

plus a written explanation. That is the difference between "I trained a model that gets 99%" and "I understand why it gets 99% and how well it actually generalizes."

---

# Part 8: scikit-learn Pipelines, persistence, and train/serve consistency

## 8.1 The scikit-learn API in 60 seconds

Everything follows the same interface:
| Object type | Methods | Example |
|---|---|---|
| Estimator | `fit(X, y)` | anything trainable |
| Transformer | `fit`, `transform`, `fit_transform` | `TfidfVectorizer` |
| Classifier | `fit`, `predict`, `predict_proba` or `decision_function` | `LogisticRegression` |
Attributes learned during fit end with an underscore: `classes_`, `coef_`, `intercept_`, `vocabulary_`, `idf_`.

## 8.2 What a Pipeline is

A `Pipeline` chains steps: all but the last must be transformers; the last is the classifier.

```python
pipe = Pipeline([
    ("tfidf", TfidfVectorizer(preprocessor=clean_text, ngram_range=(1, 2), min_df=3)),
    ("clf",   LogisticRegression(max_iter=1000, random_state=42)),
])
pipe.fit(X_train, y_train)          # tfidf.fit_transform(train) -> clf.fit(...)
pipe.predict(["some article..."])   # tfidf.transform(text) -> clf.predict(...)
pipe.set_params(tfidf__ngram_range=(1, 1))   # step__param naming
```

**Why it matters here:**

1. **No leakage:** vectorizer is fit only on the data passed to `fit`, including within each CV fold.
2. **No train/serve mismatch:** raw text in, prediction out. The API can't accidentally use a different cleaning function or vocabulary than training.
3. **One artifact:** one file to save, load, and version.
4. **Easy experiments:** swap a step or parameter and re-run the same evaluation code.

## 8.3 Custom cleaning inside the pipeline

The cleaning function must be a **named, importable top-level function** (like `ml.src.preprocess.clean_text`) so it can be pickled. Lambdas and functions defined in a notebook cell will fail to load in the backend.

## 8.4 Model persistence

- **Serialization:** turning the fitted Python object into bytes on disk. `joblib.dump(pipe, path)` / `joblib.load(path)` (efficient for large NumPy arrays).
- The file stores the learned vocabulary, IDF values, weights, plus _references_ to your custom function by module path (`ml.src.preprocess.clean_text`). So the backend must import from the same path, which is why everything runs from the repo root.
- **Version compatibility:** load with the same scikit-learn version used for training. Otherwise you may get warnings or wrong behavior. We record versions in `model_card.json` and pin them in `requirements.txt`.
- **Security:** joblib/pickle files can execute code when loaded. Only load files you created yourself. Never load a model uploaded by a user.

## 8.5 Train/serve skew

The most common real-world ML bug: training used one preprocessing, serving used a subtly different one. Symptoms: model works in notebooks but gives odd results in the app. The Consistency test in Phase 8 (Predictor vs API output on the same 5 texts) exists to catch this.

## 8.6 Model card

A small JSON/markdown record of what a model is: dataset, training date, hyperparameters, metrics (in-domain and cross-dataset), versions, and limitations. It makes the model auditable and gives the UI's About section real numbers.

---

# Part 9: Scores, probabilities, and calibration

## 9.1 `predict` vs `predict_proba`

- `pipe.predict([text])` returns the class (0 or 1).
- `pipe.predict_proba([text])` returns `[[p_class0, p_class1]]` in the order of `pipe.classes_`. We look up the FAKE column via `classes_.index(config.FAKE)` rather than assuming position.

## 9.2 Why `fake_score` is not "87% chance it's fake"

Logistic regression's output is a well-formed number between 0 and 1, but it is **not a real-world probability** of falseness:

- It reflects similarity to the training data's patterns, not truth.
- For text with many TF-IDF features, models are often **overconfident**: 0.99 doesn't mean 99% of such articles are fake.
- On text from a different domain (Part 7.4), the score is even less trustworthy.
  That is why the API field is `fake_score`, the UI says "Model score", and every result carries a disclaimer.

## 9.3 Calibration (extension)

A model is **calibrated** if, among predictions with score ≈ 0.8, about 80% truly belong to the class. You can check with a **reliability diagram** and improve with `CalibratedClassifierCV` (Platt scaling or isotonic regression). Note that calibrating on in-domain data does not fix domain shift. Good "future work" material.

---

# Part 10: Python backend for someone who knows Express

## 10.1 Concept map

| Express / Node                              | FastAPI / Python                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `app.post("/predict", handler)`             | `@app.post("/predict")` decorator on a function                                             |
| `req.body` + manual validation (or zod/Joi) | A **Pydantic** model: declares fields and constraints; invalid input -> automatic 422 error |
| `cors()` middleware                         | `CORSMiddleware`                                                                            |
| `res.status(503).json({...})`               | `raise HTTPException(503, "...")`                                                           |
| `nodemon`                                   | `uvicorn backend.python.main:app --reload`                                                  |
| Swagger via extra libs                      | Built in at `http://localhost:8000/docs`                                                    |
| Startup code before `listen`                | **Lifespan** function: load the model once when the server starts                           |
| supertest                                   | `TestClient` (from Starlette/FastAPI) + `pytest`                                            |

## 10.2 Things that are different

- **ASGI and Uvicorn:** FastAPI is an ASGI app; Uvicorn is the server that runs it (like `node server.js`).
- **`def` vs `async def`:** `async def` handlers run on the event loop, like Node. If you do CPU-heavy work in one (like model inference), you block every other request. Plain `def` handlers run in a threadpool, so use `def` for prediction, as the Phase 6 code does.
- **Python doesn't have Node's single global event-loop assumption:** blocking calls are normal in `def` code.
- **Import paths:** running `uvicorn backend.python.main:app` from the repo root makes `ml.src...` importable. Running from an unrelated working directory can break it.
- **Loading the model once:** load in lifespan and store on `app.state`, not per request (loading takes seconds; prediction takes milliseconds).
- **Validation is declarative:** `Field(max_length=20000)` and a `@field_validator` replace manual `if` checks.
- **Status codes we use:** 200 OK, 422 validation error, 503 service unavailable (model missing), 500 unexpected error.
- **Logging:** log request paths/latency but never article text (privacy).

## 10.3 Request lifecycle in this project

```text
POST /predict {"text": "..."}
  -> Pydantic validates (length 20..20000)
  -> get_predictor(): 503 if model not loaded
  -> Predictor.predict(): pipeline.predict_proba([text])
  -> build response {label, fake_score, model_version, disclaimer}
```

---

# Part 11: Frontend in a few lines

You know React, so only what's specific: the UI keeps state `idle | loading | success | error`; `api.js` wraps `fetch` to `/api/predict` (Vite proxy in development, so no CORS trouble); errors from FastAPI arrive as `{"detail": ...}` (a string, or a list for validation errors); the UI shows label + "Model score" + disclaimer. **Product-honesty rule:** never present the output as proof of truth.

---

# Part 12: Concept-to-phase map

| Phase | Concepts you actually touch                                                              | Read                              |
| ----- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| 0     | venv, packages, `python -m`                                                              | 2.1                               |
| 1     | DataFrames, EDA, duplicates, label verification, stratified split, first look at leakage | 2.3, 3, 7.1                       |
| 2     | TF-IDF, logistic regression, split, metrics, majority baseline                           | 4.2 to 4.3, 5.2, 6.1 to 6.2       |
| 3     | Coefficients as importance, leakage, cleaning, domain shift, cross-dataset               | 5.2, 7, 4.3 (preprocessor gotcha) |
| 4     | n-grams, stopwords, NB/SVM, CV, error analysis, model selection                          | 4.1, 5.3 to 5.5, 6.4 to 6.6       |
| 5     | Pipelines, joblib, model card, `predict_proba`, train/serve skew                         | 8, 9                              |
| 6     | FastAPI, Pydantic, CORS, lifespan, status codes                                          | 10                                |
| 7     | Fetch, state handling                                                                    | 11                                |
| 8     | End-to-end tests, versions pinning                                                       | 8.4 to 8.5                        |
| 9     | Explaining everything; limits and ethics                                                 | 13, 15                            |

---

# Part 13: Beyond TF-IDF (know this for the viva, not needed to build)

## 13.1 Word embeddings

Instead of one column per word, represent each word as a dense vector (e.g. 300 numbers) learned so that words used in similar contexts get similar vectors (word2vec, GloVe). "car" and "automobile" end up close. Averaging a document's word vectors gives a simple embedding-based classifier that captures some meaning TF-IDF cannot.

## 13.2 Neural networks in one paragraph

A neural network stacks layers of weighted sums and nonlinear functions, trained by gradient descent (like logistic regression, which is a one-layer network). Depth lets it learn hierarchical features, at the cost of more data, compute, and less interpretability.

## 13.3 Transformers and BERT

**Transformers** use **attention**: for each word, the model computes how much to focus on every other word in the text, so meaning depends on context ("bank" in "river bank" vs "bank account"). **BERT** is a transformer pretrained on huge text to predict masked words, then **fine-tuned** on your labeled data (**transfer learning**), which usually beats TF-IDF on hard language tasks but needs a GPU, more time, and careful evaluation. Even BERT would be tricked by the same dataset artifacts if they exist, so Phase 3's lessons still apply.

## 13.4 Explainability (LIME / SHAP)

Tools that explain an individual prediction by showing which words pushed the score up or down. With linear models you already get a global version through `coef_`. A per-prediction explanation in the UI is a good extension.

## 13.5 Real fact-checking is a different problem

Verifying claims means extracting a claim, retrieving evidence from trusted sources, and judging whether the evidence supports or contradicts it (claim verification, retrieval-augmented systems). Text-style classifiers cannot do this.

## 13.6 Limits and ethics (prepare a 60-second answer)

- Labels are subjective and reflect _source reliability_, not each article's truth.
- False positives can unfairly label legitimate outlets or opinions; false negatives give false reassurance.
- Satire, opinion, breaking news, and non-English text are outside the training distribution.
- Bias: the model may associate certain topics/political framing with fake because of dataset composition.
- Automation bias: users may over-trust a confident-looking score, hence the disclaimer and "model score" wording.

---

# Part 14: Glossary

| Term                | Definition                                                                |
| ------------------- | ------------------------------------------------------------------------- |
| Accuracy            | Fraction of predictions that are correct                                  |
| Attention           | Mechanism letting a model weigh other words when interpreting each word   |
| Bag of Words        | Text as unordered word counts                                             |
| Baseline            | Simple reference model your model must beat                               |
| BERT                | Pretrained transformer language model                                     |
| Bias (intercept)    | Constant term `b` in a linear model                                       |
| Calibration         | Agreement between predicted scores and real frequencies                   |
| Classification      | Predicting a category                                                     |
| Confusion matrix    | Table of TP/FP/FN/TN                                                      |
| Corpus              | Collection of documents                                                   |
| Cross-validation    | Repeated train/validate over k folds                                      |
| Data leakage        | Training info that reveals the answer for reasons unavailable in real use |
| Domain shift        | Test data differs in distribution from training data                      |
| DF / IDF            | Document frequency / inverse document frequency                           |
| Embedding           | Dense vector representing a word or document                              |
| F1                  | Harmonic mean of precision and recall                                     |
| Feature             | Numeric input to the model                                                |
| Fine-tuning         | Further training a pretrained model on your task                          |
| Gradient descent    | Iterative method that adjusts weights to reduce loss                      |
| Hyperparameter      | Setting chosen before training                                            |
| Hinge loss          | SVM loss that ignores examples beyond the margin                          |
| Inference           | Using a trained model to predict                                          |
| L2 regularization   | Penalty on squared weights to reduce overfitting                          |
| Label               | Ground-truth answer                                                       |
| Lemmatization       | Reducing words to dictionary form                                         |
| Log loss            | Cross-entropy loss used by logistic regression                            |
| Model               | The learned function (weights + structure)                                |
| N-gram              | Sequence of n consecutive tokens                                          |
| Overfitting         | Memorizing training quirks; poor generalization                           |
| Parameter           | Value learned during training                                             |
| Pipeline            | Chained preprocessing + model object                                      |
| Precision           | Of predicted positives, fraction truly positive                           |
| Recall              | Of actual positives, fraction found                                       |
| Regularization      | Technique to limit model complexity                                       |
| Sigmoid             | `1/(1+e^-z)`; maps any number to (0,1)                                    |
| Sparse matrix       | Matrix storing only non-zero entries                                      |
| Stemming            | Crudely chopping word endings                                             |
| Stopwords           | Very common words often removed                                           |
| Stratification      | Preserving class proportions when splitting                               |
| Supervised learning | Learning from labeled examples                                            |
| Threshold           | Score cutoff for the positive class                                       |
| Token               | A unit of text after tokenization                                         |
| Train/serve skew    | Difference between preprocessing at training and serving                  |
| Transfer learning   | Reusing a pretrained model on a new task                                  |
| Underfitting        | Model too simple to capture patterns                                      |
| Vocabulary          | Set of tokens the vectorizer knows                                        |

---

# Part 15: Self-test questions

Use `LEARNING_LOG.md` to record concepts you can explain in your own words. The guide sections also provide viva-style review questions.

1. Why do we hide a test set, and why must the vectorizer be fit only on training data? (3.4, 8.2)
2. Compute TF-IDF for a word appearing in 2 of 5 documents with count 3 in one document (before L2 normalization) using the sklearn formula. _(idf = ln(6/3)+1 = 1.693, so 3 × 1.693 = 5.079.)_ (4.3)
3. Why can a model with 99% accuracy still be useless? Give two reasons. (6.2, 7)
4. Explain precision and recall for the FAKE class using a sentence about real users. (6.2)
5. What does `C` do in logistic regression, and which direction makes the model simpler? (5.2)
6. Why is Naive Bayes "naive"? Why does it still work on text? (5.3)
7. Why doesn't `LinearSVC` give probabilities, and what would you do if you needed them? (5.4)
8. What is stratified 5-fold cross-validation and why use it instead of the test set for model selection? (6.5)
9. What did you find in the top features before cleaning? Why is that a problem? (7.2 to 7.3)
10. Why does performance drop on the second dataset? Name three causes. (7.4)
11. Why does passing `preprocessor=` to `TfidfVectorizer` mean you must lowercase yourself? (4.3, 7.5)
12. What is train/serve skew, and how does a Pipeline reduce it? (8.5, 8.2)
13. Why is loading a joblib file from an untrusted source dangerous? (8.4)
14. Why does the API say `fake_score` rather than "probability of fake"? (9.2)
15. Why use plain `def` instead of `async def` for the prediction endpoint? (10.2)
16. What would BERT improve over TF-IDF, and what wouldn't it fix? (13.3)
17. Is this system a fact-checker? Explain in one minute. (1.4, 13.5)
