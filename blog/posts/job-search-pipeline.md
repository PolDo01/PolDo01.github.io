---
title: "I Automated My Job Hunt: A $0 Pipeline That Scans 5 Job Boards Every Morning"
date: 2026-10-11
excerpt: How a scheduled pipeline pulls from five free job-board APIs, normalizes them into one schema, and serves an apply-able shortlist every morning at 06:00 for $0/month.
---

*The in-depth write-up with all diagrams was originally published on
[Medium](https://medium.com/@leogdolleteiii/i-automated-my-job-hunt-building-a-0-data-pipeline-that-scans-5-job-boards-every-morning-47f14876f37d).*

Every morning at 6:00, while I'm still asleep, a scheduled task on my laptop wakes up
and queries five job boards. It fetches the newest listings, normalizes them into one
schema, keeps only the tech roles, and upserts everything into a single SQLite table. By
the time I sit down with coffee, the day's batch is loaded and a "can I apply" report is
waiting.

I didn't build this because I love job hunting. I built it because job hunting is an
**ingestion problem** in disguise.

Remote roles fill fast. Waiting a day (or even a few hours) means the interesting
listings already have a hundred applicants. Checking five boards manually every day is
unreliable: you miss days, you miss postings, and you filter inconsistently depending on
how tired you are. So I treated it like any other data problem: free API sources, a
normalized schema, evidence-based filters, idempotent loads, and a scheduler that never
forgets.

One day's pull filled the table with **30,516 listings**, kept **16,781 tech roles**, ran
in about **12 minutes**, and cost **$0**.

## Constraints first (they shaped everything)

- **No budget, no keys.** All five sources are public keyless APIs. Remotive's free API
  is hard-capped at 18 listings (commercial access starts around $5k/month), so that leg
  is deliberately small and the pipeline has to earn coverage from the rest.
- **Local-first.** It runs on my Windows laptop: no servers, no cloud bill, no
  credentials to rotate.
- **Explainable over clever.** Nothing is labeled by guesswork: every kept or dropped row
  records *which rule fired*, in a `tech_evidence` column, so I can audit and tune the
  filter at any time.
- **Idempotent.** Running the pipeline twice in one day is safe. The second run inserts
  nothing and refreshes the existing rows.
- **Polite.** Paced requests and rate-limit backoff: I want to stay welcome on APIs that
  are free for everyone.

That's why the project is seven numbered scripts instead of one clever app:
`01_fetch` → `02_inspect` → `03_normalize` → `04_load` → `05_export` → `06_marts` →
`07_analyze`. Each stage does one thing and can be inspected on its own.

## The pipeline, stage by stage

<img src="/assets/img/job-search-pipeline.svg" alt="Job search pipeline diagram">

*Diagram 1: the daily pipeline end to end — five sources converge on an extract stage,
then normalize, load into SQLite, transform, and report.*

The flow mirrors the **medallion pattern** you'd find in a production warehouse, shrunk
to laptop scale:

- **Bronze: raw snapshots.** `01_fetch.py` saves the untouched API payloads as
  `data/raw/{source}_{date}.json`. Nothing is filtered or transformed here, which means
  I can re-classify history later without ever refetching it.
- **Silver: normalize and classify.** `03_normalize_sources.py` maps each source's
  quirky JSON into one **23-column schema**, applies the tech and remote-scope
  classifiers, and writes two files: kept rows and dropped rows.
- **Load.** `04_union_and_load.py` upserts everything into `jobs.db` and then deletes its
  own intermediates. The database is the single source of truth.
- **Gold: serve.** `05_export_csv.py` writes an analysis-ready CSV with a computed
  `can_apply` column, `06_spark_marts.py` builds PySpark marts for reporting, and
  `07_analyze.py` prints the morning report.

The classification is a **ladder where the first match wins** and is recorded per row:
category allowlists for sources that label well → tag keywords → department metadata → a
title regex as the last resort. The tech split is then assigned by ordered regex passes
(data → devops → security → software → product & design → other). Non-tech rows are not
deleted; they land in SQLite with `is_tech = 0`, because a dropped row is data too.

Here's what one pull looks like per source:

| Source | Listings per pull | Mechanics |
|---|---|---|
| Remotive | 18 | hard-capped free tier |
| Jobicy | 652 | cursor pagination |
| Himalayas | 8,000 | 20 per page, ~33-hour window |
| Arbeitnow | 9,684 | full feed, 429 backoff |
| Greenhouse | 12,163 | 112 verified company boards |

`run_daily.py` orchestrates stages 01 and 03-07 on Windows Task Scheduler at 06:00,
prunes snapshots older than 14 days, and exits non-zero if anything failed.

**Observability came built in.** Every stage configures the same logger: console output
plus a rotating file (`logs/{stage}_{timestamp}.log`, 1 MB per file, 3 backups), so weeks
of daily runs stay reviewable without any logging infrastructure. The orchestrator writes
its own `daily_*.log` summarizing each run, and the scheduler's `Last Result` is the
top-level health check: `0x0` means every stage inside succeeded; anything else sends me
straight to the failed stage in its log.

## One table carries the whole story

<img src="/assets/img/job-search-schema.svg" alt="Jobs table schema diagram">

*Diagram 2: the `jobs` schema grouped by concern; the tech filter is a view, not a
delete.*

The destination is a single table: `jobs`. Its 23 columns fall into six concerns:

- **Identity:** `source`, `id`, `url`, `title`, `company_name`
- **Listing:** `category`, `tags`, `job_type`, `employment_type`, `publication_date`
- **Salary:** `salary_min`, `salary_max`, `salary_currency`, `salary_period`
- **Location:** `location`, `location_restrictions`, `timezone_restrictions`, `remote_scope`
- **Classification:** `is_tech`, `tech_field`, `tech_evidence`
- **Audit:** `description`, `fetched_at`

A few design choices do a lot of work here:

- `(source, id)` is a **composite primary key**, so the same listing from two sources
  stays two rows, but the same listing from the same source stays one row, forever.
- Kept and dropped rows live side by side, separated by the `jobs_tech` view
  (`SELECT * FROM jobs WHERE is_tech = 1`). The filter is reversible; the data never is.
- `remote_scope` is evidence-based too (`global` / `multi_region` / `region_only`) and
  feeds a `can_apply` column computed at export time.
- Salary is cleaned from free text where available (Remotive writes things like
  `$35,3k`, with a European decimal comma → `35300`).

## Three war stories

### 1. The API that ignored my page size

Himalayas turned out to be the hardest source to size correctly. Measuring it live:
roughly **5,900 new listings per day**. My first configuration pulled the newest 3,000:
at about 245 jobs per hour, that's a **13.5-hour window**. Two consequences I hadn't
planned for:

- Daily runs at 06:00 could still leave a ~10-hour blind spot between consecutive pulls.
- The API quietly **ignores the `limit` parameter** and serves 20 results per page
  regardless. My "100 per page" request was a polite fiction; 3,000 listings actually
  meant 150 requests.

The fix was to stop trusting parameters and start measuring: I raised the cap to 8,000
(**~33-hour window**, comfortably more than a day), made it environment-overridable, and
kept the 0.2-second pacing between pages. Verifying deep cursor pagination also confirmed
the feed can be walked reliably past the old cap.

### 2. The case of the missing job

One day I went looking for a specific Data Engineer listing on Himalayas and it wasn't in
my table: not filtered out, simply absent from the raw snapshot. Tracing it was a small
detective story: the listing had been published at the end of August, and by October, in
a newest-first feed moving at thousands of postings a day, it sat roughly **250,000
positions deep**. No realistic page depth reaches it.

Two lessons came out of that:

- An aggregator fed by the public feed only ever sees **fresh** postings. Old listings
  need targeted sources (their company's own ATS API; the project already does this for
  Greenhouse's 112 company boards).
- **Failures were too quiet.** A source that fetched zero jobs looked exactly like
  success. The fetch stage now exits non-zero when any source errors or comes back empty,
  and the task scheduler's `Last Result` reflects it honestly.

While I was in there, I also hardened the schedule itself: the task now runs **as soon
as possible after a missed start** (laptop asleep at 6:00) and no longer gets skipped on
battery.

### 3. Idempotency is a feature, not an accident

The first full run inserted 30,516 rows and kept 16,781 as tech roles. The second run the
same day: **0 inserted, everything refreshed**. That behavior comes from one line of SQL,
`INSERT ... ON CONFLICT(source, id) DO UPDATE`, and it changes how everything else feels.
Retrying after a partial failure never double-counts. Running twice in a day costs
nothing. And when the same job appeared twice inside a feed, one duplicate silently
collapsed (it did on the latest 8,000-listing pull).

### Small correctness wins

- Arbeitnow rate-limits under load; fetches retry with **5-10 second backoff** on `429`;
  rate limits are normal, not failures.
- CSV cells starting with `=`, `+`, `-`, or `@` get a `'` prefix, so a job description
  can never become a **spreadsheet formula**.
- All SQL is parameterized; Greenhouse board slugs are validated with `^[a-z0-9-]+$`.
- The company list is read with `utf-8-sig` because PowerShell wrote it with a BOM; a
  small detail that would have silently broken the first board name.

## Results

| Metric | Value |
|---|---|
| Listings in the database | 30,516 |
| Tech roles kept | 16,781 |
| Scope: global / multi-region / region-bound | 410 / 804 / 29,302 |
| Tech split | software 7,022 · data 4,587 · product & design 1,647 · devops 1,572 · other 1,319 · security 634 |
| Schedule | daily at 06:00 |
| Runtime | ~12 minutes |
| Cost | $0/month |

## If I had to scale this

This pipeline is a laptop-scale warehouse, so scaling it is less "rewrite everything" and
more "swap each stage for its managed equivalent". The part that doesn't change is the
**business logic**: the classification ladders, the scope rules, and the medallion
structure all carry over as-is.

| Stage | Today (local) | Scale option | Switch when... |
|---|---|---|---|
| Orchestration | `run_daily.py` + Task Scheduler | Airflow / Prefect / Dagster (managed: MWAA, Cloud Composer) | multiple pipelines, backfills, retries, a team |
| Ingestion | `requests` fetchers | Airbyte / Fivetran / Meltano (keep custom fetchers as containers for niche APIs) | dozens of sources, auth, incremental sync |
| Raw storage | local JSON, 14-day retention | S3 / GCS bronze bucket, date partitions + lifecycle rules | volume, durability, sharing |
| Transform | Python normalizers | dbt / SQLMesh; PySpark on Databricks / EMR / Glue | rules in reviewed SQL, tests, big volume |
| Warehouse | SQLite | DuckDB → Postgres / BigQuery / Snowflake | concurrent users, BI tools, GBs+ |
| Quality | logs and spot checks | dbt tests / Great Expectations / Soda | trust, SLAs, alerting |
| Serving | CSV + parquet marts | Metabase / Superset / Looker Studio | stakeholders, dashboards |
| Monitoring | log files | healthchecks.io / Slack alerts / Sentry | silent failures start to matter |

The order I'd actually take: DuckDB and dbt first (same laptop, better SQL), then object
storage, then a real orchestrator when more than one pipeline exists. Nothing on this
list needs adopting until the trigger fires, which is exactly the point of building it
small first.

## What this project taught me

- **Measure the API, don't trust the docs.** Page sizes lie, caps are silent, and "total
  jobs" is not "jobs you'll receive". The only reliable spec is observed behavior.
- **Failures should be loud.** A silent zero is worse than an error, because it looks
  like a successful empty day. Non-zero exits and honest scheduler results beat nice
  logs.
- **Freshness is a feature.** Deciding *what window* your pipeline sees is a design
  decision, not an accident. 33 hours > 24 hours > 13.5 hours.
- **Idempotency compounds.** Upserts turn every retry, rerun, and crash recovery into a
  non-event.
- **Simple scripts with strong contracts beat premature frameworks.** Every stage here is
  a file you can read in one sitting, and that's why I can still explain every row it
  produces.

## Closing

The pipeline now runs on its own, and my job hunt starts from a filtered table instead of
five browser tabs. If you're solving a similar "small but real" problem, the tools are
free and the patterns are the same ones big warehouses use, just smaller.

---

The full article with commentary is on
[Medium](https://medium.com/@leogdolleteiii/i-automated-my-job-hunt-building-a-0-data-pipeline-that-scans-5-job-boards-every-morning-47f14876f37d).