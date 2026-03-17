// File: js/admin.js

let isAdminLoggedIn = false;

// Maps and Layers
let routeMap;
let routeDrawControl;
let routeDrawnItems;

// Pagination and Filter State
let driverCurrentPage = 1;
const driverPageSize = 5;
let driverSearchQuery = '';
let driverFilterRoute = '';

// Route Pagination and Filter State
let routeCurrentPage = 1;
const routePageSize = 5;
let routeSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();

    document.getElementById('admin-auth-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('admin-logout').addEventListener('click', handleAdminLogout);
    
    // Modal Listeners
    document.getElementById('btn-add-driver').addEventListener('click', openModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('form-driver-data').addEventListener('submit', handleSaveDriver);

    // Route Listeners
    document.getElementById('btn-add-route').addEventListener('click', openRouteModal);
    document.getElementById('form-manage-route').addEventListener('submit', handleSaveRoute);

    // Driver Table Controls
    document.getElementById('search-driver').addEventListener('input', (e) => {
        driverSearchQuery = e.target.value;
        driverCurrentPage = 1;
        loadDrivers();
    });
    document.getElementById('filter-route').addEventListener('change', (e) => {
        driverFilterRoute = e.target.value;
        driverCurrentPage = 1;
        loadDrivers();
    });
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (driverCurrentPage > 1) {
            driverCurrentPage--;
            loadDrivers();
        }
    });
    document.getElementById('btn-next-page').addEventListener('click', () => {
        driverCurrentPage++;
        loadDrivers();
    });

    // Route Table Controls
    document.getElementById('search-route').addEventListener('input', (e) => {
        routeSearchQuery = e.target.value;
        routeCurrentPage = 1;
        loadRoutes();
    });
    document.getElementById('btn-prev-route').addEventListener('click', () => {
        if (routeCurrentPage > 1) {
            routeCurrentPage--;
            loadRoutes();
        }
    });
    document.getElementById('btn-next-route').addEventListener('click', () => {
        routeCurrentPage++;
        loadRoutes();
    });
});

async function checkAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        isAdminLoggedIn = true;
        showDashboard();
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errEl = document.getElementById('admin-error');
    errEl.classList.add('hidden');

    const btn = e.target.querySelector('button');
    btn.innerText = 'Loading...';
    btn.disabled = true;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    btn.innerText = 'Masuk Ke Sistem';
    btn.disabled = false;

    if (error) {
        errEl.innerText = error.message;
        errEl.classList.remove('hidden');
    } else {
        isAdminLoggedIn = true;
        showDashboard();
    }
}

async function handleAdminLogout() {
    await supabase.auth.signOut();
    isAdminLoggedIn = false;
    document.getElementById('admin-dashboard-section').classList.add('hidden');
    document.getElementById('admin-login-section').classList.remove('hidden');
    document.getElementById('admin-login-section').classList.add('flex');
}

// ==== UI TAB NAVIGATION ====
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(bc => bc.classList.remove('active'));
    // Show selected tab
    document.getElementById(tabId).classList.add('active');

    // Update Sidebar styling
    document.querySelectorAll('#sidebar-nav button').forEach(btn => {
        btn.classList.remove('bg-purple-50', 'bg-gojek-light', 'text-gojek-green', 'text-purple-600');
        
        let targetId = btn.getAttribute('data-tab');
        if (targetId === tabId) {
            if (targetId === 'tab-drivers') btn.classList.add('bg-gojek-light', 'text-gojek-green');
            if (targetId === 'tab-routes') btn.classList.add('bg-purple-50', 'text-purple-600');
        }
    });

    if (tabId === 'tab-drivers') loadDrivers();
    if (tabId === 'tab-routes') {
        loadRoutes();
    }
}

function showDashboard() {
    document.getElementById('admin-login-section').classList.add('hidden');
    document.getElementById('admin-login-section').classList.remove('flex');
    
    const dash = document.getElementById('admin-dashboard-section');
    dash.classList.remove('hidden');
    dash.classList.add('flex');

    switchTab('tab-drivers'); // Default tab
}

// ==== CRUD DRIVERS ====

