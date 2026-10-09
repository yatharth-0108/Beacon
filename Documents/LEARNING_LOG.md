# Learning log

Add an entry per phase: concepts met in the code (one or two plain sentences each) and one viva question you can answer.

## Template

### Phase N: title

- Concept: explanation
- Concept: explanation
- Viva question: ... My answer: ...

### Phase 11: Authentication

- JWT cookies: a signed token is created with the user id and email, then stored in an httpOnly cookie so browsers send it automatically on same-site requests without exposing it to JavaScript.
- Password hashing: bcrypt converts the raw password into a one-way hash before saving it, which means the database never stores plaintext credentials.
- Middleware pattern: the auth middleware attaches a verified user object to the request when the cookie is valid, so guest and logged-in routes can share one app without duplicating logic.
- Secure cookie settings: httpOnly and sameSite prevent browser-side script access and limit the cookie to same-site requests; the server also keeps the cookie secure in production.
- Route checks: `/me` is a read-only endpoint that returns the current user when a valid token exists; `logout` clears the cookie and stops the session cleanly.
- Viva question: Why do we verify the JWT before trusting `req.user` and what does the server do if verification fails? My answer: We verify the signature and expiry to prevent forged or expired tokens; if it fails, the middleware leaves the user unset and the route treats the request as unauthenticated.

### Phase 12: News feed and caching

- Cache-first fetch pattern: the feed reads MongoDB first, so repeated page loads are fast and the app does not keep hammering the upstream provider.
- Background refresh job: a scheduled sync keeps the cache fresh without blocking the request path, which is important when a free API has strict daily quotas.
- Topic-specific retrieval: when a user asks for a filtered feed and the cache is empty, the server fetches once, saves those stories, and returns them as the new cached result.
- Data normalization: article metadata such as title, source, URL, and published time are converted into a consistent schema before storing, which keeps the API responses predictable.
- Viva question: Why is the cache crucial for GNews when the app is a demo with many users and a low daily quota? My answer: because each page load would otherwise trigger a paid or limited API call, and caching turns repeated reads into cheap local database lookups.

### Phase 13: Fact-check with Groq and caching

- Hashing before lookup: the app creates a stable SHA-256 digest from the normalized article text, which gives a canonical key for deduplicating repeated submissions and preventing unnecessary Groq calls.
- Grounded prompting: the model is asked to judge a claim using a short article plus a few related cached news items, which keeps it anchored to real context instead of letting it rely on unverified memory.
- Parser resilience: the verdict parser tolerates malformed model output by extracting the key lines when possible and falling back to an `unverifiable` verdict if the format is broken.
- Cache-first behavior: if the same text is seen again, the app returns the stored verdict immediately and increments the usage counter, which is crucial for free-tier LLM quotas and demo responsiveness.
- Graceful degradation: when Groq fails, the service converts the problem into a clean `verdict: "unavailable"` result instead of crashing or returning a 500 to the browser.
- Viva question: Why do we combine a text hash with a cached fact-check record instead of checking the raw article string every time? My answer: hashing normalizes whitespace and casing, gives a consistent lookup key, and reduces duplicate work while still preserving the original article preview and result metadata.

### Phase 14: Auth state and fact-check frontend integration

- Cookie-based auth state: the browser keeps the JWT in an httpOnly cookie, and the app reloads the current user on startup so refreshes keep the session alive without storing credentials in local storage.
- Protected UI flow: guest users still get the NLP prediction path, but the fact-check button is disabled and explained until they log in, which keeps the feature accessible without exposing a broken action.
- Express proxying: all browser requests now target the Express server, which centralizes cookie handling and keeps the React app away from the Python model service.
- Role-aware navigation: the header switches between login/register actions and the logged-in user badge, creating a single auth-aware app experience instead of two separate screens.
- Viva question: Why is `credentials: 'include'` mandatory when the frontend calls `/api/auth/me` and `/api/factcheck`? My answer: because browsers only send session cookies on requests that explicitly include credentials, and without that setting the server cannot authenticate the user for protected requests.

### Phase 15: Prediction Calibration, URL Extraction, and Multi-Factor Image Forensics

- Linguistic classification vs. fact checking: TF-IDF and linear models analyze publisher writing styles and vocabulary distributions across multi-paragraph articles. They do not have live web knowledge or real-time ground truth to verify isolated 4-word claims.
- Uncertainty calibration: Predictions with confidence near 50% (45-55%) or on short phrases (< 50 characters) are marked as `UNCERTAIN` / `INCONCLUSIVE` rather than forcing a coin-flip binary verdict.
- Safe article extraction: Cheerio parses external HTML trees, strips non-content scripts/navigation/ads, and isolates `<article>` body text so the NLP pipeline processes genuine news prose instead of boilerplate HTML.
- Multi-factor image forensics: Error Level Analysis (ELA) compression differentials combined with 2D FFT spectral roll-off and Laplacian edge noise detect both pixel-level splicing and AI generative synthesis without hardcoded heuristics.
- Viva question: Why should an NLP text classifier return UNCERTAIN on short claims like "Mamta banerjee is dead"? My answer: Because n-gram TF-IDF models classify stylistic patterns in publisher text rather than real-time factual truth; on a 4-word statement without article context, the feature vector is nearly empty and results in an uncalibrated ~50% score that must be presented honestly as inconclusive.

### Phase 16: Hybrid Evidence-Based Fact Verification vs. Writing-Style Classification

- Fundamental distinction between style and truth: An NLP model evaluates lexical distributions and tone (e.g. sensational vs formal prose). It cannot know real-world factual claims (e.g. whether drinking bleach cures infections).
- Evidence retrieval pipeline: Factual claims are parsed into semantic entities and cross-referenced with public health databases, scientific consensus, and encyclopedic archives (e.g. WHO, CDC, FDA, Wikipedia REST APIs).
- Evidence-based verdicts: If authoritative records directly contradict a claim (e.g. bleach ingestion toxicity), the system returns `CONTRADICTED` with source citations. If evidence confirms the statement (e.g. planetary orbits), it returns `SUPPORTED`. If evidence is silent, it falls back to linguistic pattern analysis with transparent disclaimers.
- Viva question: Why did the bleach cure claim originally get classified as REAL with 59%? My answer: Because the claim was written in formal, grammatical English without sensationalist exclamation marks, so the TF-IDF linguistic model classified its prose structure as formal news tone. Introducing an evidence-retrieval layer prevents confusing writing style with factual truth.


