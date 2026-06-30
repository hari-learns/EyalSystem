const PRODUCTS = [
  {
    id:'coconut',
    name:'Cold Wood-Pressed Coconut Oil',
    note:'Light and faintly sweet — good for tempering, hair and skin.',
    img:'images/coconut.jpg',
    sizes:[
      {label:'500 ML', ml:500, price:200},
      {label:'1 L', ml:1000, price:400},
      {label:'5 L', ml:5000, price:1972},
    ]
  },
  {
    id:'sesame',
    name:'Cold Wood-Pressed Sesame Oil',
    note:'Nutty and warm — the everyday oil of Tamil kitchens.',
    img:'images/sesame.jpg',
    sizes:[
      {label:'500 ML', ml:500, price:210},
      {label:'1 L', ml:1000, price:420},
      {label:'5 L', ml:5000, price:2053},
    ]
  },
  {
    id:'groundnut',
    name:'Cold Wood-Pressed Groundnut Oil',
    note:'Mild, with a high smoke point — built for deep frying.',
    img:'images/groundnut.jpg',
    sizes:[
      {label:'500 ML', ml:500, price:130},
      {label:'1 L', ml:1000, price:250},
      {label:'5 L', ml:5000, price:1224},
    ]
  },
  {
    id:'mustard',
    name:'Mustard Oil',
    note:'Sharp and pungent — wakes up pickles and curries.',
    img:'images/mustard.jpg',
    sizes:[
      {label:'200 ML', ml:200, price:60},
    ]
  },
];

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmt2 = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:1});
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const selected = {}; // productId -> size index
const cart = []; // {id, name, label, price, ml, img, qty}

function renderProducts(){
  const grid = document.getElementById('productGrid');
  grid.innerHTML = PRODUCTS.map(p => {
    selected[p.id] = 0;
    const pillsHTML = p.sizes.map((s,i) => `
      <button class="pill" type="button" aria-pressed="${i===0}" data-product="${p.id}" data-size="${i}">${s.label}</button>
    `).join('');
    const s0 = p.sizes[0];
    return `
    <article class="card" data-product="${p.id}">
      <div class="card-media">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <div class="organic-seal"><svg class="icon"><use href="#i-leaf"/></svg>Organic</div>
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <p class="note">${p.note}</p>
        <div class="size-row">${pillsHTML}</div>
        <div class="price-row">
          <div class="price-main">
            <span class="amount" data-price="${p.id}">${fmt(s0.price)}</span>
            <span class="per" data-per="${p.id}">≈ ${fmt2(s0.price/(s0.ml/100))} / 100ml</span>
          </div>
        </div>
        <button class="add-btn" data-add="${p.id}" type="button">
          <svg class="icon"><use href="#i-bag"/></svg>
          Add to cart
        </button>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const pid = btn.dataset.product;
      const idx = Number(btn.dataset.size);
      selected[pid] = idx;
      const card = btn.closest('.card');
      card.querySelectorAll('.pill').forEach(p=>p.setAttribute('aria-pressed', p===btn ? 'true':'false'));
      const product = PRODUCTS.find(p=>p.id===pid);
      const size = product.sizes[idx];
      card.querySelector(`[data-price="${pid}"]`).textContent = fmt(size.price);
      card.querySelector(`[data-per="${pid}"]`).textContent = `≈ ${fmt2(size.price/(size.ml/100))} / 100ml`;
    });
  });

  grid.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const pid = btn.dataset.add;
      const product = PRODUCTS.find(p=>p.id===pid);
      const size = product.sizes[selected[pid]];
      addToCart(product, size);
      flyToCart(btn);
      btn.classList.add('added');
      const original = btn.innerHTML;
      btn.innerHTML = `<svg class="icon"><use href="#i-check"/></svg> Added`;
      setTimeout(()=>{ btn.classList.remove('added'); btn.innerHTML = original; }, 1100);
    });
  });
}

function addToCart(product, size){
  const existing = cart.find(c=>c.id===product.id && c.label===size.label);
  if(existing){ existing.qty += 1; }
  else { cart.push({id:product.id, name:product.name, label:size.label, price:size.price, img:product.img, qty:1}); }
  renderCart();
  showToast(`Added — ${product.name.replace('Cold Wood-Pressed ','')} (${size.label})`);
}

function changeQty(id, label, delta){
  const item = cart.find(c=>c.id===id && c.label===label);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){ removeItem(id,label); return; }
  renderCart();
}

function removeItem(id, label){
  const idx = cart.findIndex(c=>c.id===id && c.label===label);
  if(idx > -1) cart.splice(idx,1);
  renderCart();
}

function renderCart(){
  const wrap = document.getElementById('drawerItems');
  const badge = document.getElementById('cartBadge');
  const totalQty = cart.reduce((s,c)=>s+c.qty,0);

  if(totalQty === 0){
    badge.classList.add('hidden');
  } else {
    badge.classList.remove('hidden');
    badge.textContent = totalQty;
  }

  if(cart.length === 0){
    wrap.innerHTML = `<div class="empty-cart">
      <svg class="icon"><use href="#i-bag"/></svg>
      <div>Your cart is empty.<br>Add an oil to get started.</div>
    </div>`;
  } else {
    wrap.innerHTML = cart.map(c => `
      <div class="cart-item">
        <img src="${c.img}" alt="${c.name}">
        <div class="ci-info">
          <span class="ci-name">${c.name}</span>
          <span class="ci-size">${c.label}</span>
          <div class="ci-controls">
            <div class="qty">
              <button data-act="dec" data-id="${c.id}" data-label="${c.label}" aria-label="Decrease quantity"><svg class="icon"><use href="#i-minus"/></svg></button>
              <span>${c.qty}</span>
              <button data-act="inc" data-id="${c.id}" data-label="${c.label}" aria-label="Increase quantity"><svg class="icon"><use href="#i-plus"/></svg></button>
            </div>
            <span class="ci-price">${fmt(c.price * c.qty)}</span>
          </div>
        </div>
        <button class="ci-remove" data-act="remove" data-id="${c.id}" data-label="${c.label}" aria-label="Remove item"><svg class="icon"><use href="#i-close"/></svg></button>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-act]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id, label = btn.dataset.label, act = btn.dataset.act;
        if(act==='inc') changeQty(id,label,1);
        else if(act==='dec') changeQty(id,label,-1);
        else if(act==='remove') removeItem(id,label);
      });
    });
  }

  const subtotal = cart.reduce((s,c)=>s + c.price*c.qty, 0);
  document.getElementById('subtotalAmount').textContent = fmt(subtotal);
}