async function loadDrivers() {
    const tbody = document.getElementById('driver-table-body');
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    const pagInfo = document.getElementById('pagination-info');

    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 font-medium">Memuat data sopir...</td></tr>`;

    // Calculate range for pagination
    const from = (driverCurrentPage - 1) * driverPageSize;
    const to = from + driverPageSize - 1;

    // Start building query
    let query = supabase
        .from('drivers')
        .select('*', { count: 'exact' });

    // Apply Filters
    if (driverSearchQuery) {
        // Simple search on multiple columns using or()
        query = query.or(`full_name.ilike.%${driverSearchQuery}%,username.ilike.%${driverSearchQuery}%,vehicle_plate.ilike.%${driverSearchQuery}%`);
    }
    if (driverFilterRoute) {
        query = query.eq('route', driverFilterRoute);
    }

    // Apply Pagination & Sort
    const { data: drivers, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-medium">Gagal memuat data: ${error.message}</td></tr>`;
        return;
    }

    // Update Pagination UI
    const totalPages = Math.ceil(count / driverPageSize);
    pagInfo.innerText = `Menampilkan ${count === 0 ? 0 : from + 1}-${Math.min(to + 1, count)} dari ${count} data`;
    prevBtn.disabled = driverCurrentPage <= 1;
    nextBtn.disabled = driverCurrentPage >= totalPages || count === 0;

    if (drivers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 font-medium pb-20 pt-20">Tidak ada data sopir ditemukan.<br><span class="text-xs text-gray-400 mt-2 block">Coba sesuaikan pencarian atau filter Anda.</span></td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    
    drivers.forEach(d => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition border-b border-gray-50';
        tr.innerHTML = `
            <td class="p-4">
                <div class="font-bold text-gojek-black text-[15px]">${d.full_name}</div>
                <div class="text-xs text-gray-400 mt-1">ID: ${d.id.substring(0,8)}...</div>
            </td>
            <td class="p-4">
                <div class="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs uppercase tracking-wide border border-gray-200">${d.vehicle_plate}</div>
                <div class="text-xs text-gray-500 mt-1 font-medium italic">Nomor: ${d.vehicle_number || '-'} • Rute: ${d.route}</div>
            </td>
            <td class="p-4 font-medium text-sm text-gray-600">${d.phone_number || '-'}</td>
            <td class="p-4">
                <div class="text-sm font-bold bg-gojek-light text-gojek-dark inline-block px-2 py-0.5 rounded">${d.username}</div>
                <div class="text-xs text-red-400 mt-1 cursor-pointer font-mono" title="Klik untuk lihat password" onclick="alert('Password: ${d.password}')">Lihat Pass</div>
            </td>
            <td class="p-4 text-right flex justify-end gap-2">
                <button onclick='editDriver(${JSON.stringify(d).replace(/'/g, "&#39;")})' class="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition" title="Edit Akun">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                </button>
                <button onclick="deleteDriver('${d.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus Akun">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Also populate Route Filter options if not done yet
    populateRouteFilter();
}

let isRouteFilterPopulated = false;
async function populateRouteFilter() {
    if (isRouteFilterPopulated) return;
    const filterSelect = document.getElementById('filter-route');
    
    // Get unique routes from the routes table
    const { data: routes, error } = await supabase.from('routes').select('name').order('name');
    
    if (error || !routes) return;

    routes.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.name;
        opt.innerText = r.name;
        filterSelect.appendChild(opt);
    });
    
    isRouteFilterPopulated = true;
}

function openModal() {
    document.getElementById('form-driver-data').reset();
    document.getElementById('form-driver-id').value = '';
    document.getElementById('modal-title').innerText = 'Tambah Akun Sopir';
    document.querySelector('#form-driver-data button[type="submit"]').innerText = 'Simpan Data Sopir';
    
    document.getElementById('driver-modal').classList.remove('hidden');
    document.getElementById('driver-modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('driver-modal').classList.add('hidden');
    document.getElementById('driver-modal').classList.remove('flex');
}

function editDriver(driverObj) {
    document.getElementById('form-driver-id').value = driverObj.id;
    document.getElementById('form-username').value = driverObj.username;
    document.getElementById('form-password').value = driverObj.password;
    document.getElementById('form-fullname').value = driverObj.full_name;
    document.getElementById('form-phone').value = driverObj.phone_number;
    document.getElementById('form-plate').value = driverObj.vehicle_plate;
    document.getElementById('form-vehiclenum').value = driverObj.vehicle_number;
    document.getElementById('form-route').value = driverObj.route;

    document.getElementById('modal-title').innerText = 'Edit Akun Sopir';
    document.querySelector('#form-driver-data button[type="submit"]').innerText = 'Update Data Sopir';
    
    document.getElementById('driver-modal').classList.remove('hidden');
    document.getElementById('driver-modal').classList.add('flex');
}

async function handleSaveDriver(e) {
    e.preventDefault();
    
    const driverId = document.getElementById('form-driver-id').value;
    
    // Get form values
    const driverData = {
        username: document.getElementById('form-username').value,
        password: document.getElementById('form-password').value,
        full_name: document.getElementById('form-fullname').value,
        phone_number: document.getElementById('form-phone').value,
        vehicle_plate: document.getElementById('form-plate').value,
        vehicle_number: document.getElementById('form-vehiclenum').value,
        route: document.getElementById('form-route').value
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    let errorResult;
    
    if (driverId) {
        // Update
        const { error } = await supabase.from('drivers').update(driverData).eq('id', driverId);
        errorResult = error;
    } else {
        // Insert
        const { error } = await supabase.from('drivers').insert([driverData]);
        errorResult = error;
    }

    btn.innerText = originalText;
    btn.disabled = false;

    if (errorResult) {
        alert("Gagal menyimpan data sopir: " + errorResult.message);
    } else {
        closeModal();
        loadDrivers(); // refresh table
    }
}

async function deleteDriver(id) {
    if(confirm('Yakin ingin menghapus akun sopir ini?')) {
        const { error } = await supabase
            .from('drivers')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert("Gagal menghapus: " + error.message);
        } else {
            loadDrivers();
        }
    }
}

// ==========================================
// ==== CRUD & MAP LOGIC FOR ROUTES ====
// ==========================================

function initRouteMap() {
    routeMap = L.map('routeMap').setView([-6.200000, 106.816666], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(routeMap);

    routeDrawnItems = new L.FeatureGroup();
    routeMap.addLayer(routeDrawnItems);

    routeDrawControl = new L.Control.Draw({
        edit: { featureGroup: routeDrawnItems, remove: true },
        draw: { polygon: false, circle: false, rectangle: false, marker: false, circlemarker: false, polyline: { shapeOptions: { color: '#00aa13', weight: 4 } } }
    });
    routeMap.addControl(routeDrawControl);

    routeMap.on(L.Draw.Event.CREATED, function (e) {
        var layer = e.layer;
        routeDrawnItems.clearLayers();
        routeDrawnItems.addLayer(layer);
        var geojson = layer.toGeoJSON();
        document.getElementById('route-geojson').value = JSON.stringify(geojson.geometry);
    });

    routeMap.on(L.Draw.Event.EDITED, function (e) {
        routeDrawnItems.eachLayer(function (layer) { document.getElementById('route-geojson').value = JSON.stringify(layer.toGeoJSON().geometry); });
    });

    routeMap.on(L.Draw.Event.DELETED, function (e) { document.getElementById('route-geojson').value = ''; });
}

function openRouteModal() {
    resetRouteForm();
    document.getElementById('route-modal-title').innerText = 'Tambah Rute Baru';
    document.querySelector('#form-manage-route button[type="submit"]').innerText = 'Simpan Rute';
    
    document.getElementById('route-modal').classList.remove('hidden');
    document.getElementById('route-modal').classList.add('flex');
    
    // Initialize or refresh map sizing
    if (!routeMap) {
        initRouteMap();
    } else {
        setTimeout(() => routeMap.invalidateSize(), 100);
    }
}

function closeRouteModal() {
    document.getElementById('route-modal').classList.add('hidden');
    document.getElementById('route-modal').classList.remove('flex');
}

function resetRouteForm() {
    document.getElementById('form-manage-route').reset();
    document.getElementById('route-id').value = '';
    document.getElementById('route-geojson').value = '';
    document.querySelector('#form-manage-route button[type="submit"]').innerText = 'Simpan Rute';
    if(routeDrawnItems) routeDrawnItems.clearLayers();
}

async function loadRoutes() {
    const tbody = document.getElementById('routes-table-body');
    const prevBtn = document.getElementById('btn-prev-route');
    const nextBtn = document.getElementById('btn-next-route');
    const pagInfo = document.getElementById('route-pagination-info');

    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">Memuat rute...</td></tr>';

    // Calculate range for pagination
    const from = (routeCurrentPage - 1) * routePageSize;
    const to = from + routePageSize - 1;

    // Start building query
    let query = supabase
        .from('routes')
        .select('*', { count: 'exact' });

    // Apply Filters (Search by name or description)
    if (routeSearchQuery) {
        query = query.or(`name.ilike.%${routeSearchQuery}%,description.ilike.%${routeSearchQuery}%`);
    }

    // Apply Pagination & Sort
    const { data: routes, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) { 
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">' + error.message + '</td></tr>'; 
        return; 
    }

    // Update Pagination UI
    const totalPages = Math.ceil(count / routePageSize);
    pagInfo.innerText = `Menampilkan ${count === 0 ? 0 : from + 1}-${Math.min(to + 1, count)} dari ${count} data`;
    prevBtn.disabled = routeCurrentPage <= 1;
    nextBtn.disabled = routeCurrentPage >= totalPages || count === 0;

    if (routes.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500 font-medium">Tidak ada rute ditemukan.<br><span class="text-xs text-gray-400 mt-1 block">Coba sesuaikan kata kunci pencarian Anda.</span></td></tr>'; 
        return; 
    }

    tbody.innerHTML = '';
    routes.forEach(r => {
        let coordCount = r.coordinates && r.coordinates.coordinates ? r.coordinates.coordinates.length : 0;
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-50 hover:bg-gray-50/50';
        tr.innerHTML = `
            <td class="p-4 font-bold text-gray-800 text-[15px]">${r.name}</td>
            <td class="p-4 text-sm text-gray-600">${r.description || '-'}</td>
            <td class="p-4 text-xs font-medium text-gray-500"><div class="flex items-center gap-2"><span class="w-4 h-4 rounded-full border border-gray-200" style="background-color: ${r.color_code}"></span>${coordCount} Titik Jalur</div></td>
            <td class="p-4 text-right flex justify-end gap-2">
                <button onclick='editRoute(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="text-purple-600 bg-purple-50 p-2 rounded-lg hover:bg-purple-100 transition" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                </button>
                <button onclick="deleteRoute('${r.id}')" class="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </td>`;
        tbody.appendChild(tr);
    });
}

