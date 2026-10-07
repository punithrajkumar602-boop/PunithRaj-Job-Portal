"use client";
import { useState, useEffect, useCallback, FormEvent } from "react";
import type { AnchorHTMLAttributes } from "react";
// Native navigation preserves the requested path across shared catch-all pages.
function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
import { usePathname } from "next/navigation";
import {
  Search,
  MapPin,
  Bookmark,
  BriefcaseBusiness,
  LayoutDashboard,
  UserRound,
  ArrowUpRight,
  SlidersHorizontal,
  Check,
  Plus,
  LogOut,
  Menu,
  X,
  Building2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  Code2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Layers,
  Trash2,
  Pencil,
  Download,
  RefreshCw,
} from "lucide-react";
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary: string;
  experience: string;
  skills: string[];
  description: string;
  benefits: string;
  deadline: string;
  status: string;
  source: string;
  source_url?: string;
  saved: boolean;
  applied?: boolean;
  posted_at: string;
  employer_id?: string;
};
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  bio: string;
  resume_url: string;
};
type Application = {
  id: string;
  job_id: string;
  title: string;
  company: string;
  candidate: string;
  email: string;
  created_at: string;
  status: string;
  cover_letter: string;
  resume_url: string;
  skills: string;
};
type DashboardData = {
  role: string;
  counts: Record<string, number>;
  top_skills: { name: string; count: number }[];
  top_companies: { name: string; count: number }[];
  top_locations: { name: string; count: number }[];
  scrape_runs: {
    id: string;
    created_at: string;
    added: number;
    duplicates: number;
    errors: string;
  }[];
};
type ApiResponse = {
  user: User;
  token: string;
  jobs: Job[];
  job: Job;
  applications: Application[];
  pagination: { total: number; pages: number };
  error: string;
  details?: { fieldErrors: Record<string, string[]> };
  score: number;
  matched: string[];
  missing: string[];
  jobs_added: number;
  duplicates_skipped: number;
  errors: string[];
} & DashboardData;
async function api(path: string, method = "GET", data?: unknown) {
  const r = await fetch("/api/" + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const d = (await r.json()) as ApiResponse;
  if (!r.ok)
    throw new Error(
      d.details
        ? Object.values(d.details.fieldErrors).flat().join(" · ") || d.error
        : d.error || "Request failed",
    );
  return d;
}
const modes = ["Remote", "Hybrid", "On-site"];
const types = ["Full-time", "Part-time", "Contract", "Internship"];
function age(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return days < 1 ? "Today" : `${days}d ago`;
}
function CompanyMark({ name }: { name: string }) {
  return (
    <div
      className={
        "company-mark mark-" +
        name
          .toLowerCase()
          .replace(/[^a-z]/g, "")
          .slice(0, 10)
      }
    >
      {name === "Linear" ? (
        <Layers size={24} />
      ) : name === "Vercel" ? (
        <span className="triangle" />
      ) : name === "Notion" ? (
        <span className="notion-n">N</span>
      ) : name === "Stripe" ? (
        <span className="stripe-s">S</span>
      ) : name === "Figma" ? (
        <span className="figma-f">F</span>
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export default function Portal() {
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const notify = useCallback((s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 5000);
  }, []);
  useEffect(() => {
    api("auth/me")
      .then((d) => setUser(d.user))
      .catch((e) => notify(e.message))
      .finally(() => setAuthReady(true));
  }, [notify]);

  const route = pathname.split("/").filter(Boolean);
  const isAuth = route[0] === "login" || route[0] === "register";
  const dashboard = route[0] === "dashboard";
  const nav = [
    {
      href: "/jobs",
      icon: BriefcaseBusiness,
      label: "Find jobs",
      active: !route.length || route[0] === "jobs",
    },
    {
      href: "/saved",
      icon: Bookmark,
      label: "Saved jobs",
      active: route[0] === "saved",
    },
    {
      href: "/applications",
      icon: Layers,
      label: "Applications",
      active: route[0] === "applications",
    },
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      active: dashboard,
    },
  ];
  async function logout() {
    await api("auth/logout", "POST");
    setUser(null);
    window.location.assign("/jobs");
    notify("You have signed out.");
  }
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <Link className="brand" href="/jobs">
          <span className="brand-mark">
            <Layers size={21} />
          </span>
          <span className="brand-name">PunithRaj - Job Portal</span>
        </Link>
        <div className="workspace-label">YOUR NEXT CHAPTER</div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobile(false)}
              className={"nav-link " + (n.active ? "active" : "")}
            >
              <n.icon size={19} />
              {n.label}
              {n.active && <span className="nav-indicator" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-eyebrow">MAKE YOUR MOVE</span>
            <h3>
              Good work starts
              <br />
              with a good fit.
            </h3>
            <p>
              Discover opportunities.
              <br />
              Build what comes next.
            </p>
            <div className="note-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <Link
            className={"nav-link " + (route[0] === "profile" ? "active" : "")}
            href="/profile"
          >
            <UserRound size={19} />
            My profile
          </Link>
          <Link className="nav-link" href="/docs">
            <Code2 size={19} />
            API & resources
          </Link>
          <div className="sidebar-footer">
            © {new Date().getFullYear()} PunithRaj Job Portal
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-btn mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={22} />
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            <b>
              {isAuth
                ? "Your account"
                : route[0] === "docs"
                  ? "Resources"
                  : route[0] === "profile"
                    ? "Profile"
                    : dashboard
                      ? "Dashboard"
                      : route[0] === "applications"
                        ? "Applications"
                        : route[0] === "saved"
                          ? "Saved jobs"
                          : "Discover"}
            </b>
          </span>
          <div className="topbar-right">
            <span className="header-note">
              <Globe size={15} /> Opportunities without borders
            </span>
            {user ? (
              <>
                <span className="role-pill">{user.role}</span>
                <Link href="/profile" className="avatar" title={user.name}>
                  {user.name.slice(0, 1)}
                </Link>
                <button
                  className="icon-btn"
                  onClick={logout}
                  aria-label="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="quiet-link">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-dark small">
                  Create account
                </Link>
              </>
            )}
          </div>
        </header>
        <main>
          {isAuth ? (
            <Auth
              register={route[0] === "register"}
              onUser={(u) => {
                setUser(u);
                window.location.assign("/dashboard");
              }}
            />
          ) : route[0] === "profile" ? (
            <Guard user={user} ready={authReady}>
              <Profile user={user!} onUser={setUser} notify={notify} />
            </Guard>
          ) : dashboard ? (
            <Guard user={user} ready={authReady}>
              <Dashboard user={user!} notify={notify} />
            </Guard>
          ) : route[0] === "applications" ? (
            <Guard user={user} ready={authReady}>
              <Applications user={user!} notify={notify} />
            </Guard>
          ) : route[0] === "docs" ? (
            <Docs />
          ) : route[0] === "jobs" && route[1] ? (
            <JobDetail id={route[1]} user={user} notify={notify} />
          ) : route[0] === "saved" ? (
            <Guard user={user} ready={authReady}>
              <Jobs saved user={user} notify={notify} />
            </Guard>
          ) : (
            <Jobs user={user} notify={notify} />
          )}
        </main>
        <footer className="page-footer">
          <span>A little ambition. A world of possibility.</span>
          <span>
            Built for your next step <span className="footer-dot">✦</span>
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Guard({
  user,
  ready,
  children,
}: {
  user: User | null;
  ready: boolean;
  children: React.ReactNode;
}) {
  if (!ready) return <div className="empty-state">Loading your workspace…</div>;
  if (!user)
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <UserRound />
        </div>
        <h2>Your workspace is waiting</h2>
        <p>Sign in to manage your jobs, applications, and profile.</p>
        <Link className="btn btn-dark" href="/login">
          Sign in
        </Link>
      </div>
    );
  return <>{children}</>;
}
function Jobs({
  saved = false,
  user,
  notify,
}: {
  saved?: boolean;
  user: User | null;
  notify: (s: string) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [locInput, setLocInput] = useState("");
  const [mode, setMode] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams({
      q,
      location,
      mode,
      type,
      sort,
      page: String(page),
      limit: "9",
      ...(saved ? { saved: "1" } : {}),
    });
    api("jobs?" + p)
      .then((d) => {
        setJobs(d.jobs);
        setTotal(d.pagination.total);
        setPages(d.pagination.pages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, location, mode, type, sort, page, saved]);
  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
  }, [load]);
  function filter(f: () => void) {
    f();
    setPage(1);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    filter(() => {
      setQ(search);
      setLocation(locInput);
    });
  }
  async function save(j: Job) {
    if (!user) {
      notify("Sign in as a candidate to save jobs.");
      return;
    }
    try {
      await api(`jobs/${j.id}/save`, j.saved ? "DELETE" : "POST");
      setJobs((list) =>
        saved
          ? list.filter((x) => x.id !== j.id)
          : list.map((x) => (x.id === j.id ? { ...x, saved: !x.saved } : x)),
      );
      if (saved) setTotal((n) => n - 1);
      notify(
        j.saved
          ? "Job removed from saved jobs."
          : "Job saved to your workspace.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span />{" "}
            {saved ? "YOUR SHORTLIST" : "THE NEXT OPPORTUNITY IS OUT THERE"}
          </div>
          <h1>
            {saved ? (
              "Keep the possibilities close."
            ) : (
              <>
                Find work that <em>fits you.</em>
              </>
            )}
          </h1>
          <p>
            {saved
              ? "The roles you want to come back to."
              : "Explore roles, meet your next team, and make your next move."}
          </p>
        </div>
        <div className="heading-art" aria-hidden="true">
          <div className="art-grid" />
          <BriefcaseBusiness size={39} />
          <span className="art-star">✦</span>
        </div>
      </div>
      <form className="search-bar" onSubmit={submit}>
        <div className="search-input">
          <Search size={21} />
          <input
            aria-label="Job title, company, or skills"
            placeholder="Job title, company, or skills"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="search-input location-input">
          <MapPin size={20} />
          <input
            aria-label="Location"
            placeholder="City or country"
            value={locInput}
            onChange={(e) => setLocInput(e.target.value)}
          />
        </div>
        <button className="btn btn-dark">Search jobs</button>
      </form>
      <div className="discovery-layout">
        <aside className={"filters " + (filterOpen ? "filters-open" : "")}>
          <div className="filter-header">
            <h3>
              <SlidersHorizontal size={17} /> Filters
            </h3>
            <button
              className="text-button"
              onClick={() =>
                filter(() => {
                  setMode("");
                  setType("");
                  setQ("");
                  setSearch("");
                  setLocation("");
                  setLocInput("");
                })
              }
            >
              Reset
            </button>
          </div>
          <section>
            <h4>Work arrangement</h4>
            {modes.map((m) => (
              <label className="check-label" key={m}>
                <input
                  type="checkbox"
                  checked={mode === m}
                  onChange={() => filter(() => setMode(mode === m ? "" : m))}
                />
                <span>{m}</span>
                {m === "Remote" && <span className="tiny-badge">Anywhere</span>}
              </label>
            ))}
          </section>
          <section>
            <h4>Employment type</h4>
            {types.map((t) => (
              <label className="check-label" key={t}>
                <input
                  type="checkbox"
                  checked={type === t}
                  onChange={() => filter(() => setType(type === t ? "" : t))}
                />
                <span>{t}</span>
              </label>
            ))}
          </section>
          <section className="filter-tip">
            <div className="tip-icon">
              <UserRound size={19} />
            </div>
            <h4>A profile that opens doors.</h4>
            <p>Add your skills and find where you fit.</p>
            <Link href="/profile">
              Complete your profile <ExternalLink size={13} />
            </Link>
          </section>
        </aside>
        <div className="results">
          <div className="results-toolbar">
            <div>
              <h2>
                {saved ? "Saved jobs" : "All opportunities"}{" "}
                <span>{total}</span>
              </h2>
              <p>
                {q
                  ? `Results for “${q}”`
                  : "Your next chapter could start here."}
              </p>
            </div>
            <button
              className="icon-btn filter-toggle"
              onClick={() => setFilterOpen(!filterOpen)}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={18} />
            </button>
            <label className="sort-label">
              Sort by{" "}
              <select
                value={sort}
                onChange={(e) => filter(() => setSort(e.target.value))}
              >
                <option value="newest">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Job title</option>
              </select>
            </label>
          </div>
          {(mode || type || q || location) && (
            <div className="active-filters">
              {[mode, type, q, location].filter(Boolean).map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          )}
          {error ? (
            <div className="error-box">
              <AlertCircle size={19} />
              {error}
              <button onClick={load}>Try again</button>
            </div>
          ) : loading ? (
            <div className="job-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div className="job-card skeleton" key={i}>
                  <div />
                  <div />
                  <div />
                </div>
              ))}
            </div>
          ) : !jobs.length ? (
            <div className="empty-state">
              <Search size={30} />
              <h2>{saved ? "No saved jobs yet" : "No matches just yet"}</h2>
              <p>
                {saved
                  ? "Save an interesting role to see it here."
                  : "Try another title, skill, or location, or reset your filters."}
              </p>
            </div>
          ) : (
            <div className="job-grid">
              {jobs.map((j) => (
                <article className="job-card" key={j.id}>
                  <div className="card-top">
                    <CompanyMark name={j.company} />
                    <button
                      className={"save-btn " + (j.saved ? "is-saved" : "")}
                      aria-label={j.saved ? "Unsave job" : "Save job"}
                      onClick={() => save(j)}
                    >
                      <Bookmark
                        size={19}
                        fill={j.saved ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <Link href={"/jobs/" + j.id} className="job-card-title">
                    <span className="company-name">{j.company}</span>
                    <h3>{j.title}</h3>
                  </Link>
                  <div className="job-location">
                    <MapPin size={14} />
                    {j.location}
                  </div>
                  <div className="job-tags">
                    <span
                      className={j.work_mode === "Remote" ? "tag teal" : "tag"}
                    >
                      {j.work_mode === "Remote" && <Globe size={11} />}{" "}
                      {j.work_mode}
                    </span>
                    <span className="tag">{j.employment_type}</span>
                  </div>
                  <div className="skill-tags">
                    {j.skills.slice(0, 3).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                    {j.skills.length > 3 && <span>+{j.skills.length - 3}</span>}
                  </div>
                  <div className="card-bottom">
                    <span className="salary">{j.salary}</span>
                    <span>{age(j.posted_at)}</span>
                  </div>
                  <div className="card-source">
                    {j.source === "Sample listing" ? (
                      <span>Sample listing · for exploration</span>
                    ) : j.source === "Remotive" ? (
                      <span>
                        via{" "}
                        <a href={j.source_url} target="_blank" rel="noreferrer">
                          Remotive
                        </a>
                      </span>
                    ) : (
                      <span>Posted on PunithRaj Job Portal</span>
                    )}
                    <Link href={"/jobs/" + j.id} aria-label={"View " + j.title}>
                      <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="pagination">
              <span>
                Page {page} of {pages}
              </span>
              <button
                className="icon-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-btn"
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          )}
          <div className="results-footnote">
            <CheckCircle2 size={14} /> Original source links for aggregated
            jobs. Sample listings are labeled.
          </div>
        </div>
      </div>
    </>
  );
}
function Auth({
  register,
  onUser,
}: {
  register: boolean;
  onUser: (u: User) => void;
}) {
  const [role, setRole] = useState("candidate");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const p = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const d = await api(
        "auth/" + (register ? "register" : "login"),
        "POST",
        register ? { ...p, role } : p,
      );
      onUser(d.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow light">A NEW CHAPTER</div>
        <h1>
          Great things
          <br />
          begin with
          <br />
          <em>the right fit.</em>
        </h1>
        <p>
          Find a role that moves you forward.
          <br />
          Or find the people who will.
        </p>
        <div className="auth-lines">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="auth-story-bottom">
          <Layers size={20} /> Your ambition belongs here.
        </div>
      </div>
      <div className="auth-form-wrap">
        <span className="eyebrow">
          {register ? "JOIN PUNITHRAJ" : "WELCOME BACK"}
        </span>
        <h2>{register ? "Make your next move." : "Good to see you again."}</h2>
        <p>
          {register
            ? "Create your account and explore the possibilities."
            : "Sign in to pick up where you left off."}
        </p>
        {register && (
          <div className="role-picker">
            <button
              className={role === "candidate" ? "selected" : ""}
              onClick={() => setRole("candidate")}
            >
              <UserRound size={18} /> I’m looking for work
            </button>
            <button
              className={role === "employer" ? "selected" : ""}
              onClick={() => setRole("employer")}
            >
              <Building2 size={18} /> I’m hiring
            </button>
          </div>
        )}
        <form onSubmit={submit}>
          {register && (
            <Field label="Full name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Your name"
              />
            </Field>
          )}
          <Field label="Email address">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          {register && role === "employer" && (
            <Field label="Company name">
              <input
                name="company"
                required
                minLength={2}
                placeholder="Your company"
              />
            </Field>
          )}
          <Field label="Password">
            <input
              type="password"
              name="password"
              required
              minLength={register ? 10 : 1}
              maxLength={128}
              placeholder={
                register ? "At least 10 characters" : "Your password"
              }
              autoComplete={register ? "new-password" : "current-password"}
            />
          </Field>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-dark full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {register
            ? "Already have an account?"
            : "New to PunithRaj Job Portal?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
function JobDetail({
  id,
  user,
  notify,
}: {
  id: string;
  user: User | null;
  notify: (s: string) => void;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [cover, setCover] = useState("");
  const [applying, setApplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<{
    score: number;
    matched: string[];
    missing: string[];
  } | null>(null);
  useEffect(() => {
    api("jobs/" + id)
      .then((d) => setJob(d.job))
      .catch((e) => setError(e.message));
  }, [id]);
  async function save() {
    if (!user) return notify("Sign in as a candidate to save this role.");
    try {
      await api(`jobs/${id}/save`, job?.saved ? "DELETE" : "POST");
      setJob((j) => (j ? { ...j, saved: !j.saved } : j));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function apply(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`jobs/${id}/apply`, "POST", { cover_letter: cover });
      setJob((j) => (j ? { ...j, applied: true } : j));
      setApplying(false);
      notify("Application submitted. You can track it in your dashboard.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <div className="error-box">{error}</div>;
  if (!job) return <div className="empty-state">Loading opportunity…</div>;
  return (
    <>
      <Link href="/jobs" className="back-link">
        <ChevronLeft size={16} /> All opportunities
      </Link>
      <div className="detail-layout">
        <article className="detail-content">
          <div className="detail-top">
            <CompanyMark name={job.company} />
            <div>
              <span className="company-name">{job.company}</span>
              <span className="detail-source">{job.source}</span>
            </div>
            <button
              className={"save-btn " + (job.saved ? "is-saved" : "")}
              onClick={save}
              aria-label="Save job"
            >
              <Bookmark fill={job.saved ? "currentColor" : "none"} size={21} />
            </button>
          </div>
          <h1>{job.title}</h1>
          <div className="detail-meta">
            <span>
              <MapPin size={16} />
              {job.location}
            </span>
            <span>
              <Clock size={16} />
              {age(job.posted_at)}
            </span>
          </div>
          <div className="job-tags">
            <span className="tag teal">{job.work_mode}</span>
            <span className="tag">{job.employment_type}</span>
            <span className="tag">{job.experience}</span>
          </div>
          {job.source === "Sample listing" && (
            <div className="info-box">
              This is an illustrative sample, not a verified vacancy. Explore
              the interface, or create an employer account to post a real test
              job.
            </div>
          )}
          <section>
            <h2>About the role</h2>
            <p className="description">{job.description}</p>
          </section>
          <section>
            <h2>Skills that make a difference</h2>
            <div className="skill-tags large">
              {job.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </section>
          {job.benefits && (
            <section>
              <h2>Benefits & perks</h2>
              <p className="description">{job.benefits}</p>
            </section>
          )}
          {job.source_url && (
            <section>
              <h2>Original listing</h2>
              <p>
                Aggregated from{" "}
                <a
                  className="inline-link"
                  href={job.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Remotive <ExternalLink size={14} />
                </a>
                . Read the original listing for the latest details.
              </p>
            </section>
          )}
        </article>
        <aside className="detail-aside">
          <div className="summary-card">
            <span className="eyebrow">THE DETAILS</span>
            <h3>{job.salary}</h3>
            <dl>
              <dt>Work arrangement</dt>
              <dd>{job.work_mode}</dd>
              <dt>Employment</dt>
              <dd>{job.employment_type}</dd>
              <dt>Experience</dt>
              <dd>{job.experience}</dd>
              {job.deadline && (
                <>
                  <dt>Application deadline</dt>
                  <dd>{job.deadline}</dd>
                </>
              )}
            </dl>
            {job.status === "closed" ? (
              <div className="info-box">Applications are closed.</div>
            ) : job.source_url ? (
              <a
                href={job.source_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-dark full"
              >
                Apply on Remotive <ExternalLink size={16} />
              </a>
            ) : job.source === "Sample listing" ? (
              <button className="btn full" disabled>
                Illustrative listing
              </button>
            ) : job.applied ? (
              <button className="btn full" disabled>
                <Check size={16} /> Applied
              </button>
            ) : user?.role === "candidate" ? (
              <button
                className="btn btn-dark full"
                onClick={() => setApplying(true)}
              >
                Apply for this role
              </button>
            ) : (
              <Link href="/login" className="btn btn-dark full">
                Sign in to apply
              </Link>
            )}
            <p className="summary-note">
              {job.source_url
                ? "You’ll continue to the original job listing."
                : "Your next chapter starts with one step."}
            </p>
          </div>
          {user?.role === "candidate" && (
            <div className="summary-card fit-card">
              <span className="eyebrow">YOUR SKILLS, THIS ROLE</span>
              <h3>See where you fit.</h3>
              <p>Compare your profile skills with this role’s requirements.</p>
              <button
                className="btn full"
                onClick={() =>
                  api(`jobs/${id}/match`)
                    .then(setMatch)
                    .catch((e) => notify(e.message))
                }
              >
                Check skill overlap
              </button>
              {match && (
                <div className="match-result">
                  <strong>{match.score}% overlap</strong>
                  <p>
                    {match.matched.length
                      ? `Matched: ${match.matched.join(", ")}`
                      : "Add skills to your profile to find matches."}
                  </p>
                  <p className="muted">
                    Based on exact skill overlap. This is not an AI assessment.
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
      {applying && (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              className="modal-close icon-btn"
              onClick={() => setApplying(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <span className="eyebrow">TAKE THE NEXT STEP</span>
            <h2>Apply to {job.company}</h2>
            <p>{job.title}</p>
            <form onSubmit={apply}>
              <Field label="Cover letter (optional)">
                <textarea
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  maxLength={5000}
                  rows={6}
                  placeholder="Tell the team what makes you a good fit."
                />
              </Field>
              <p className="muted">
                Your profile and resume link will be shared with this employer.
              </p>
              <button className="btn btn-dark full" disabled={busy}>
                {busy ? "Submitting…" : "Submit application"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function Profile({
  user,
  onUser,
  notify,
}: {
  user: User;
  onUser: (u: User) => void;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const p = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const d = await api("profile", "PUT", {
        ...p,
        skills: String(p.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onUser(d.user);
      notify("Your profile has been updated.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR PROFESSIONAL STORY"
        title="Put your best self forward."
        sub="Help the right opportunity find you."
      />
      <div className="profile-layout">
        <aside className="profile-card">
          <div className="profile-avatar">{user.name[0]}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="role-pill">{user.role}</span>
          <div className="profile-divider" />
          <p>
            Add your skills and a resume link to make applications more useful.
          </p>
        </aside>
        <form className="panel profile-form" onSubmit={submit}>
          <h2>Profile details</h2>
          <Field label="Full name">
            <input
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
            />
          </Field>
          <Field label="Skills">
            <input
              name="skills"
              defaultValue={user.skills.join(", ")}
              placeholder="React, TypeScript, PostgreSQL"
            />
            <small>Separate each skill with a comma.</small>
          </Field>
          <Field label="About you">
            <textarea
              name="bio"
              defaultValue={user.bio}
              rows={5}
              maxLength={3000}
              placeholder="Your experience, interests, and what comes next."
            />
          </Field>
          <Field label="Resume link">
            <input
              name="resume_url"
              type="url"
              defaultValue={user.resume_url}
              placeholder="https://…"
            />
            <small>Use an HTTPS link that employers can access.</small>
          </Field>
          <button className="btn btn-dark" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>
    </>
  );
}
function PageTitle({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading compact">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
function Applications({
  user,
  notify,
}: {
  user: User;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const load = useCallback(() => {
    api("applications?limit=20&page=" + page)
      .then((d) => {
        setData(d.applications);
        setPages(d.pagination.pages);
      })
      .catch((e) => setError(e.message));
  }, [page]);
  useEffect(load, [load]);
  async function change(id: string, status: string) {
    try {
      await api("applications/" + id, "PUT", { status });
      load();
      notify("Application status updated.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={
          user.role === "candidate" ? "YOUR JOURNEY" : "YOUR TALENT PIPELINE"
        }
        title={
          user.role === "candidate"
            ? "Every application is a possibility."
            : "Meet your next teammate."
        }
        sub={
          user.role === "candidate"
            ? "Follow the progress of the roles you’ve applied for."
            : "Review applications and keep candidates moving forward."
        }
      />
      {error ? (
        <div className="error-box">{error}</div>
      ) : !data.length ? (
        <div className="empty-state">
          <Layers size={32} />
          <h2>No applications yet</h2>
          <p>
            {user.role === "candidate"
              ? "Find a role you like and take the next step."
              : "Applications to your posted jobs will appear here."}
          </p>
          <Link
            className="btn btn-dark"
            href={user.role === "candidate" ? "/jobs" : "/dashboard"}
          >
            {user.role === "candidate" ? "Explore jobs" : "Manage jobs"}
          </Link>
        </div>
      ) : (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Opportunity</th>
                  {user.role !== "candidate" && <th>Candidate</th>}
                  <th>Applied</th>
                  <th>Status</th>
                  {user.role !== "candidate" && <th>Details</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={"/jobs/" + a.job_id}>
                        <strong>{a.title}</strong>
                      </Link>
                      <small>{a.company}</small>
                    </td>
                    {user.role !== "candidate" && (
                      <td>
                        <strong>{a.candidate}</strong>
                        <small>{a.email}</small>
                      </td>
                    )}
                    <td>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      {user.role === "candidate" ? (
                        <span className={"status status-" + a.status}>
                          {a.status}
                        </span>
                      ) : (
                        <select
                          value={a.status}
                          onChange={(e) => change(a.id, e.target.value)}
                        >
                          {[
                            "submitted",
                            "reviewing",
                            "shortlisted",
                            "rejected",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    {user.role !== "candidate" && (
                      <td>
                        <details>
                          <summary>View application</summary>
                          <p>{a.cover_letter || "No cover letter provided."}</p>
                          {a.resume_url && (
                            <a
                              className="inline-link"
                              href={a.resume_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Resume <ExternalLink size={13} />
                            </a>
                          )}
                          <p>{JSON.parse(a.skills || "[]").join(", ")}</p>
                        </details>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pages > 1 && (
        <div className="pagination">
          <span>
            {page} / {pages}
          </span>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
function Dashboard({
  user,
  notify,
}: {
  user: User;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [edit, setEdit] = useState<Job | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const load = useCallback(() => {
    api("dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
    if (user.role === "employer")
      api("jobs?owned=1&limit=50")
        .then((d) => setJobs(d.jobs))
        .catch((e) => setError(e.message));
  }, [user.role]);
  useEffect(load, [load]);
  async function remove() {
    if (!deleteId) return;
    try {
      await api("jobs/" + deleteId, "DELETE");
      setDeleteId(null);
      load();
      notify("Job deleted.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function close(j: Job) {
    try {
      await api("jobs/" + j.id, "PUT", {
        ...j,
        status: j.status === "open" ? "closed" : "open",
      });
      load();
      notify(j.status === "open" ? "Job closed." : "Job reopened.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function scrape() {
    setBusy(true);
    try {
      const d = await api("scrape/jobs", "POST", {});
      notify(
        `${d.jobs_added} jobs added · ${d.duplicates_skipped} duplicates skipped${d.errors.length ? " · " + d.errors.join(", ") : ""}`,
      );
      load();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const role = user.role;
  const first = user.name.split(" ")[0];
  return (
    <>
      <PageTitle
        eyebrow={
          role === "admin"
            ? "PORTAL OVERVIEW"
            : role === "employer"
              ? "YOUR HIRING WORKSPACE"
              : "YOUR CAREER WORKSPACE"
        }
        title={`Welcome back, ${first}.`}
        sub={
          role === "employer"
            ? "Build a team that moves things forward."
            : role === "admin"
              ? "A clear view of the people and opportunities on PunithRaj Job Portal."
              : "A small step today. A new chapter tomorrow."
        }
      >
        {role === "employer" && (
          <button className="btn btn-dark" onClick={() => setEdit(null)}>
            <Plus size={18} /> Post a job
          </button>
        )}
        {role === "admin" && (
          <button className="btn btn-dark" onClick={scrape} disabled={busy}>
            <RefreshCw size={17} className={busy ? "spin" : ""} />
            {busy ? "Importing…" : "Aggregate jobs"}
          </button>
        )}
      </PageTitle>
      {error && <div className="error-box">{error}</div>}
      {!data ? (
        <div className="empty-state">Loading dashboard…</div>
      ) : (
        <>
          <div className="stats-grid">
            {Object.entries(data.counts).map(([k, v], i) => (
              <div className="stat-card" key={k}>
                <div className="stat-label">
                  {k.replace(/_/g, " ")}
                  {i % 2 === 0 ? (
                    <BriefcaseBusiness size={18} />
                  ) : (
                    <Users size={18} />
                  )}
                </div>
                <strong>{String(v)}</strong>
                <span>
                  {role === "admin" ? "Across the portal" : "In your workspace"}
                </span>
              </div>
            ))}
          </div>
          {role === "employer" ? (
            <>
              <div className="section-toolbar">
                <h2>
                  Your job postings <span>{jobs.length}</span>
                </h2>
                <Link href="/applications" className="inline-link">
                  View applicants
                </Link>
              </div>
              {!jobs.length ? (
                <div className="empty-state">
                  <BriefcaseBusiness size={32} />
                  <h2>Good teams start with a great role.</h2>
                  <p>
                    Post your first opportunity and meet your next teammate.
                  </p>
                  <button
                    className="btn btn-dark"
                    onClick={() => setEdit(null)}
                  >
                    Post a job
                  </button>
                </div>
              ) : (
                <div className="panel table-panel">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Arrangement</th>
                          <th>Status</th>
                          <th>Posted</th>
                          <th>Manage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j) => (
                          <tr key={j.id}>
                            <td>
                              <Link href={"/jobs/" + j.id}>
                                <strong>{j.title}</strong>
                              </Link>
                              <small>{j.location}</small>
                            </td>
                            <td>{j.work_mode}</td>
                            <td>
                              <span className={"status status-" + j.status}>
                                {j.status}
                              </span>
                            </td>
                            <td>{age(j.posted_at)}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="icon-btn"
                                  onClick={() => setEdit(j)}
                                  aria-label="Edit job"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="text-button"
                                  onClick={() => close(j)}
                                >
                                  {j.status === "open" ? "Close" : "Reopen"}
                                </button>
                                <button
                                  className="icon-btn danger"
                                  onClick={() => setDeleteId(j.id)}
                                  aria-label="Delete job"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : role === "admin" ? (
            <>
              <div className="analytics-grid">
                <Ranking title="Skills in demand" data={data.top_skills} />
                <Ranking title="Top companies" data={data.top_companies} />
                <Ranking title="Popular locations" data={data.top_locations} />
              </div>
              <div className="panel">
                <div className="section-toolbar">
                  <h2>Aggregation history</h2>
                  <span className="muted">
                    Remotive · maximum once every 6 hours
                  </span>
                </div>
                {data.scrape_runs.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Run</th>
                          <th>Added</th>
                          <th>Duplicates</th>
                          <th>Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.scrape_runs.map((r) => (
                          <tr key={r.id}>
                            <td>{new Date(r.created_at).toLocaleString()}</td>
                            <td>{r.added}</td>
                            <td>{r.duplicates}</td>
                            <td>{JSON.parse(r.errors).join("; ") || "None"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No imports yet. Aggregate jobs to fetch public listings.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="candidate-grid">
              <Link className="action-panel" href="/jobs">
                <BriefcaseBusiness size={26} />
                <h2>Find your next opportunity.</h2>
                <p>Explore roles that match your ambition.</p>
                <span>
                  Explore jobs <ExternalLink size={15} />
                </span>
              </Link>
              <Link className="action-panel" href="/profile">
                <UserRound size={26} />
                <h2>Tell your story.</h2>
                <p>Add your skills, experience, and resume.</p>
                <span>
                  Update profile <ExternalLink size={15} />
                </span>
              </Link>
            </div>
          )}
        </>
      )}
      {edit !== undefined && (
        <JobEditor
          job={edit}
          onClose={() => setEdit(undefined)}
          onSave={() => {
            setEdit(undefined);
            load();
            notify("Job saved.");
          }}
        />
      )}
      {deleteId && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Delete this job?</h2>
            <p>
              This also removes its applications and saves. This action cannot
              be undone.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={remove}>
                Delete job
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function Ranking({
  title,
  data,
}: {
  title: string;
  data: { name: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="panel ranking">
      <h2>{title}</h2>
      {data.map((d) => (
        <div className="ranking-row" key={d.name}>
          <div>
            <span>{d.name}</span>
            <b>{d.count}</b>
          </div>
          <div className="bar-track">
            <i style={{ width: (d.count / max) * 100 + "%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function JobEditor({
  job,
  onClose,
  onSave,
}: {
  job: Job | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const p = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(job ? "jobs/" + job.id : "jobs", job ? "PUT" : "POST", {
        ...p,
        skills: String(p.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        deadline: p.deadline || null,
      });
      onSave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal wide">
        <button
          className="modal-close icon-btn"
          onClick={onClose}
          aria-label="Close editor"
        >
          <X />
        </button>
        <span className="eyebrow">MAKE ROOM FOR GREAT TALENT</span>
        <h2>{job ? "Edit opportunity" : "Post a new opportunity"}</h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Job title">
              <input
                name="title"
                required
                minLength={3}
                maxLength={150}
                defaultValue={job?.title}
                placeholder="e.g. Frontend Engineer"
              />
            </Field>
            <Field label="Location">
              <input
                name="location"
                required
                minLength={2}
                defaultValue={job?.location}
                placeholder="City, country, or Anywhere"
              />
            </Field>
            <Field label="Work arrangement">
              <select
                name="work_mode"
                defaultValue={job?.work_mode || "Remote"}
              >
                {modes.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Employment type">
              <select
                name="employment_type"
                defaultValue={job?.employment_type || "Full-time"}
              >
                {types.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Salary">
              <input
                name="salary"
                defaultValue={job?.salary}
                placeholder="₹15–25 LPA"
              />
            </Field>
            <Field label="Experience">
              <input
                name="experience"
                defaultValue={job?.experience}
                placeholder="2–4 years"
              />
            </Field>
            <Field label="Deadline (optional)">
              <input
                name="deadline"
                type="date"
                defaultValue={job?.deadline || ""}
              />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={job?.status || "open"}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
          </div>
          <Field label="Skills (comma separated)">
            <input
              name="skills"
              defaultValue={job?.skills.join(", ")}
              placeholder="React, TypeScript, CSS"
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              required
              minLength={30}
              maxLength={30000}
              rows={6}
              defaultValue={job?.description}
              placeholder="Describe the role, responsibilities, and requirements."
            />
          </Field>
          <Field label="Benefits">
            <textarea
              name="benefits"
              rows={2}
              defaultValue={job?.benefits}
              placeholder="What makes your team a great place to work?"
            />
          </Field>
          {error && <div className="error-box">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-dark" disabled={busy}>
              {busy ? "Saving…" : "Save opportunity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Docs() {
  return (
    <>
      <PageTitle
        eyebrow="DEVELOPER RESOURCES"
        title="Built to be understood."
        sub="API reference, database structure, and local setup."
      />
      <div className="resource-grid">
        {[
          {
            icon: Code2,
            title: "OpenAPI specification",
            desc: "All REST endpoints, authentication, and request schemas.",
            file: "/docs/openapi.json",
            label: "Download OpenAPI",
          },
          {
            icon: Download,
            title: "Postman collection",
            desc: "Import the collection and try the complete workflow.",
            file: "/docs/postman.json",
            label: "Download collection",
          },
          {
            icon: Building2,
            title: "Database schema",
            desc: "Relationships, constraints, indexes, and SQL definitions.",
            file: "/docs/schema.sql",
            label: "Download schema",
          },
          {
            icon: BriefcaseBusiness,
            title: "Source & setup",
            desc: "Architecture, configuration, and local development instructions.",
            file: "/docs/README.md",
            label: "Read README",
          },
        ].map((r) => (
          <div className="panel resource-card" key={r.title}>
            <r.icon size={25} />
            <h2>{r.title}</h2>
            <p>{r.desc}</p>
            <a
              className="inline-link"
              href={r.file}
              target="_blank"
              rel="noreferrer"
            >
              {r.label} <ExternalLink size={15} />
            </a>
          </div>
        ))}
      </div>
      <div className="panel api-overview">
        <h2>REST API</h2>
        <p>
          Base URL: <code>/api</code>. Use{" "}
          <code>Authorization: Bearer &lt;token&gt;</code> or the secure login
          cookie.
        </p>
        <div className="endpoint-list">
          {[
            ["POST", "/auth/register", "Candidate & employer registration"],
            ["POST", "/auth/login", "JWT login"],
            ["GET", "/jobs", "Search, filter, sort, and paginate"],
            ["POST", "/jobs", "Create an employer job"],
            ["GET", "/jobs/:id", "Job details"],
            ["PUT", "/jobs/:id", "Update or close your job"],
            ["DELETE", "/jobs/:id", "Delete your job"],
            ["POST", "/jobs/:id/apply", "Submit an application"],
            ["GET", "/applications", "Role-scoped applications"],
            ["GET", "/dashboard", "Role-specific statistics"],
            ["POST", "/scrape/jobs", "Admin job aggregation"],
          ].map(([m, p, d]) => (
            <div key={m + p}>
              <span className={"method method-" + m.toLowerCase()}>{m}</span>
              <code>{p}</code>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