function bumpBadge(){
  const badge = document.getElementById('cartBadge');
  badge.classList.add('bump');
  setTimeout(()=>badge.classList.remove('bump'), 260);
}

function flyToCart(originEl){
  if(reduceMotion){ bumpBadge(); return; }
  const startRect = originEl.getBoundingClientRect();
  const endRect = document.getElementById('cartBtn').getBoundingClientRect();
  const drop = document.createElement('div');
  drop.className = 'flying-drop';
  const sx = startRect.left + startRect.width/2 - 7;
  const sy = startRect.top + startRect.height/2 - 7;
  drop.style.left = sx + 'px';
  drop.style.top = sy + 'px';
  document.body.appendChild(drop);
  requestAnimationFrame(()=>{
    const ex = endRect.left + endRect.width/2 - 7;
    const ey = endRect.top + endRect.height/2 - 7;
    drop.style.transform = `translate(${ex-sx}px, ${ey-sy}px) scale(0.35) rotate(45deg)`;
    drop.style.opacity = '0';
  });
  setTimeout(()=>{ drop.remove(); bumpBadge(); }, 640);
}

let toastTimer;
function showToast(msg){
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.remove('show'), 2400);
}

function openDrawer(){
  document.getElementById('drawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

document.getElementById('cartBtn').addEventListener('click', openDrawer);
document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
document.getElementById('overlay').addEventListener('click', closeDrawer);
document.getElementById('checkoutBtn').addEventListener('click', ()=>{
  if(cart.reduce((s,c)=>s+c.qty,0) === 0){
    showToast('Your cart is empty.');
    return;
  }
  showToast('Preview only — checkout isn\u2019t connected yet.');
});

// scroll reveal for product cards
const cardObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('in-view');
      cardObserver.unobserve(entry.target);
    }
  });
}, {threshold:0.18});

// scroll reveal + fill animation for process line
const stepsTrack = document.getElementById('stepsTrack');
const stepsObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      stepsTrack.style.setProperty('--fill','100%');
      stepsTrack.classList.add('lit');
      stepsObserver.unobserve(entry.target);
    }
  });
}, {threshold:0.35});

renderProducts();
renderCart();
document.querySelectorAll('.card').forEach(c=>cardObserver.observe(c));
stepsObserver.observe(stepsTrack);