async function handleSaveRoute(e) {
    e.preventDefault();
    const id = document.getElementById('route-id').value;
    const name = document.getElementById('route-name').value;
    const desc = document.getElementById('route-description').value;
    const color = document.getElementById('route-color').value;
    const geojsonStr = document.getElementById('route-geojson').value;

    if (!geojsonStr) { alert("Silakan gambar rute jalurnya terlebih dahulu di Peta!"); return; }
    const routeData = { name: name, description: desc, color_code: color, coordinates: JSON.parse(geojsonStr) };
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Menyimpan...'; btn.disabled = true;

    let errorResult;
    if (id) { const { error } = await supabase.from('routes').update(routeData).eq('id', id); errorResult = error; }
    else { const { error } = await supabase.from('routes').insert([routeData]); errorResult = error; }

    btn.innerText = originalText; btn.disabled = false;
    if (errorResult) { alert("Gagal menyimpan rute: " + errorResult.message); }
    else { closeRouteModal(); loadRoutes(); }
}

function editRoute(routeObj) {
    openRouteModal();
    
    document.getElementById('route-id').value = routeObj.id;
    document.getElementById('route-name').value = routeObj.name;
    document.getElementById('route-description').value = routeObj.description;
    document.getElementById('route-color').value = routeObj.color_code;
    
    document.getElementById('route-modal-title').innerText = 'Edit Rute';
    document.querySelector('#form-manage-route button[type="submit"]').innerText = 'Update Rute';
    
    routeDrawnItems.clearLayers();

    if (routeObj.coordinates) {
        document.getElementById('route-geojson').value = JSON.stringify(routeObj.coordinates);
        let geoJsonLayer = L.geoJSON(routeObj.coordinates, { style: function() { return { color: routeObj.color_code, weight: 4 }; } });
        geoJsonLayer.eachLayer(function(layer) { routeDrawnItems.addLayer(layer); });
        
        // Wait slightly for modal transition before fitting bounds
        setTimeout(() => {
            if (routeDrawnItems.getLayers().length > 0) {
                routeMap.fitBounds(routeDrawnItems.getBounds(), { padding: [50, 50] });
            }
        }, 200);
    }
}

async function deleteRoute(id) {
    if(confirm('Yakin menghapus rute ini beserta seluruh halte yang terikat dengannya?')) {
        const { error } = await supabase.from('routes').delete().eq('id', id);
        if (error) alert("Gagal menghapus: " + error.message); else loadRoutes();
    }
}

