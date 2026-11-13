import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const emptyProduct = {
  name: "",
  category: "Fashion",
  price: "",
  oldPrice: "",
  rating: "5.0",
  badge: "",
  image: "",
  detail: "",
  color: "",
  stock: "0",
  active: true,
};
const emptyPost = { title: "", category: "", image: "", excerpt: "", content: "", published: false };
const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "journal", label: "Journal", icon: FileText },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "subscribers", label: "Subscribers", icon: Heart },
  { id: "settings", label: "Store settings", icon: Settings },
];

function request(path, token, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  });
}

const money = (value) => `₦${new Intl.NumberFormat("en-NG").format(Number(value) || 0)}`;
const date = (value) => value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value)) : "—";

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("luxora-admin-token") || "");
  const [adminEmail, setAdminEmail] = useState(() => sessionStorage.getItem("luxora-admin-email") || "");
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    overview: null,
    products: [],
    orders: [],
    posts: [],
    messages: [],
    subscribers: [],
    settings: {},
  });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [productDraft, setProductDraft] = useState(null);
  const [postDraft, setPostDraft] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const [overview, products, orders, journal, messages, subscribers, settings] = await Promise.all([
        request("/admin/overview", token),
        request("/admin/products", token),
        request("/admin/orders", token),
        request("/admin/journal", token),
        request("/admin/messages", token),
        request("/admin/subscribers", token),
        request("/admin/settings", token),
      ]);
      setData({
        overview,
        products: products.products,
        orders: orders.orders,
        posts: journal.posts,
        messages: messages.messages,
        subscribers: subscribers.subscribers,
        settings: settings.settings,
      });
      setSettingsDraft(Object.fromEntries(
        Object.entries(settings.settings).map(([key, item]) => [key, String(item.value ?? "")]),
      ));
    } catch (loadError) {
      setError(loadError.message);
      if (loadError.message.toLowerCase().includes("session") || loadError.message.includes("401")) logout();
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  function logout() {
    sessionStorage.removeItem("luxora-admin-token");
    sessionStorage.removeItem("luxora-admin-email");
    setToken("");
    setAdminEmail("");
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request("/admin/login", "", { method: "POST", body: JSON.stringify(login) });
      sessionStorage.setItem("luxora-admin-token", result.token);
      sessionStorage.setItem("luxora-admin-email", result.email);
      setAdminEmail(result.email);
      setToken(result.token);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action, successMessage) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const draft = productDraft;
    await runAction(async () => {
      const body = {
        ...draft,
        price: Number(draft.price),
        oldPrice: draft.oldPrice === "" ? null : Number(draft.oldPrice),
        stock: Number(draft.stock),
      };
      await request(draft.id ? `/admin/products/${draft.id}` : "/admin/products", token, {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setProductDraft(null);
    }, "Product saved.");
  }

  async function savePost(event) {
    event.preventDefault();
    const draft = postDraft;
    await runAction(async () => {
      await request(draft.id ? `/admin/journal/${draft.id}` : "/admin/journal", token, {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify(draft),
      });
      setPostDraft(null);
    }, "Journal post saved.");
  }

  async function saveSettings(event) {
    event.preventDefault();
    await runAction(
      () => request("/admin/settings", token, { method: "PUT", body: JSON.stringify(settingsDraft) }),
      "Store settings saved.",
    );
  }

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === activeTab), [activeTab]);

  if (!token) {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={signIn}>
          <a className="brand" href="/">LUXORA<small>ADMIN STUDIO</small></a>
          <p className="eyebrow">YOUR LITTLE CORNER OF CONTROL</p>
          <h1>Welcome <em>back.</em></h1>
          <p className="login-copy">Sign in with the admin credentials configured in the backend environment.</p>
          {error && <div className="alert alert-error"><CircleAlert size={16} />{error}</div>}
          <label>Email address<input type="email" autoComplete="username" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
          <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} /></button>
          <a className="back-to-store" href="http://localhost:5173" target="_blank" rel="noreferrer">Back to the store <ExternalLink size={14} /></a>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="/">LUXORA<small>ADMIN STUDIO</small></a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={activeTab === id ? "nav-item active" : "nav-item"} onClick={() => { setActiveTab(id); setMenuOpen(false); }}>
              <Icon size={17} strokeWidth={1.7} />{label}
              {id === "messages" && data.overview?.unreadMessages > 0 && <span className="nav-count">{data.overview.unreadMessages}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="http://localhost:5173" target="_blank" rel="noreferrer"><ExternalLink size={16} /> View storefront</a>
          <button type="button" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <main className="workspace">
        <header className="topbar">
          <button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs">Studio <ChevronDown size={14} /> <strong>{selectedTab?.label}</strong></div>
          <div className="topbar-actions"><span>{adminEmail}</span><button type="button" onClick={refresh} disabled={busy} aria-label="Refresh data"><RefreshCw size={17} className={busy ? "spinning" : ""} /></button></div>
        </header>
        <div className="page-content">
          {error && <div className="alert alert-error" role="alert"><CircleAlert size={17} />{error}<button type="button" onClick={() => setError("")}><X size={15} /></button></div>}
          {notice && <div className="alert alert-success" role="status"><Check size={17} />{notice}<button type="button" onClick={() => setNotice("")}><X size={15} /></button></div>}
          {activeTab === "overview" && <Overview data={data} money={money} onNavigate={setActiveTab} />}
          {activeTab === "products" && (
            <Products
              products={data.products}
              onCreate={() => setProductDraft({ ...emptyProduct })}
              onEdit={(product) => setProductDraft({ ...product, oldPrice: product.oldPrice ?? "" })}
              onDelete={(product) => {
                if (window.confirm(`Permanently delete "${product.name}"?`)) {
                  runAction(() => request(`/admin/products/${product.id}`, token, { method: "DELETE" }), "Product deleted.");
                }
              }}
              money={money}
            />
          )}
          {activeTab === "orders" && <Orders orders={data.orders} money={money} onStatus={(id, status) => runAction(() => request(`/admin/orders/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }), "Order status updated.")} />}
          {activeTab === "journal" && (
            <Journal
              posts={data.posts}
              onCreate={() => setPostDraft({ ...emptyPost })}
              onEdit={(post) => setPostDraft({ ...post })}
              onDelete={(post) => {
                if (window.confirm(`Delete "${post.title}"?`)) {
                  runAction(() => request(`/admin/journal/${post.id}`, token, { method: "DELETE" }), "Journal post deleted.");
                }
              }}
            />
          )}
          {activeTab === "messages" && <Messages messages={data.messages} onStatus={(id, status) => runAction(() => request(`/admin/messages/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }), "Message updated.")} />}
          {activeTab === "subscribers" && <Subscribers subscribers={data.subscribers} onDelete={(item) => {
            if (window.confirm(`Remove ${item.email} from subscribers?`)) {
              runAction(() => request(`/admin/subscribers/${item.id}`, token, { method: "DELETE" }), "Subscriber removed.");
            }
          }} />}
          {activeTab === "settings" && <SettingsPanel settings={settingsDraft} onChange={setSettingsDraft} onSubmit={saveSettings} busy={busy} />}
        </div>
      </main>

      {productDraft && <Editor title={productDraft.id ? "Edit product" : "Add a product"} onClose={() => setProductDraft(null)} onSubmit={saveProduct} busy={busy}>
        <div className="form-grid">
          <label>Product name<input required maxLength="160" value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
          <label>Category<input required maxLength="80" value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} /></label>
          <label>Price (NGN)<input type="number" min="0" required value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} /></label>
          <label>Previous price (optional)<input type="number" min="0" value={productDraft.oldPrice} onChange={(event) => setProductDraft({ ...productDraft, oldPrice: event.target.value })} /></label>
          <label>Badge<input maxLength="40" placeholder="BESTSELLER" value={productDraft.badge} onChange={(event) => setProductDraft({ ...productDraft, badge: event.target.value })} /></label>
          <label>Rating<input inputMode="decimal" value={productDraft.rating} onChange={(event) => setProductDraft({ ...productDraft, rating: event.target.value })} /></label>
          <label>Color / finish<input maxLength="100" value={productDraft.color} onChange={(event) => setProductDraft({ ...productDraft, color: event.target.value })} /></label>
          <label>Stock<input type="number" min="0" required value={productDraft.stock} onChange={(event) => setProductDraft({ ...productDraft, stock: event.target.value })} /></label>
        </div>
        <label>Image URL<input type="url" required value={productDraft.image} onChange={(event) => setProductDraft({ ...productDraft, image: event.target.value })} /></label>
        <label>Description<textarea rows="4" value={productDraft.detail} onChange={(event) => setProductDraft({ ...productDraft, detail: event.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={productDraft.active} onChange={(event) => setProductDraft({ ...productDraft, active: event.target.checked })} />Visible in storefront</label>
      </Editor>}

      {postDraft && <Editor title={postDraft.id ? "Edit journal post" : "Write a journal post"} onClose={() => setPostDraft(null)} onSubmit={savePost} busy={busy}>
        <div className="form-grid">
          <label>Title<input required maxLength="180" value={postDraft.title} onChange={(event) => setPostDraft({ ...postDraft, title: event.target.value })} /></label>
          <label>Category<input maxLength="100" value={postDraft.category} onChange={(event) => setPostDraft({ ...postDraft, category: event.target.value })} /></label>
        </div>
        <label>Image URL<input type="url" value={postDraft.image} onChange={(event) => setPostDraft({ ...postDraft, image: event.target.value })} /></label>
        <label>Short intro<textarea rows="2" maxLength="500" value={postDraft.excerpt} onChange={(event) => setPostDraft({ ...postDraft, excerpt: event.target.value })} /></label>
        <label>Article<textarea rows="7" maxLength="12000" value={postDraft.content} onChange={(event) => setPostDraft({ ...postDraft, content: event.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={postDraft.published} onChange={(event) => setPostDraft({ ...postDraft, published: event.target.checked })} />Publish on the storefront</label>
      </Editor>}
    </div>
  );
}

function PageHeading({ eyebrow, title, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action}</div>;
}

function Overview({ data, money, onNavigate }) {
  const overview = data.overview;
  const metrics = [
    { label: "Active products", value: overview?.products ?? "—", icon: Package, color: "sand" },
    { label: "Orders placed", value: overview?.orders ?? "—", icon: ShoppingBag, color: "sage" },
    { label: "Gross sales", value: money(overview?.revenue), icon: ArrowDownToLine, color: "rose" },
    { label: "Newsletter readers", value: overview?.subscribers ?? "—", icon: Heart, color: "blue" },
  ];
  return (
    <>
      <PageHeading eyebrow="YOUR STORE AT A GLANCE" title={<>A little <em>overview.</em></>} action={<button className="button button-outline" type="button" onClick={() => onNavigate("products")}><Plus size={16} /> Add a product</button>} />
      <div className="metric-grid">{metrics.map(({ label, value, icon: Icon, color }) => <article className="metric-card" key={label}><span className={`metric-icon ${color}`}><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</div>
      <div className="overview-grid">
        <section className="panel recent-orders">
          <div className="panel-heading"><div><p className="eyebrow">FRESH FROM THE SHOP</p><h2>Recent orders</h2></div><button className="text-button" type="button" onClick={() => onNavigate("orders")}>All orders <ArrowRight size={15} /></button></div>
          {overview?.recentOrders?.length ? <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>{overview.recentOrders.map((order) => <tr key={order.id}><td className="mono">#{order.id.slice(0, 8).toUpperCase()}</td><td>{order.customerName}<small>{order.email}</small></td><td>{date(order.createdAt)}</td><td>{money(order.total)}</td><td><span className={`status status-${order.status}`}>{order.status}</span></td></tr>)}</tbody></table></div> : <EmptyState text="Your orders will appear here." />}
        </section>
        <section className="panel quick-links"><p className="eyebrow">QUICK LINKS</p><h2>Make it yours.</h2><button type="button" onClick={() => onNavigate("products")}><Package size={17} /> Update your collection <ArrowRight size={15} /></button><button type="button" onClick={() => onNavigate("journal")}><FileText size={17} /> Write a journal post <ArrowRight size={15} /></button><button type="button" onClick={() => onNavigate("settings")}><Settings size={17} /> Edit store details <ArrowRight size={15} /></button><div className="unread-note"><Mail size={16} /> {overview?.unreadMessages || 0} unread customer messages</div></section>
      </div>
    </>
  );
}

function Products({ products, onCreate, onEdit, onDelete, money }) {
  return <>
    <PageHeading eyebrow="YOUR CONSIDERED COLLECTION" title={<>Thoughtful <em>things.</em></>} action={<button className="button button-dark" type="button" onClick={onCreate}><Plus size={16} /> Add product</button>} />
    <section className="panel listing-panel"><div className="list-toolbar"><span>{products.length} products</span></div>
      {products.length ? <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>VISIBILITY</th><th></th></tr></thead><tbody>
        {products.map((product) => <tr key={product.id}><td><div className="product-cell"><img src={product.image} alt="" /><span>{product.name}<small>#{product.id} · {product.badge || "No badge"}</small></span></div></td><td>{product.category}</td><td>{money(product.price)}{product.oldPrice && <del className="old-price">{money(product.oldPrice)}</del>}</td><td>{product.stock}</td><td><span className={`status ${product.active ? "status-live" : "status-draft"}`}>{product.active ? "Live" : "Hidden"}</span></td><td><div className="row-actions"><button type="button" onClick={() => onEdit(product)}>Edit</button><button className="icon-action danger" type="button" onClick={() => onDelete(product)} aria-label={`Delete ${product.name}`}><Trash2 size={16} /></button></div></td></tr>)}
      </tbody></table></div> : <EmptyState text="Add your first product to get started." />}
    </section>
  </>;
}

function Orders({ orders, money, onStatus }) {
  return <>
    <PageHeading eyebrow="FULFILMENT DESK" title={<>Orders & <em>good things.</em></>} />
    <section className="panel listing-panel"><div className="list-toolbar"><span>{orders.length} orders</span><span>Update a status as each parcel makes its way</span></div>
      {orders.length ? <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>SHIP TO</th><th>ITEMS</th><th>TOTAL</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>
        {orders.map((order) => <tr key={order.id}><td className="mono">#{order.id.slice(0, 8).toUpperCase()}</td><td>{order.customerName}<small>{order.email}</small><small>{order.phone}</small><small>{order.address}</small></td><td>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td><td>{money(order.total)}</td><td>{date(order.createdAt)}</td><td><select className="status-select" value={order.status} onChange={(event) => onStatus(order.id, event.target.value)} aria-label={`Set order ${order.id} status`}>{["pending", "processing", "shipped", "completed", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}
      </tbody></table></div> : <EmptyState text="No orders yet. New orders will appear here." />}
    </section>
  </>;
}

function Journal({ posts, onCreate, onEdit, onDelete }) {
  return <>
    <PageHeading eyebrow="STORIES & NOTES" title={<>The Luxora <em>journal.</em></>} action={<button className="button button-dark" type="button" onClick={onCreate}><Plus size={16} /> Write a post</button>} />
    {posts.length ? <div className="journal-admin-grid">{posts.map((post) => <article className="panel journal-admin-card" key={post.id}><img src={post.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80"} alt="" /><div className="journal-admin-copy"><span className={`status ${post.published ? "status-live" : "status-draft"}`}>{post.published ? "Published" : "Draft"}</span><p className="eyebrow">{post.category || "UNCATEGORIZED"}</p><h2>{post.title}</h2><p>{post.excerpt}</p><div className="row-actions"><button type="button" onClick={() => onEdit(post)}>Edit story</button><button className="icon-action danger" type="button" aria-label={`Delete ${post.title}`} onClick={() => onDelete(post)}><Trash2 size={16} /></button></div></div></article>)}</div> : <section className="panel"><EmptyState text="Your journal is ready for its first story." /></section>}
  </>;
}

function Messages({ messages, onStatus }) {
  return <>
    <PageHeading eyebrow="CUSTOMER CARE" title={<>A note from <em>someone.</em></>} />
    <section className="message-list">{messages.length ? messages.map((message) => <article className={`panel message-card ${message.status === "unread" ? "unread" : ""}`} key={message.id}><div className="message-heading"><div><span className={`status status-${message.status}`}>{message.status}</span><h2>{message.subject}</h2><p>{message.name} · <a href={`mailto:${message.email}`}>{message.email}</a> · {date(message.createdAt)}</p></div><select className="status-select" value={message.status} onChange={(event) => onStatus(message.id, event.target.value)} aria-label="Message status">{["unread", "read", "replied"].map((status) => <option key={status}>{status}</option>)}</select></div><p className="message-body">{message.message}</p><a className="reply-link" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}>Reply by email <ArrowRight size={15} /></a></article>) : <section className="panel"><EmptyState text="Your customer notes will appear here." /></section>}</section>
  </>;
}

function Subscribers({ subscribers, onDelete }) {
  return <>
    <PageHeading eyebrow="THE LITTLE LETTER" title={<>Your lovely <em>readers.</em></>} />
    <section className="panel listing-panel"><div className="list-toolbar"><span>{subscribers.length} subscribers</span><a className="text-button" href={`data:text/csv;charset=utf-8,${encodeURIComponent(["email,subscribed_at", ...subscribers.map((item) => `${item.email},${date(item.createdAt)}`)].join("\n"))}`} download="luxora-subscribers.csv">Download CSV <ArrowDownToLine size={15} /></a></div>
      {subscribers.length ? <div className="table-scroll"><table><thead><tr><th>EMAIL ADDRESS</th><th>JOINED</th><th></th></tr></thead><tbody>{subscribers.map((item) => <tr key={item.id}><td>{item.email}</td><td>{date(item.createdAt)}</td><td><button className="icon-action danger" type="button" aria-label={`Remove ${item.email}`} onClick={() => onDelete(item)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div> : <EmptyState text="No newsletter subscribers yet." />}
    </section>
  </>;
}

function SettingsPanel({ settings, onChange, onSubmit, busy }) {
  const entries = Object.entries(settings);
  return <>
    <PageHeading eyebrow="THE FINISHING TOUCHES" title={<>Your store, your <em>way.</em></>} />
    <form className="panel settings-panel" onSubmit={onSubmit}>
      <p className="settings-intro">Edit text and links displayed by the storefront. Add a setting key to expose more content to the client.</p>
      {entries.map(([key, value]) => <label className="setting-row" key={key}><span><strong>{key}</strong><small>Displayed on the storefront when supported</small></span><input value={value} onChange={(event) => onChange({ ...settings, [key]: event.target.value })} /></label>)}
      <NewSetting onAdd={(key) => onChange({ ...settings, [key]: "" })} existing={settings} />
      <button className="button button-dark" type="submit" disabled={busy}><Save size={16} /> Save store settings</button>
    </form>
  </>;
}

function NewSetting({ onAdd, existing }) {
  const [key, setKey] = useState("");
  function add(event) {
    event.preventDefault();
    const normalized = key.trim();
    if (!normalized || existing[normalized]) return;
    onAdd(normalized);
    setKey("");
  }
  return <form className="new-setting" onSubmit={add}><label>Add a setting key<input placeholder="e.g. supportEmail" value={key} onChange={(event) => setKey(event.target.value)} pattern="[a-zA-Z][a-zA-Z0-9_.-]{0,79}" title="Start with a letter; use letters, numbers, dots, underscores or hyphens." required /></label><button className="button button-outline" type="submit"><Plus size={15} /> Add field</button></form>;
}

function Editor({ title, onClose, onSubmit, busy, children }) {
  return <div className="editor-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="editor-panel" onSubmit={onSubmit}><header><div><p className="eyebrow">A FEW THOUGHTFUL DETAILS</p><h2>{title}</h2></div><button className="icon-action" type="button" onClick={onClose} aria-label="Close editor"><X size={19} /></button></header><div className="editor-body">{children}</div><footer><button className="button button-outline" type="button" onClick={onClose}>Cancel</button><button className="button button-dark" type="submit" disabled={busy}><Save size={15} /> Save changes</button></footer></form></div>;
}

function EmptyState({ text }) {
  return <div className="empty-state"><ClipboardList size={23} /><p>{text}</p></div>;
}

export default App;
