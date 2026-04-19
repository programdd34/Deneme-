import { applicationCenters, solutionPoints } from './data/centers.js';

const allPoints = [...applicationCenters, ...solutionPoints];

let map;
let markers = [];
let activeFilter = 'all';
let activeSide = 'all';
let searchQuery = '';
let activePoint = null;

function createMarkerIcon(type) {
  const color = type === 'basvuru' ? '#1565C0' : '#00897B';
  const size = type === 'basvuru' ? 36 : 30;
  const innerSize = type === 'basvuru' ? 12 : 10;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 3px 12px rgba(0,0,0,0.3);
        border:2.5px solid rgba(255,255,255,0.9);
        cursor:pointer;
        transition:transform 0.2s;
      ">
        <div style="
          width:${innerSize}px;
          height:${innerSize}px;
          background:white;
          border-radius:50%;
          transform:rotate(45deg);
          opacity:0.9;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 4],
  });
}

function createPopupContent(point) {
  const typeLabel = point.type === 'basvuru' ? 'Başvuru Merkezi' : '153 Çözüm Noktası';
  const sideLabel = point.side === 'avrupa' ? 'Avrupa Yakası' : 'Anadolu Yakası';

  return `
    <div class="popup-content">
      <span class="popup-type ${point.type}">${typeLabel}</span>
      <div class="popup-name">${point.name}</div>
      <div class="popup-district">${point.district} &bull; ${sideLabel}</div>
      <div class="popup-hours">${point.hours}</div>
      <button class="popup-btn" onclick="window.openDetail(${point.id}, '${point.type}')">Detayları Gör</button>
    </div>
  `;
}

function initMap() {
  map = L.map('map', {
    center: [41.0082, 28.9784],
    zoom: 10,
    zoomControl: false,
  });

  L.control.zoom({ position: 'topright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  renderMarkers();
  renderList();
}

function renderMarkers() {
  markers.forEach(({ marker }) => map.removeLayer(marker));
  markers = [];

  const filtered = getFiltered();

  filtered.forEach(point => {
    const marker = L.marker([point.lat, point.lng], {
      icon: createMarkerIcon(point.type)
    });

    marker.bindPopup(createPopupContent(point), {
      maxWidth: 280,
      className: 'custom-popup'
    });

    marker.addTo(map);
    markers.push({ marker, point });
  });
}

function getFiltered() {
  return allPoints.filter(p => {
    const matchType = activeFilter === 'all' || p.type === activeFilter;
    const matchSide = activeSide === 'all' || p.side === activeSide;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q);
    return matchType && matchSide && matchSearch;
  });
}

function renderList() {
  const list = document.getElementById('resultsList');
  const countEl = document.getElementById('resultsCount');
  const filtered = getFiltered();

  countEl.textContent = `${filtered.length} nokta`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">&#x1F50D;</span>
        Sonuç bulunamadı
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(point => {
    const sideLabel = point.side === 'avrupa' ? 'Avrupa' : 'Anadolu';
    return `
      <div class="result-card" data-id="${point.id}" data-type="${point.type}">
        <div class="result-card-dot ${point.type}"></div>
        <div class="result-card-info">
          <div class="result-card-name">${point.name}</div>
          <div class="result-card-meta">
            <span class="result-card-district">${point.district}</span>
            <span class="result-card-side ${point.side}">${sideLabel}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const type = card.dataset.type;
      openDetail(id, type);

      const found = markers.find(m => m.point.id === id && m.point.type === type);
      if (found) {
        map.setView([found.point.lat, found.point.lng], 14, { animate: true });
        found.marker.openPopup();
      }
    });
  });
}

function openDetail(id, type) {
  const point = allPoints.find(p => p.id === id && p.type === type);
  if (!point) return;

  activePoint = point;

  const badge = document.getElementById('detailBadge');
  const nameEl = document.getElementById('detailName');
  const sideTag = document.getElementById('detailSideTag');
  const addressEl = document.getElementById('detailAddress');
  const hoursEl = document.getElementById('detailHours');
  const phoneEl = document.getElementById('detailPhone');
  const phoneRow = document.getElementById('detailPhoneRow');
  const noteEl = document.getElementById('detailNote');
  const noteRow = document.getElementById('detailNoteRow');
  const directionsBtn = document.getElementById('directionsBtn');

  badge.textContent = type === 'basvuru' ? 'Başvuru Merkezi' : '153 Çözüm Noktası';
  badge.className = `detail-badge ${type}`;

  nameEl.textContent = point.name;

  const sideLabel = point.side === 'avrupa' ? 'Avrupa Yakası' : 'Anadolu Yakası';
  sideTag.textContent = sideLabel;
  sideTag.className = `detail-side-tag ${point.side}`;

  addressEl.textContent = point.address;
  hoursEl.textContent = point.hours;

  if (point.phone) {
    phoneEl.textContent = point.phone;
    phoneRow.style.display = 'flex';
  } else {
    phoneRow.style.display = 'none';
  }

  if (point.note) {
    noteEl.textContent = point.note;
    noteRow.classList.add('visible');
  } else {
    noteRow.classList.remove('visible');
  }

  directionsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;

  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
}

window.openDetail = openDetail;

function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
  activePoint = null;
}

document.getElementById('detailClose').addEventListener('click', closeDetail);
document.getElementById('overlay').addEventListener('click', closeDetail);

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderMarkers();
    renderList();
  });
});

document.querySelectorAll('.side-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeSide = btn.dataset.side;
    renderMarkers();
    renderList();
  });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderMarkers();
  renderList();
});

document.addEventListener('DOMContentLoaded', initMap);
