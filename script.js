/* =====================================================
   DATA STRUCTURES
   ===================================================== */

// ---------- LINKED LIST (order tracking stages) ----------
class StageNode {
  constructor(label, isReturn = false) {
    this.label = label;
    this.isReturn = isReturn;
    this.done = false;
    this.next = null;
  }
}

class TrackingList {
  constructor(labels) {
    this.head = null;
    this.tail = null;
    labels.forEach((l) => this.append(l));
    this.current = this.head;      // pointer to current stage
    this.head.done = true;         // "Order Placed" is complete
  }
  append(label, isReturn = false) {
    const node = new StageNode(label, isReturn);
    if (!this.head) this.head = this.tail = node;
    else { this.tail.next = node; this.tail = node; }
    return node;
  }
  advance() {                      // move pointer to next node
    if (!this.current.next) return false;
    this.current = this.current.next;
    this.current.done = true;
    return true;
  }
  hasNext() { return this.current.next !== null; }
  toArray() {
    const out = [];
    for (let n = this.head; n; n = n.next) out.push(n);
    return out;
  }
}

// ---------- QUEUE (order processing, FIFO) ----------
class Queue {
  constructor() { this.items = []; this.front = 0; }
  enqueue(x) { this.items.push(x); }
  dequeue() {
    if (this.isEmpty()) return null;
    const x = this.items[this.front++];
    if (this.front > 20) { this.items = this.items.slice(this.front); this.front = 0; }
    return x;
  }
  peek() { return this.isEmpty() ? null : this.items[this.front]; }
  isEmpty() { return this.front >= this.items.length; }
  get size() { return this.items.length - this.front; }
}

// ---------- STACK (recently viewed, LIFO) ----------
class Stack {
  constructor(limit = 5) { this.items = []; this.limit = limit; }
  push(x) {
    this.items = this.items.filter((i) => i.id !== x.id); // no duplicates
    this.items.push(x);
    if (this.items.length > this.limit) this.items.shift();
  }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  toArray() { return [...this.items].reverse(); }           // top first
}

// ---------- TREE (category hierarchy) ----------
class CategoryNode {
  constructor(id, name) { this.id = id; this.name = name; this.children = []; }
  add(child) { this.children.push(child); return this; }
}

