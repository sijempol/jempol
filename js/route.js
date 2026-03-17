// File: js/route.js

let map;
let allRoutes = [];
let drawnRouteLayer = null;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchAndDisplayRoutes();
});

function initMap() {
    // Pusat peta default (misal: Magelang/Jakarta)
    map = L.map('routeMap', {
        zoomControl: false // Sembunyikan zoom control default agar tidak tertutup header
    }).setView([-6.200000, 106.816666], 13);
    
    // Pindahkan zoom control ke kanan atas
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; MAPPING'
    }).addTo(map);
}

async function fetchAndDisplayRoutes() {
    const listContainer = document.getElementById('route-list-container');
    
    // Ambil semua data rute dari Supabase
    const { data: routes, error } = await supabase
        .from('routes')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        listContainer.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat rute: ${error.message}</p>`;
        return;
    }

    if (routes.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-gray-400">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                </div>
                <p class="text-gray-500 font-medium">Belum ada rute angkutan yang terdaftar.</p>
            </div>`;
        return;
    }

    allRoutes = routes;
    listContainer.innerHTML = '<div class="space-y-3" id="routes-wrapper"></div>';
    const wrapper = document.getElementById('routes-wrapper');

    routes.forEach(route => {
        const item = document.createElement('div');
        item.className = 'group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-gojek-green transition-all cursor-pointer';
        
        const coordCount = route.coordinates && route.coordinates.coordinates ? route.coordinates.coordinates.length : 0;
        
        item.innerHTML = `
            <div class="flex items-start gap-4 flex-grow">
                <div class="w-10 h-10 rounded-full flex shrink-0 items-center justify-center border-2" style="border-color: ${route.color_code}; background-color: ${route.color_code}20;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="${route.color_code}" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
                </div>
                <div>
                    <h3 class="font-extrabold text-gray-800 text-[15px] group-hover:text-gojek-green transition-colors">${route.name}</h3>
                    <p class="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed max-w-[250px]">${route.description || 'Tidak ada deskripsi rute.'}</p>
                </div>
            </div>
            
            <button class="shrink-0 text-gojek-green font-bold text-xs bg-gojek-light px-4 py-2 rounded-xl group-hover:bg-gojek-green group-hover:text-white transition-colors" onclick="drawRouteOnMap('${route.id}')">
                Lihat<br>Rute
            </button>
        `;

        wrapper.appendChild(item);
    });

    // Jika ada rute pertama yang punya koordinat, render otomatis
    const firstValidRoute = routes.find(r => r.coordinates && r.coordinates.coordinates && r.coordinates.coordinates.length > 0);
    if(firstValidRoute) {
        drawRouteOnMap(firstValidRoute.id);
    }
}

function drawRouteOnMap(routeId) {
    // Cari objek rute berdasarkan ID
    const routeInfo = allRoutes.find(r => r.id === routeId);
    if(!routeInfo) return;

    if(!routeInfo.coordinates || !routeInfo.coordinates.coordinates || routeInfo.coordinates.coordinates.length === 0) {
        alert("Peringatan: Rute ini belum memiliki gambar jalur lintasan Polyline yang dibuat dari panel Admin.");
        return;
    }

    // Hapus rute yang sedang digambar sebelumnya
    if(drawnRouteLayer) {
        map.removeLayer(drawnRouteLayer);
    }

    // Gambar Multi/LineString GeoJSON ke peta
    drawnRouteLayer = L.geoJSON(routeInfo.coordinates, {
        style: function(feature) {
            return {
                color: routeInfo.color_code || '#00aa13',
                weight: 5,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            };
        }
    }).addTo(map);

    // Zoom animasi fitting viewport map ke bounding box route tersebut
    const bounds = drawnRouteLayer.getBounds();
    // Tambahkan extra padding bawah agar tidak tertutup menu list (bottom sheet)
    map.flyToBounds(bounds, { paddingBottomRight: [0, 300], paddingTopLeft: [20, 100], duration: 1 });
}