function findNode(node, id) {                 // DFS search
  if (node.id === id) return node;
  for (const c of node.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function collectIds(node) {                   // all ids in a subtree
  return [node.id, ...node.children.flatMap(collectIds)];
}

const root = new CategoryNode("all", "All Categories")
  .add(new CategoryNode("electronics", "Electronics")
    .add(new CategoryNode("mobiles", "Mobiles"))
    .add(new CategoryNode("laptops", "Laptops"))
    .add(new CategoryNode("audio", "Audio")))
  .add(new CategoryNode("fashion", "Fashion")
    .add(new CategoryNode("men", "Men"))
    .add(new CategoryNode("women", "Women")))
  .add(new CategoryNode("home", "Home & Kitchen"));

/* =====================================================
   SAMPLE DATA & STATE
   ===================================================== */
const products = [
  { id: 1,  name: "Galaxy S25 Phone",   price: 74999, cat: "mobiles", emoji: "📱", desc: "6.8\" AMOLED, 256GB storage." },
  { id: 2,  name: "Pixel Lite Phone",   price: 34999, cat: "mobiles", emoji: "📲", desc: "Clean Android, great camera." },
  { id: 3,  name: "UltraBook 14",       price: 69999, cat: "laptops", emoji: "💻", desc: "14\" laptop, 16GB RAM, 512GB SSD." },
  { id: 4,  name: "Gaming Laptop X",    price: 99999, cat: "laptops", emoji: "🖥️", desc: "RTX graphics, 165Hz display." },
  { id: 5,  name: "Wireless Earbuds",   price: 2999,  cat: "audio",   emoji: "🎧", desc: "ANC, 24h battery life." },
  { id: 6,  name: "Bluetooth Speaker",  price: 1999,  cat: "audio",   emoji: "🔊", desc: "Waterproof, 12h playtime." },
  { id: 7,  name: "Men's Denim Jacket", price: 2499,  cat: "men",     emoji: "🧥", desc: "Classic fit, 100% cotton." },
  { id: 8,  name: "Running Shoes",      price: 3499,  cat: "men",     emoji: "👟", desc: "Lightweight with cushioned sole." },
  { id: 9,  name: "Women's Kurti",      price: 999,   cat: "women",   emoji: "👗", desc: "Printed cotton, all sizes." },
  { id: 10, name: "Handbag",            price: 1799,  cat: "women",   emoji: "👜", desc: "Faux leather, 3 compartments." },
  { id: 11, name: "Air Fryer 4L",       price: 5499,  cat: "home",    emoji: "🍟", desc: "Digital controls, 8 presets." },
  { id: 12, name: "Non-stick Cookware", price: 2299,  cat: "home",    emoji: "🍳", desc: "5-piece induction-friendly set." },
];

let cart = [];                           // ARRAY of { id, qty }
const orderQueue = new Queue();          // QUEUE of orders waiting to be processed
const recentlyViewed = new Stack(5);     // STACK of viewed products
const orders = [];                       // all placed orders (each has a TrackingList)

let selectedCat = "all";
let searchText = "";
let dialogProduct = null;
let orderCounter = 1000;

const RETURN_STAGES = ["Return Requested", "Pickup Scheduled", "Picked Up", "Refund Issued"];

/* =====================================================
   HELPERS
   ===================================================== */
const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + n.toLocaleString("en-IN");
const getProduct = (id) => products.find((p) => p.id === id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

/* =====================================================
   CATEGORIES (Tree)
   ===================================================== */
function treeHTML(node) {
  const kids = node.children.length
    ? `<ul>${node.children.map(treeHTML).join("")}</ul>` : "";
  const active = node.id === selectedCat ? "active" : "";
  return `<li><span class="${active}" data-cat="${node.id}">${node.name}</span>${kids}</li>`;
}

function renderCategories() {
  $("categoryTree").innerHTML = `<div class="tree"><ul>${treeHTML(root)}</ul></div>`;
}

/* =====================================================
   PRODUCTS
   ===================================================== */
function renderProducts() {
  const ids = collectIds(findNode(root, selectedCat));  // include sub-categories
  const q = searchText.toLowerCase();
  const list = products.filter(
    (p) => (selectedCat === "all" || ids.includes(p.cat)) && p.name.toLowerCase().includes(q)
  );
  $("productTitle").textContent = findNode(root, selectedCat).name;
  $("productGrid").innerHTML = list.length
    ? list.map((p) => `
      <div class="card">
        <div class="emoji">${p.emoji}</div>
        <h3>${p.name}</h3>
        <div class="price">${money(p.price)}</div>
        <div class="row">
          <button class="btn small" data-view="${p.id}">View</button>
          <button class="btn small primary" data-add="${p.id}">Add</button>
        </div>
      </div>`).join("")
    : `<p class="empty">No products found.</p>`;
}

/* =====================================================
   RECENTLY VIEWED (Stack)
   ===================================================== */
function renderRecent() {
  const items = recentlyViewed.toArray();
  $("recentList").innerHTML = items.length
    ? items.map((p) => `<div class="item" data-view="${p.id}">${p.emoji} ${p.name}</div>`).join("")
    : `<p class="empty">Nothing viewed yet.</p>`;
}

function viewProduct(id) {
  const p = getProduct(id);
  recentlyViewed.push(p);
  dialogProduct = p;
  $("dialogBody").innerHTML = `
    <div style="font-size:56px;text-align:center">${p.emoji}</div>
    <h3 style="margin-top:8px">${p.name}</h3>
    <p style="margin:6px 0;color:#555">${p.desc}</p>
    <strong>${money(p.price)}</strong>`;
  $("productDialog").showModal();
  renderRecent();
}

/* =====================================================
   CART (Array)
   ===================================================== */
function addToCart(id) {
  const item = cart.find((i) => i.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  renderCart();
  toast("Added to cart");
}

function changeQty(id, delta) {
  const idx = cart.findIndex((i) => i.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);   // remove from array
  renderCart();
}

function cartTotal() {
  return cart.reduce((sum, i) => sum + getProduct(i.id).price * i.qty, 0);
}

function renderCart() {
  $("cartCount").textContent = cart.reduce((s, i) => s + i.qty, 0);
  $("cartList").innerHTML = cart.length
    ? cart.map((i) => {
        const p = getProduct(i.id);
        return `<div class="cart-item">
          <span>${p.emoji} ${p.name}</span>
          <span class="qty">
            <button data-dec="${p.id}">−</button>${i.qty}<button data-inc="${p.id}">+</button>
          </span>
          <span>${money(p.price * i.qty)}</span>
        </div>`;
      }).join("")
    : `<p class="empty">Your cart is empty.</p>`;
  $("cartTotal").textContent = money(cartTotal());
}

/* =====================================================
   ORDERS (Queue + Linked List) & RETURNS
   ===================================================== */
function placeOrder() {
  if (!cart.length) return toast("Cart is empty");
  const order = {
    id: ++orderCounter,
    items: cart.map((i) => ({ ...i })),
    total: cartTotal(),
    processed: false,
    tracker: new TrackingList(["Order Placed", "Packed", "Shipped", "Out for Delivery", "Delivered"]),
  };
  orders.unshift(order);
  orderQueue.enqueue(order);          // goes to back of the queue
  cart = [];
  renderCart();
  renderOrders();
  toast(`Order #${order.id} placed`);
}

function processNextOrder() {
  const order = orderQueue.dequeue(); // front of the queue (FIFO)
  if (!order) return toast("Queue is empty");
  order.processed = true;
  order.tracker.advance();            // Order Placed -> Packed
  renderOrders();
  toast(`Order #${order.id} is being processed`);
}

function advanceOrder(id) {
  const order = orders.find((o) => o.id === id);
  if (order && order.processed) order.tracker.advance();
  renderOrders();
}

function requestReturn(id) {
  const order = orders.find((o) => o.id === id);
  if (!order || order.tracker.current.label !== "Delivered") return;
  RETURN_STAGES.forEach((s) => order.tracker.append(s, true)); // extend the list
  order.tracker.advance();                                      // -> Return Requested
  renderOrders();
  toast(`Return requested for #${id}`);
}

function renderOrders() {
  $("queueSize").textContent = orderQueue.size;
  $("processBtn").disabled = orderQueue.isEmpty();

  $("orderList").innerHTML = orders.length
    ? orders.map((o) => {
        const cur = o.tracker.current;
        const steps = o.tracker.toArray().map((n) => {
          let cls = "step";
          if (n.isReturn) cls += " ret";
          if (n === cur) cls += " current";
          else if (n.done) cls += " done";
          return `<span class="${cls}">${n.label}</span>`;
        }).join("");

        const status = !o.processed
          ? `<span class="badge queued">Queued</span>`
          : `<span class="badge ${cur.isReturn ? "ret" : ""}">${cur.label}</span>`;

        let actions = "";
        if (o.processed && o.tracker.hasNext())
          actions += `<button class="btn small" data-advance="${o.id}">Next stage</button>`;
        const hasReturn = o.tracker.toArray().some((n) => n.isReturn);
        if (cur.label === "Delivered" && !hasReturn)
          actions += `<button class="btn small" data-return="${o.id}">Return</button>`;

        const names = o.items.map((i) => `${getProduct(i.id).name} ×${i.qty}`).join(", ");
        return `<div class="order">
          <div class="order-head"><strong>#${o.id}</strong>${status}</div>
          <div>${names}</div>
          <div><strong>${money(o.total)}</strong></div>
          <div class="track">${steps}</div>
          <div class="actions">${actions}</div>
        </div>`;
      }).join("")
    : `<p class="empty">No orders yet.</p>`;
}

/* =====================================================
   EVENTS
   ===================================================== */
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.cat) { selectedCat = t.dataset.cat; renderCategories(); renderProducts(); }
  else if (t.dataset.view) viewProduct(+t.dataset.view);
  else if (t.dataset.add) addToCart(+t.dataset.add);
  else if (t.dataset.inc) changeQty(+t.dataset.inc, 1);
  else if (t.dataset.dec) changeQty(+t.dataset.dec, -1);
  else if (t.dataset.advance) advanceOrder(+t.dataset.advance);
  else if (t.dataset.return) requestReturn(+t.dataset.return);
});

$("search").addEventListener("input", (e) => { searchText = e.target.value; renderProducts(); });
$("placeOrderBtn").addEventListener("click", placeOrder);
$("processBtn").addEventListener("click", processNextOrder);
$("cartBtn").addEventListener("click", () => $("cartList").scrollIntoView({ behavior: "smooth" }));
$("dialogClose").addEventListener("click", () => $("productDialog").close());
$("dialogAdd").addEventListener("click", () => { addToCart(dialogProduct.id); $("productDialog").close(); });

// initial render
renderCategories();
renderProducts();
renderRecent();
renderCart();
renderOrders();